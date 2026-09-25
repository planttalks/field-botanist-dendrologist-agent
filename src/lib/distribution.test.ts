import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { occurrenceMap, readCountryCounts, lookupDistribution } from "./distribution"
import type { GbifMatch } from "./gbif"

const oak: GbifMatch = {
  usageKey: 2878688,
  scientificName: "Quercus robur L.",
  canonicalName: "Quercus robur",
  rank: "SPECIES",
  status: "ACCEPTED",
  matchType: "EXACT",
  kingdom: "Plantae",
}

describe("distribution", () => {
  it("builds a GBIF map URL and does not invent a polygon", () => {
    const map = occurrenceMap(2878688, "Quercus robur")
    assert.equal(map.baseUrl, "https://tile.gbif.org/4326/omt/0/0/0@1x.png")
    assert.match(map.densityUrl, /taxonKey=2878688/)
    assert.equal(map.pageUrl, "https://www.gbif.org/species/2878688")
    assert.equal(JSON.stringify(map).includes("coordinates"), false)
  })

  it("reads country counts from a GBIF facet", () => {
    const counts = readCountryCounts({
      facets: [{ field: "COUNTRY", counts: [{ name: "FR", count: 12 }, { name: "not-a-code", count: 4 }, { name: "DE", count: 0 }] }],
    })
    assert.deepEqual(counts, [{ code: "FR", count: 12 }])
    assert.equal(readCountryCounts({ count: 1 }), null)
  })

  it("says the distribution was not retrieved when the phone is offline and no note exists", async () => {
    const outcome = await lookupDistribution("Quercus robur", "species", null, fetch, false)
    assert.equal(outcome.state, "skipped")
    assert.equal(outcome.detail, "The distribution was not retrieved.")
  })

  it("keeps a checklist note when the occurrence call fails", async () => {
    const outcome = await lookupDistribution(
      "Quercus robur",
      "species",
      { note: "Europe to Iran", name: "Quercus robur" },
      async () => {
        throw new Error("offline")
      },
      true,
    )
    assert.equal(outcome.state, "shown")
    if (outcome.state !== "shown") return
    assert.equal(outcome.geographicNote, "Europe to Iran")
    assert.equal(outcome.map, null)
    assert.match(outcome.mapDetail ?? "", /not retrieved/i)
    assert.match(outcome.note, /No range was drawn/)
  })

  it("maps only an exact GBIF name and lists real country counts", async () => {
    const outcome = await lookupDistribution(
      "Quercus robur",
      "species",
      { note: "Europe to Iran", name: "Quercus robur" },
      async (input) => {
        const url = String(input)
        if (url.includes("/species/match")) {
          return Response.json(oak)
        }
        if (url.includes("/occurrence/search")) {
          return Response.json({
            facets: [{ field: "COUNTRY", counts: [{ name: "FR", count: 3 }, { name: "GB", count: 2 }] }],
          })
        }
        return new Response("no", { status: 404 })
      },
      true,
    )
    assert.equal(outcome.state, "shown")
    if (outcome.state !== "shown") return
    assert.equal(outcome.map?.taxonKey, 2878688)
    assert.equal(outcome.map?.name, "Quercus robur")
    assert.equal(outcome.countries[0]?.code, "FR")
    assert.equal(outcome.countries[0]?.label, "France")
    assert.match(outcome.note, /sheet name stays/i)
  })

  it("does not map a different species for a hybrid the name check refused", async () => {
    const outcome = await lookupDistribution(
      "Platanus × hispanica",
      "hybrid",
      null,
      async () =>
        Response.json({
          usageKey: 1,
          scientificName: "Platanus occidentalis L.",
          canonicalName: "Platanus occidentalis",
          rank: "SPECIES",
          status: "ACCEPTED",
          matchType: "EXACT",
          kingdom: "Plantae",
        } satisfies GbifMatch),
      true,
    )
    assert.equal(outcome.state, "skipped")
    if (outcome.state !== "skipped") return
    assert.equal(outcome.detail, "The distribution was not retrieved.")
  })
})
