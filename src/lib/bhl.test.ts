import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BHL_API,
  BHL_KEY_REQUIRED,
  BHL_MISSED,
  BHL_NONE,
  BHL_SKIPPED,
  bhlNameMetadataUrl,
  interpretBhlName,
  lookupPublishedPlate,
  requestPublishedPlate,
  storeBhlPlate,
} from "./bhl"

const oakPlate = {
  Status: "ok",
  ErrorMessage: "",
  Result: [
    {
      NameConfirmed: "Quercus alba L.",
      Titles: [
        {
          FullTitle: "A different oak, not this name.",
          Authors: [{ Name: "Someone Else," }],
          PublicationDate: "1901.",
          Items: [
            {
              Year: "1901",
              Pages: [
                {
                  PageUrl: "https://www.biodiversitylibrary.org/page/1",
                  FullSizeImageUrl: "https://www.biodiversitylibrary.org/pageimage/1",
                  PageTypes: [{ PageTypeName: "Illustration" }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      NameConfirmed: "Quercus robur",
      Titles: [
        {
          FullTitle: "English Botany.  ",
          ShortTitle: "English Botany",
          Authors: [{ Name: "Sowerby, James," }],
          PublicationDate: "1863.",
          Items: [
            {
              Year: "1863",
              Pages: [
                {
                  Year: "1864",
                  PageUrl: "https://www.biodiversitylibrary.org/page/10",
                  FullSizeImageUrl: "https://www.biodiversitylibrary.org/pageimage/10",
                  PageTypes: [{ PageTypeName: "Text" }],
                },
                {
                  PageUrl: "https://www.biodiversitylibrary.org/page/11",
                  ThumbnailUrl: "https://www.biodiversitylibrary.org/pagethumb/11",
                  PageTypes: [{ PageTypeName: "Illustration" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

describe("BHL published plate", () => {
  it("prefers an illustration of the sheet name and keeps that name", () => {
    const outcome = interpretBhlName("Quercus robur", oakPlate)
    assert.equal(outcome.state, "shown")
    if (outcome.state !== "shown") return
    assert.equal(outcome.plate.queriedName, "Quercus robur")
    assert.equal(outcome.plate.imageUrl, "https://www.biodiversitylibrary.org/pagethumb/11")
    assert.equal(outcome.plate.pageUrl, "https://www.biodiversitylibrary.org/page/11")
    assert.equal(outcome.plate.title, "English Botany.")
    assert.equal(outcome.plate.creator, "Sowerby, James")
    assert.equal(outcome.plate.year, "1863")
    assert.equal(outcome.plate.title.includes("different oak"), false)
  })

  it("says no plate was found when BHL marks no illustration", () => {
    const outcome = interpretBhlName("Quercus robur", {
      Status: "ok",
      Result: [
        {
          NameConfirmed: "Quercus robur",
          Titles: [
            {
              FullTitle: "A flora",
              Items: [
                {
                  Pages: [
                    {
                      PageUrl: "https://www.biodiversitylibrary.org/page/2",
                      FullSizeImageUrl: "https://www.biodiversitylibrary.org/pageimage/2",
                      PageTypes: [{ PageTypeName: "Text" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    assert.equal(outcome.state, "none")
    if (outcome.state !== "none") return
    assert.equal(outcome.detail, BHL_NONE)
  })

  it("omits creator and year when the work does not give them", () => {
    const outcome = interpretBhlName("Quercus robur", {
      Status: "ok",
      Result: [
        {
          NameConfirmed: "Quercus robur",
          Titles: [
            {
              ShortTitle: "Oak plates",
              Items: [
                {
                  Pages: [
                    {
                      PageUrl: "https://www.biodiversitylibrary.org/page/3",
                      FullSizeImageUrl: "https://www.biodiversitylibrary.org/pageimage/3",
                      PageTypes: [{ PageTypeName: "Illustration" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })
    assert.equal(outcome.state, "shown")
    if (outcome.state !== "shown") return
    assert.equal(outcome.plate.creator, null)
    assert.equal(outcome.plate.year, null)
    assert.equal(outcome.plate.title, "Oak plates")
  })

  it("does not call BHL when a key is required or the phone is offline", async () => {
    assert.equal(BHL_KEY_REQUIRED, true)
    let calls = 0
    const fetchImpl: typeof fetch = async () => {
      calls += 1
      throw new Error("The lookup called BHL.")
    }
    const skipped = await lookupPublishedPlate("Quercus robur", fetchImpl, true)
    assert.equal(skipped.state, "skipped")
    if (skipped.state === "skipped") assert.equal(skipped.detail, BHL_SKIPPED)
    const missed = await lookupPublishedPlate("Quercus robur", fetchImpl, false)
    assert.equal(missed.state, "missed")
    if (missed.state === "missed") assert.equal(missed.detail, BHL_MISSED)
    assert.equal(calls, 0)
    assert.equal(bhlNameMetadataUrl("Quercus robur").startsWith(`${BHL_API}?`), true)
    assert.match(bhlNameMetadataUrl("Quercus robur"), /op=GetNameMetadata/)
    assert.equal(bhlNameMetadataUrl("Quercus robur").includes("apikey"), false)
  })

  it("treats a missing key as a skipped check and a failed call as a miss", async () => {
    const denied = await requestPublishedPlate("Quercus robur", async () => {
      return new Response(JSON.stringify({ Status: "unauthorized", ErrorMessage: "invalid API key" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    })
    assert.equal(denied.state, "skipped")
    const failed = await requestPublishedPlate("Quercus robur", async () => new Response("no", { status: 503 }))
    assert.equal(failed.state, "missed")
    if (failed.state === "missed") assert.equal(failed.detail, BHL_MISSED)
  })

  it("stores a BHL image address and drops any other address", () => {
    const kept = storeBhlPlate({
      queriedName: "Quercus robur",
      imageUrl: "https://www.biodiversitylibrary.org/pageimage/11",
      pageUrl: "https://www.biodiversitylibrary.org/page/11",
      title: "English Botany.",
      creator: "Sowerby, James",
      year: "1863",
    })
    assert.equal(kept?.imageUrl, "https://www.biodiversitylibrary.org/pageimage/11")
    assert.equal(
      storeBhlPlate({
        queriedName: "Quercus robur",
        imageUrl: "https://example.test/plant.png",
        pageUrl: "https://www.biodiversitylibrary.org/page/11",
        title: "English Botany.",
        creator: null,
        year: null,
      }),
      null,
    )
  })
})
