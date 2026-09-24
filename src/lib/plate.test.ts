import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { traceInk } from "./ink"
import { specimenToCsv, specimenToJson, type Specimen } from "./journal"
import { blankSpecifics, plateCopy, type IllustrationPlate, type PlateSlotId } from "./plate"
import { blankObservation } from "./types"

function solid(width: number, height: number, value: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = value
    rgba[i + 1] = value
    rgba[i + 2] = value
    rgba[i + 3] = 255
  }
  return rgba
}

function verticalStep(width: number, height: number): Uint8ClampedArray {
  const rgba = solid(width, height, 0)
  for (let y = 0; y < height; y += 1) {
    for (let x = Math.floor(width / 2); x < width; x += 1) {
      const offset = (y * width + x) * 4
      rgba[offset] = 255
      rgba[offset + 1] = 255
      rgba[offset + 2] = 255
    }
  }
  return rgba
}

function inkXs(ink: Uint8ClampedArray, width: number): number[] {
  const xs: number[] = []
  for (let i = 3; i < ink.length; i += 4) {
    if (ink[i] === 0) continue
    xs.push(Math.floor(i / 4) % width)
  }
  return xs
}

const none: Record<PlateSlotId, boolean> = {
  habit: false,
  leaf: false,
  "flower-fruit": false,
  detail: false,
}

describe("traceInk", () => {
  it("leaves a flat frame blank", () => {
    const ink = traceInk(solid(24, 24, 140), 24, 24)
    assert.equal(inkXs(ink, 24).length, 0)
  })

  it("inks the step in a real edge and not the flat sides", () => {
    const width = 32
    const height = 24
    const ink = traceInk(verticalStep(width, height), width, height)
    const xs = inkXs(ink, width)
    assert.ok(xs.length > 0)
    for (const x of xs) {
      assert.ok(x > 10 && x < 22, `ink at x=${x} is too far from the edge`)
    }
  })
})

describe("plateCopy", () => {
  it("prints the hypothesis, the views, the scale and the dictated notes", () => {
    const copy = plateCopy({
      scientificName: "Quercus robur",
      nameState: "hypothesis",
      present: { ...none, habit: true, leaf: true },
      specifics: {
        ...blankSpecifics(),
        organs: ["leaf", "stigma"],
        measurements: "petiole 1 cm",
        pubescence: "hairy beneath",
        stigmas: "three, branched",
        chambers: "three",
        scale: "leaf life size",
      },
      lengthCm: 8,
      widthCm: 4,
    })
    assert.equal(copy.binomial, "Quercus robur")
    assert.match(copy.caption, /Quercus robur, field hypothesis/)
    assert.match(copy.caption, /Views traced: A Habit and B Leaf/)
    assert.match(copy.caption, /Not photographed: C Flower or fruit and D Close detail/)
    assert.match(copy.caption, /Requested and not photographed: Stigma/)
    assert.match(copy.caption, /Scale: leaf life size/)
    assert.match(copy.caption, /lamina 8 by 4 cm/)
    assert.match(copy.caption, /petiole 1 cm/)
    assert.match(copy.caption, /Pubescence: hairy beneath/)
    assert.match(copy.caption, /Stigmas: three, branched/)
    assert.match(copy.caption, /Capsule chambers: three/)
    assert.deepEqual(copy.views, ["habit", "leaf"])
  })

  it("keeps every slot out of the traced list when nothing was uploaded", () => {
    const copy = plateCopy({
      scientificName: null,
      nameState: "pending",
      present: none,
      specifics: { ...blankSpecifics(), organs: ["capsule"], pubescence: "glabrous" },
      lengthCm: null,
      widthCm: null,
    })
    assert.equal(copy.views.length, 0)
    assert.match(copy.caption, /No view was photographed/)
    assert.match(copy.caption, /Requested and not photographed: Capsule/)
    assert.match(copy.caption, /Pubescence: glabrous/)
    assert.match(copy.nameLine, /Name not set/)
  })
})

describe("journal export", () => {
  it("includes the illustration plate in JSON", () => {
    const illustration: IllustrationPlate = {
      dataUrl: "data:image/png;base64,abc",
      dropped: false,
      mode: "line",
      views: ["leaf"],
      caption: "Quercus robur, field hypothesis\nScale: life size.",
      scaleNote: "life size",
      organsRequested: ["leaf"],
      measurements: "petiole 1 cm",
      pubescence: "hairy beneath",
      stigmas: "",
      chambers: "",
    }
    const record: Specimen = {
      id: "rec-1",
      createdAt: "2026-09-24T00:00:00.000Z",
      locality: "park",
      region: null,
      latitude: null,
      longitude: null,
      elevationM: null,
      habitat: "",
      notes: "",
      photoDataUrl: null,
      photoDropped: false,
      qualityWarnings: [],
      observation: blankObservation(),
      scientificName: "Quercus robur",
      family: "Fagaceae",
      taxonId: "quercus-robur",
      confidence: 0.5,
      reviewScore: 1,
      reviewLabel: "Low",
      reviewText: "Review.",
      candidates: [],
      illustration,
    }
    const json = specimenToJson([record])
    assert.match(json, /data:image\/png;base64,abc/)
    assert.match(json, /Quercus robur, field hypothesis/)
    assert.match(json, /hairy beneath/)
  })

  it("keeps a coarse region out of locality and marks the dandelion as an aggregate", () => {
    const record: Specimen = {
      id: "rec-2",
      createdAt: "2026-09-24T00:00:00.000Z",
      locality: "",
      region: "europe",
      latitude: 51.5,
      longitude: -0.12,
      elevationM: null,
      habitat: "lawn",
      notes: "beside the path",
      photoDataUrl: null,
      photoDropped: false,
      qualityWarnings: [],
      observation: blankObservation(),
      scientificName: "Taraxacum officinale",
      family: "Asteraceae",
      taxonId: "taraxacum-officinale",
      confidence: 0.5,
      reviewScore: 10,
      reviewLabel: "Routine check",
      reviewText: "Most similar name on this sheet: Taraxacum officinale agg.",
      candidates: [],
      illustration: null,
    }
    const csv = specimenToCsv([record])
    assert.match(csv, /geodeticDatum/)
    assert.match(csv, /WGS84/)
    assert.match(csv, /identificationVerificationStatus/)
    assert.match(csv, /unverified/)
    assert.match(csv, /agg\./)
    assert.match(csv, /Not a determination and not a new species/)
    assert.match(csv, /eventDate is when this sheet was saved/)
    assert.match(csv, /Uncertainty was not recorded/)
    assert.match(csv, /beside the path/)
    assert.doesNotMatch(csv, /,Europe,/)
  })
})
