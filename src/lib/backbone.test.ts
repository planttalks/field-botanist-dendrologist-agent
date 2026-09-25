import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  checklistQueryName,
  interpretSource,
  lookupBackbone,
  readChecklistHits,
  type ChecklistHit,
} from "./backbone"

const oak: ChecklistHit = {
  classification: [
    { name: "Fagaceae", rank: "family" },
    { name: "Quercus", rank: "genus" },
    { name: "Quercus robur", rank: "species" },
  ],
  id: "urn:lsid:ipni.org:names:304293-2",
  status: "accepted",
  scientificName: "Quercus robur",
  rank: "species",
  remarks: "Europe to Iran",
  accepted: null,
}

const waterHyacinth: ChecklistHit = {
  classification: [
    { name: "Pontederiaceae", rank: "family" },
    { name: "Pontederia", rank: "genus" },
    { name: "Pontederia crassipes", rank: "species" },
    { name: "Eichhornia crassipes", rank: "species" },
  ],
  id: "urn:lsid:ipni.org:names:296888-1",
  status: "synonym",
  scientificName: "Eichhornia crassipes",
  rank: "species",
  remarks: null,
  accepted: {
    id: "urn:lsid:ipni.org:names:310928-2",
    scientificName: "Pontederia crassipes",
    rank: "species",
    remarks: "S. Trop. America",
  },
}

const dandelion: ChecklistHit = {
  classification: [
    { name: "Asteraceae", rank: "family" },
    { name: "Taraxacum", rank: "genus" },
    { name: "Taraxacum (Taraxacum) sp.", rank: "species" },
    { name: "Taraxacum officinale", rank: "species" },
  ],
  id: "urn:lsid:ipni.org:names:1003018-2",
  status: "synonym",
  scientificName: "Taraxacum officinale",
  rank: "species",
  remarks: "Denmark",
  accepted: {
    id: "urn:lsid:ipni.org:names:254151-1",
    scientificName: "Taraxacum (Taraxacum) sp.",
    rank: "species",
    remarks: "Macaronesia, Europe to Siberia, NW. Africa",
  },
}

