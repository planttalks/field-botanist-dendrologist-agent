import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  ILLUSTRATION_MISSED,
  TREFLE_PLANTS,
  commonsCategoryUrl,
  commonsCategoryTitle,
  imageFileReturned,
  lookupNameImage,
  plainText,
  readCommonsCandidates,
  readTrefleCandidate,
  storeNameImage,
  trefleSearchUrl,
} from "./name-image"

const OAK = "Quercus robur"
const PLATE_URL = "https://upload.wikimedia.org/wikipedia/commons/4/40/368_Quercus_robur.jpg"
const PLATE_PAGE = "https://commons.wikimedia.org/wiki/File:368_Quercus_robur.jpg"
const ARTIST_HTML =
  '<bdi><a href="https://en.wikipedia.org/wiki/en:Carl_Axel_Magnus_Lindman" title="w:en:Carl Axel Magnus Lindman"><span title="Swedish botanist (1856-1928)">Carl Axel Magnus Lindman</span></a></bdi>'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function imageHead(status: number, type = "image/jpeg"): Response {
  return new Response(null, {
    status,
    headers: { "content-type": type },
  })
}

const oakCategory = {
  query: {
    pages: {
      "1": {
        title: "File:Infotafel Einheimische Eichenarten.jpg",
        imageinfo: [
          {
            mime: "image/jpeg",
            size: 435046,
            url: "https://upload.wikimedia.org/wikipedia/commons/5/50/Infotafel_Einheimische_Eichenarten.jpg",
            descriptionurl: "https://commons.wikimedia.org/wiki/File:Infotafel_Einheimische_Eichenarten.jpg",
            extmetadata: { Artist: { value: "Schubbay" }, ObjectName: { value: "Infotafel Einheimische Eichenarten" } },
          },
        ],
      },
      "2": {
        title: "File:368 Quercus robur.jpg",
        imageinfo: [
          {
            mime: "image/jpeg",
            size: 60579,
            url: `${PLATE_URL}?utm_source=commons.wikimedia.org`,
            descriptionurl: PLATE_PAGE,
            extmetadata: {
              Artist: { value: ARTIST_HTML },
              ObjectName: { value: "368 Quercus robur" },
            },
          },
        ],
      },
      "3": {
        title: "File:Quercus robur & Fagus sylvatica.jpg",
        imageinfo: [
          {
            mime: "image/jpeg",
            size: 80000,
            url: "https://upload.wikimedia.org/wikipedia/commons/1/11/Quercus_robur_%26_Fagus_sylvatica.jpg",
            descriptionurl: "https://commons.wikimedia.org/wiki/File:Quercus_robur_%26_Fagus_sylvatica.jpg",
            extmetadata: { ObjectName: { value: "Quercus robur and beech" } },
          },
        ],
      },
    },
  },
}

