import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { interpretGbif, lookupGbifName, readGbifRecord, type GbifMatch } from "./gbif"

const oak: GbifMatch = {
  usageKey: 2878688,
  scientificName: "Quercus robur L.",
  canonicalName: "Quercus robur",
  rank: "SPECIES",
  status: "ACCEPTED",
  matchType: "EXACT",
  kingdom: "Plantae",
}

const plane: GbifMatch = {
  usageKey: 7400250,
  scientificName: "Platanus × hispanica Mill. ex Münchh.",
  canonicalName: "Platanus hispanica",
  rank: "SPECIES",
  status: "ACCEPTED",
  matchType: "EXACT",
  kingdom: "Plantae",
}

const dandelion: GbifMatch = {
  usageKey: 5394163,
  scientificName: "Taraxacum officinale Weber ex F.H.Wigg.",
  canonicalName: "Taraxacum officinale",
  rank: "SPECIES",
  status: "ACCEPTED",
  matchType: "EXACT",
  kingdom: "Plantae",
}

describe("GBIF name check", () => {
  it("shows an exact accepted species without the author", () => {
    const outcome = interpretGbif({ sheetName: "Quercus robur", nameKind: "species", match: oak, accepted: null })
    assert.equal(outcome.state, "shown")
    if (outcome.state !== "shown") return
    assert.equal(outcome.acceptedName, "Quercus robur")
    assert.equal(outcome.acceptedName.includes("L."), false)
    assert.equal(outcome.rankLabel, "species")
    assert.equal(outcome.statusLabel, "accepted")
    assert.equal(outcome.url, "https://www.gbif.org/species/2878688")
    assert.match(outcome.note, /sheet name stays/i)
  })

  it("keeps the hybrid mark and does not turn London plane into a parent", () => {
    const outcome = interpretGbif({
      sheetName: "Platanus × hispanica",
      nameKind: "hybrid",
      match: plane,
      accepted: null,
    })
    assert.equal(outcome.state, "shown")
    if (outcome.state !== "shown") return
    assert.equal(outcome.acceptedName, "Platanus × hispanica")
    assert.equal(outcome.acceptedName.includes("Mill"), false)
    assert.equal(outcome.rankLabel, "species")
    assert.match(outcome.note, /hybrid/)
    assert.equal(outcome.acceptedName.includes("occidentalis"), false)
    assert.equal(outcome.acceptedName.includes("orientalis"), false)
  })

  it("refuses a hybrid hit that is a different species", () => {
    const outcome = interpretGbif({
      sheetName: "Platanus × hispanica",
      nameKind: "hybrid",
      match: {
        usageKey: 1,
        scientificName: "Platanus occidentalis L.",
        canonicalName: "Platanus occidentalis",
        rank: "SPECIES",
        status: "ACCEPTED",
        matchType: "EXACT",
        kingdom: "Plantae",
      },
      accepted: null,
    })
    assert.equal(outcome.state, "kept")
    if (outcome.state !== "kept") return
    assert.match(outcome.detail, /sheet name stays/i)
    assert.equal(JSON.stringify(outcome).includes("occidentalis"), false)
  })

  it("does not drop the hybrid sign when GBIF omits the space", () => {
    const outcome = interpretGbif({
      sheetName: "Platanus × hispanica",
      nameKind: "hybrid",
      match: {
        ...plane,
        scientificName: "Platanus ×hispanica Mill. ex Münchh.",
      },
      accepted: null,
    })
    assert.equal(outcome.state, "shown")
    if (outcome.state !== "shown") return
    assert.equal(outcome.acceptedName, "Platanus × hispanica")
  })

  it("refuses a hybrid record that GBIF stored as a plain species", () => {
    const outcome = interpretGbif({
      sheetName: "Platanus × hispanica",
      nameKind: "hybrid",
      match: {
        ...plane,
        scientificName: "Platanus hispanica Mill. ex Münchh.",
        canonicalName: "Platanus hispanica",
      },
      accepted: null,
    })
    assert.equal(outcome.state, "kept")
  })

  it("keeps the dandelion aggregate instead of adopting a species rank as the sheet name", () => {
    const outcome = interpretGbif({
      sheetName: "Taraxacum officinale",
      nameKind: "aggregate",
      match: dandelion,
      accepted: null,
    })
    assert.equal(outcome.state, "shown")
    if (outcome.state !== "shown") return
    assert.equal(outcome.acceptedName, "Taraxacum officinale")
    assert.equal(outcome.acceptedName.includes("Weber"), false)
    assert.equal(outcome.rankLabel, "species")
    assert.match(outcome.note, /aggregate/)
    assert.equal(outcome.acceptedName.endsWith("agg."), false)
  })

  it("does not correct an aggregate into a different species", () => {
    const outcome = interpretGbif({
      sheetName: "Taraxacum officinale",
      nameKind: "aggregate",
      match: {
        usageKey: 9,
        scientificName: "Taraxacum erythrospermum Andrz. ex Besser",
        canonicalName: "Taraxacum erythrospermum",
        rank: "SPECIES",
        status: "ACCEPTED",
        matchType: "EXACT",
        kingdom: "Plantae",
      },
      accepted: null,
    })
    assert.equal(outcome.state, "kept")
    if (outcome.state !== "kept") return
    assert.equal(outcome.detail.includes("erythrospermum"), false)
  })

  it("shows a synonym's accepted name beside the sheet name", () => {
    const outcome = interpretGbif({
      sheetName: "Eichhornia crassipes",
      nameKind: "species",
      match: {
        usageKey: 2765940,
        acceptedUsageKey: 2765942,
        scientificName: "Eichhornia crassipes (Mart.) Solms",
        canonicalName: "Eichhornia crassipes",
        rank: "SPECIES",
        status: "SYNONYM",
        matchType: "EXACT",
        kingdom: "Plantae",
      },
      accepted: {
        key: 2765942,
        scientificName: "Pontederia crassipes Mart.",
        canonicalName: "Pontederia crassipes",
        rank: "SPECIES",
        taxonomicStatus: "ACCEPTED",
        kingdom: "Plantae",
      },
    })
    assert.equal(outcome.state, "shown")
    if (outcome.state !== "shown") return
    assert.equal(outcome.acceptedName, "Pontederia crassipes")
    assert.equal(outcome.acceptedName.includes("Mart"), false)
    assert.equal(outcome.url, "https://www.gbif.org/species/2765942")
    assert.match(outcome.note, /sheet name stays/i)
  })

  it("does not invent a match from a higher rank or a fuzzy hit", () => {
    const higher = interpretGbif({
      sheetName: "Not a real plant xyz",
      nameKind: "species",
      match: {
        usageKey: 6,
        scientificName: "Plantae",
        canonicalName: "Plantae",
        rank: "KINGDOM",
        status: "ACCEPTED",
        matchType: "HIGHERRANK",
        kingdom: "Plantae",
      },
      accepted: null,
    })
    assert.equal(higher.state, "none")
    const fuzzy = interpretGbif({
      sheetName: "Quercus robur",
      nameKind: "species",
      match: {
        usageKey: 99,
        scientificName: "Quercus rubra L.",
        canonicalName: "Quercus rubra",
        rank: "SPECIES",
        status: "ACCEPTED",
        matchType: "FUZZY",
        kingdom: "Plantae",
      },
      accepted: null,
    })
    assert.equal(fuzzy.state, "none")
  })

  it("does not invent an accepted name when a synonym has no accepted record", () => {
    const outcome = interpretGbif({
      sheetName: "Eichhornia crassipes",
      nameKind: "species",
      match: {
        usageKey: 2765940,
        scientificName: "Eichhornia crassipes (Mart.) Solms",
        canonicalName: "Eichhornia crassipes",
        rank: "SPECIES",
        status: "SYNONYM",
        matchType: "EXACT",
        kingdom: "Plantae",
      },
      accepted: null,
    })
    assert.equal(outcome.state, "none")
  })

  it("says the check did not run when the phone is offline or GBIF fails", async () => {
    const offline = await lookupGbifName("Quercus robur", "species", fetch, false)
    assert.equal(offline.state, "skipped")
    const failed = await lookupGbifName("Quercus robur", "species", async () => {
      throw new Error("offline")
    })
    assert.equal(failed.state, "skipped")
    const http = await lookupGbifName("Quercus robur", "species", async () => new Response("no", { status: 503 }))
    assert.equal(http.state, "skipped")
  })

  it("reads a live match payload without keeping the author", () => {
    const record = readGbifRecord({
      usageKey: 2878688,
      scientificName: "Quercus robur L.",
      canonicalName: "Quercus robur",
      rank: "SPECIES",
      status: "ACCEPTED",
      matchType: "EXACT",
      kingdom: "Plantae",
      alternatives: [{ scientificName: "Quercus robur Pall." }],
    })
    assert.ok(record)
    const outcome = interpretGbif({
      sheetName: "Quercus robur",
      nameKind: "species",
      match: record,
      accepted: null,
    })
    assert.equal(outcome.state, "shown")
    if (outcome.state !== "shown") return
    assert.equal(outcome.acceptedName, "Quercus robur")
  })
})