describe("backbone comparison", () => {
  it("normalizes a hybrid multiplication sign for the query", () => {
    assert.equal(checklistQueryName("Platanus x hispanica"), "Platanus × hispanica")
    assert.equal(checklistQueryName("Platanus ×hispanica"), "Platanus × hispanica")
  })

  it("places an accepted species in family, genus and species", () => {
    const outcome = interpretSource({ source: "powo", sheetName: "Quercus robur", nameKind: "species", hits: [oak] })
    assert.equal(outcome.state, "shown")
    assert.deepEqual(
      outcome.tree.map((node) => node.rank),
      ["family", "genus", "species"],
    )
    assert.equal(outcome.tree[2]?.name, "Quercus robur")
    assert.equal(outcome.acceptedName, "Quercus robur")
    assert.equal(outcome.statusLabel, "accepted")
    assert.equal(outcome.geographicNote, "Europe to Iran")
    assert.equal(outcome.portalUrl, "https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:304293-2")
    assert.match(outcome.detail, /sheet name stays/i)
    assert.match(outcome.detail, /not a new species/i)
    assert.equal(outcome.detail.toLowerCase().includes("phylogen"), false)
  })

  it("shows the accepted placement of a synonym and does not keep the old genus as the species", () => {
    const outcome = interpretSource({
      source: "powo",
      sheetName: "Eichhornia crassipes",
      nameKind: "species",
      hits: [waterHyacinth],
    })
    assert.equal(outcome.state, "shown")
    assert.equal(outcome.statusLabel, "synonym")
    assert.equal(outcome.acceptedName, "Pontederia crassipes")
    assert.equal(outcome.tree.find((node) => node.rank === "family")?.name, "Pontederiaceae")
    assert.equal(outcome.tree.find((node) => node.rank === "genus")?.name, "Pontederia")
    assert.equal(outcome.tree.find((node) => node.rank === "species")?.name, "Pontederia crassipes")
    assert.equal(outcome.tree.some((node) => node.name === "Eichhornia crassipes"), false)
    assert.equal(outcome.geographicNote, "S. Trop. America")
    assert.match(outcome.detail, /synonym/)
    assert.match(outcome.detail, /sheet name stays/i)
  })

  it("keeps an infraspecific rank when the accepted record is below species", () => {
    const outcome = interpretSource({
      source: "powo",
      sheetName: "Quercus pedunculata",
      nameKind: "species",
      hits: [
        {
          classification: [
            { name: "Fagaceae", rank: "family" },
            { name: "Quercus", rank: "genus" },
            { name: "Quercus robur", rank: "species" },
            { name: "Quercus robur subsp. robur", rank: "subspecies" },
            { name: "Quercus pedunculata", rank: "species" },
          ],
          id: "urn:lsid:ipni.org:names:77245397-1",
          status: "synonym",
          scientificName: "Quercus pedunculata",
          rank: "species",
          remarks: null,
          accepted: {
            id: "urn:lsid:ipni.org:names:77171868-1",
            scientificName: "Quercus robur subsp. robur",
            rank: "subspecies",
            remarks: "Europe to Caucasus",
          },
        },
      ],
    })
    assert.equal(outcome.state, "shown")
    assert.equal(outcome.tree.find((node) => node.rank === "species")?.name, "Quercus robur")
    assert.equal(outcome.tree.find((node) => node.rank === "subspecies")?.name, "Quercus robur subsp. robur")
    assert.equal(outcome.tree.some((node) => node.name === "Quercus pedunculata"), false)
    assert.equal(outcome.geographicNote, "Europe to Caucasus")
  })

  it("does not turn a dandelion aggregate into a placeholder species", () => {
    const outcome = interpretSource({
      source: "powo",
      sheetName: "Taraxacum officinale",
      nameKind: "aggregate",
      hits: [dandelion],
    })
    assert.equal(outcome.state, "shown")
    assert.equal(outcome.acceptedName, null)
    assert.equal(outcome.tree.some((node) => node.rank === "species"), false)
    assert.equal(outcome.tree.find((node) => node.rank === "genus")?.name, "Taraxacum")
    assert.equal(outcome.geographicNote, null)
    assert.equal(JSON.stringify(outcome).includes("Taraxacum (Taraxacum) sp."), false)
    assert.match(outcome.detail, /did not return a species/i)
    assert.match(outcome.detail, /aggregate was not changed/i)
  })

  it("does not accept a hybrid that the list stored without the hybrid sign", () => {
    const outcome = interpretSource({
      source: "wfo",
      sheetName: "Platanus × hispanica",
      nameKind: "hybrid",
      hits: [
        {
          classification: [
            { name: "Platanaceae", rank: "family" },
            { name: "Platanus", rank: "genus" },
            { name: "Platanus hispanica", rank: "species" },
          ],
          id: "wfo-1",
          status: "accepted",
          scientificName: "Platanus hispanica",
          rank: "species",
          remarks: null,
          accepted: null,
        },
      ],
    })
    assert.equal(outcome.state, "none")
    assert.equal(outcome.tree.length, 0)
    assert.match(outcome.detail, /hybrid/)
    assert.match(outcome.detail, /sheet name stays/i)
  })

  it("shows a hybrid when the list keeps the hybrid sign", () => {
    const outcome = interpretSource({
      source: "powo",
      sheetName: "Platanus × hispanica",
      nameKind: "hybrid",
      hits: [
        {
          classification: [
            { name: "Platanaceae", rank: "family" },
            { name: "Platanus", rank: "genus" },
            { name: "Platanus × hispanica", rank: "species" },
          ],
          id: "urn:lsid:ipni.org:names:685854-1",
          status: "accepted",
          scientificName: "Platanus × hispanica",
          rank: "species",
          remarks: null,
          accepted: null,
        },
      ],
    })
    assert.equal(outcome.state, "shown")
    assert.equal(outcome.acceptedName, "Platanus × hispanica")
    assert.match(outcome.detail, /hybrid/)
  })

  it("does not choose when one sheet name points at two accepted names", () => {
    const other: ChecklistHit = {
      ...waterHyacinth,
      id: "urn:lsid:ipni.org:names:9-2",
      accepted: {
        id: "urn:lsid:ipni.org:names:8-2",
        scientificName: "Pontederia azurea",
        rank: "species",
        remarks: null,
      },
    }
    const outcome = interpretSource({
      source: "powo",
      sheetName: "Eichhornia crassipes",
      nameKind: "species",
      hits: [waterHyacinth, other],
    })
    assert.equal(outcome.state, "none")
    assert.equal(outcome.acceptedName, null)
    assert.equal(outcome.tree.length, 0)
  })

  it("prefers the accepted author over a same-name synonym", () => {
    const synonymAuthor: ChecklistHit = {
      ...oak,
      id: "wfo-syn",
      status: "synonym",
      accepted: {
        id: "wfo-sub",
        scientificName: "Quercus robur subsp. brutia",
        rank: "subspecies",
        remarks: null,
      },
      classification: [
        ...oak.classification,
        { name: "Quercus robur subsp. brutia", rank: "subspecies" },
      ],
    }
    const outcome = interpretSource({
      source: "wfo",
      sheetName: "Quercus robur",
      nameKind: "species",
      hits: [synonymAuthor, oak],
    })
    assert.equal(outcome.state, "shown")
    assert.equal(outcome.acceptedName, "Quercus robur")
    assert.equal(outcome.tree.some((node) => node.rank === "subspecies"), false)
    assert.equal(outcome.geographicNote, null)
  })

  it("reads a checklist payload and treats an unreadable body as a failed check", async () => {
    const hits = readChecklistHits({
      result: [
        {
          classification: [{ name: "Fagaceae", rank: "family" }],
          usage: {
            id: "urn:lsid:ipni.org:names:304293-2",
            status: "accepted",
            remarks: "Europe to Iran",
            name: { scientificName: "Quercus robur", rank: "species", remarks: "Available" },
          },
        },
      ],
    })
    assert.ok(hits)
    assert.equal(hits[0]?.remarks, "Europe to Iran")
    assert.deepEqual(readChecklistHits({ total: 0 }), [])
    assert.deepEqual(readChecklistHits({ result: [{ usage: { status: "bare name", name: { scientificName: "Taraxacum officinale" } } }] }), [])
    assert.equal(readChecklistHits({ result: "no" }), null)
    const failed = await lookupBackbone("Quercus robur", "species", async () => new Response("no", { status: 503 }), true)
    assert.equal(failed.state, "skipped")
    assert.match(failed.detail, /did not run/i)
    const offline = await lookupBackbone("Quercus robur", "species", fetch, false)
    assert.equal(offline.state, "skipped")
  })
})