describe("published illustration of the sheet name", () => {
  it("builds a Trefle search with no token", () => {
    const url = trefleSearchUrl(OAK)
    assert.equal(url.startsWith(`${TREFLE_PLANTS}?`), true)
    assert.match(url, /q=Quercus(\+|%20)robur/)
    assert.equal(url.includes("token"), false)
  })

  it("does not treat a Trefle token error or a different species as an image", () => {
    assert.equal(
      readTrefleCandidate(OAK, 401, {
        error: true,
        code: "unauthorized",
        message: "An access token is required to access this resource.",
      }),
      null,
    )
    assert.equal(
      readTrefleCandidate(OAK, 200, {
        data: [{ id: 9, scientific_name: "Quercus alba", image_url: "https://bs.plantnet.org/image/o/alba.jpg", slug: "quercus-alba" }],
      }),
      null,
    )
  })

  it("keeps the Commons plate whose file title contains the sheet name", () => {
    assert.equal(plainText(ARTIST_HTML), "Carl Axel Magnus Lindman")
    const images = readCommonsCandidates(OAK, oakCategory)
    assert.equal(images[0]?.queriedName, OAK)
    assert.equal(images[0]?.source, "commons")
    assert.equal(images[0]?.sourceLabel, "Wikimedia Commons")
    assert.equal(images[0]?.title, "368 Quercus robur.jpg")
    assert.equal(images[0]?.credit, "Carl Axel Magnus Lindman")
    assert.equal(images[0]?.imageUrl, PLATE_URL)
    assert.equal(images[0]?.pageUrl, PLATE_PAGE)
    assert.equal(images.some((image) => image.title.includes("Infotafel")), false)
    assert.equal(images[0]?.title.includes("&"), false)
  })

  it("searches the botanical illustration category and does not call Trefle or BHL when a plate loads", async () => {
    const calls: string[] = []
    const category = commonsCategoryUrl(commonsCategoryTitle(OAK, "botanical"))
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input)
      calls.push(url)
      if (url === category) return jsonResponse(oakCategory)
      if (url === PLATE_URL && init?.method === "HEAD") return imageHead(200)
      throw new Error(`Unexpected call ${init?.method ?? "GET"} ${url}`)
    }
    const outcome = await lookupNameImage(OAK, fetchImpl, true)
    assert.equal(outcome.state, "shown")
    if (outcome.state !== "shown") return
    assert.equal(outcome.image.source, "commons")
    assert.equal(outcome.image.title, "368 Quercus robur.jpg")
    assert.equal(outcome.image.credit, "Carl Axel Magnus Lindman")
    assert.equal(outcome.image.queriedName, OAK)
    assert.equal(calls.some((call) => call.includes("trefle.io")), false)
    assert.equal(calls.some((call) => call.includes("biodiversitylibrary.org")), false)
    assert.equal(calls.some((call) => call.includes("api.gbif.org")), false)
  })

  it("does not call Trefle or BHL when Commons has no illustration", async () => {
    const calls: string[] = []
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      calls.push(url)
      if (url.startsWith("https://commons.wikimedia.org/")) return jsonResponse({ query: {} })
      throw new Error(`Unexpected call ${url}`)
    }
    const outcome = await lookupNameImage(OAK, fetchImpl, true)
    assert.equal(outcome.state, "missed")
    if (outcome.state === "missed") assert.equal(outcome.detail, ILLUSTRATION_MISSED)
    assert.equal(calls.some((call) => call.includes("trefle.io")), false)
    assert.equal(calls.some((call) => call.includes("biodiversitylibrary.org")), false)
  })

  it("says the illustration was not retrieved when Commons does not return an image", async () => {
    let calls = 0
    const offlineFetch: typeof fetch = async () => {
      calls += 1
      return jsonResponse({}, 500)
    }
    const offline = await lookupNameImage(OAK, offlineFetch, false)
    assert.equal(offline.state, "missed")
    if (offline.state === "missed") assert.equal(offline.detail, ILLUSTRATION_MISSED)
    assert.equal(calls, 0)
    assert.equal((await lookupNameImage("  ", offlineFetch, true)).state, "unnamed")

    const failed = await lookupNameImage(
      OAK,
      async (input) => {
        const url = String(input)
        if (url.startsWith("https://commons.wikimedia.org/")) return jsonResponse({ query: {} })
        throw new Error(url)
      },
      true,
    )
    assert.equal(failed.state, "missed")
    if (failed.state === "missed") assert.equal(failed.detail, ILLUSTRATION_MISSED)
  })

  it("stores a Commons file address and drops any other address", async () => {
    const kept = storeNameImage({
      queriedName: OAK,
      imageUrl: PLATE_URL,
      pageUrl: PLATE_PAGE,
      source: "commons",
      sourceLabel: "Wikimedia Commons",
      title: "368 Quercus robur.jpg",
      credit: "Carl Axel Magnus Lindman",
    })
    assert.equal(kept?.imageUrl, PLATE_URL)
    assert.equal(
      storeNameImage({
        queriedName: OAK,
        imageUrl: "https://example.test/plant.png",
        pageUrl: PLATE_PAGE,
        source: "commons",
        sourceLabel: "Wikimedia Commons",
        title: "plant.png",
        credit: null,
      }),
      null,
    )
    assert.equal(await imageFileReturned(PLATE_URL, async () => imageHead(200), new AbortController().signal), true)
    assert.equal(
      await imageFileReturned(
        "https://images.naturalis.nl/original/missing.jpg",
        async () => imageHead(404, "text/html"),
        new AbortController().signal,
      ),
      false,
    )
  })
})
