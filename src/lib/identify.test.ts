import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { identify } from "./identify"
import { regionFromLatLon } from "./regions"
import { SAMPLES } from "./samples"
import { blankObservation } from "./types"

describe("region boxes", () => {
  const cases: Array<[string, number, number, string]> = [
    ["London", 51.5, -0.12, "europe"],
    ["Reykjavik", 64.15, -21.94, "europe"],
    ["Taipei", 25.03, 121.56, "east-asia"],
    ["Tokyo", 35.68, 139.69, "east-asia"],
    ["Port Moresby", -9.44, 147.18, "pacific-islands"],
    ["Sydney", -33.87, 151.21, "oceania"],
    ["New York", 40.71, -74.0, "north-america"],
    ["Mexico City", 19.43, -99.13, "central-america"],
    ["Sao Paulo", -23.55, -46.63, "south-america"],
    ["Nairobi", -1.29, 36.82, "africa"],
    ["Delhi", 28.61, 77.21, "south-asia"],
    ["Honolulu", 21.31, -157.86, "pacific-islands"],
    ["Manokwari", -0.86, 134.08, "pacific-islands"],
    ["Ambon", -3.7, 128.18, "southeast-asia"],
    ["Cape York", -10.69, 142.53, "oceania"],
    ["Cape Town", -33.92, 18.42, "africa"],
    ["Singapore", 1.35, 103.82, "southeast-asia"],
  ]

  for (const [name, lat, lon, region] of cases) {
    it(`maps ${name}`, () => {
      assert.equal(regionFromLatLon(lat, lon), region)
    })
  }
})

describe("identification", () => {
  it("names the park oak sample", () => {
    const sample = SAMPLES.find((item) => item.id === "park-oak")
    assert.ok(sample)
    const result = identify(sample.observation, sample.region, sample.locality)
    assert.equal(result.candidates[0]?.taxon.id, "quercus-robur")
    assert.equal(result.noMatch, false)
    assert.equal(result.geoFlag, "native")
    assert.ok(result.confidence >= 0.72)
    assert.ok(result.reviewScore < 25)
  })

  it("names a white oak when the petiole is long and the region is North America", () => {
    const sample = SAMPLES.find((item) => item.id === "park-oak")
    assert.ok(sample)
    const observation = { ...sample.observation, petiole: "long", bark: "scaly" }
    const result = identify(observation, "north-america", "oak woods")
    assert.equal(result.candidates[0]?.taxon.id, "quercus-alba")
  })

  it("names the coconut and dandelion samples", () => {
    const coconut = SAMPLES.find((item) => item.id === "beach-coconut")
    const dandelion = SAMPLES.find((item) => item.id === "lawn-dandelion")
    assert.ok(coconut && dandelion)
    assert.equal(identify(coconut.observation, coconut.region).candidates[0]?.taxon.id, "cocos-nucifera")
    const lawn = identify(dandelion.observation, dandelion.region)
    assert.equal(lawn.candidates[0]?.taxon.id, "taraxacum-officinale")
    assert.equal(lawn.geoFlag, "planted")
    assert.match(lawn.reviewText, /Most similar name/)
    assert.match(lawn.reviewText, /Taraxacum officinale agg\./)
  })

  it("separates London plane from maple and sweetgum", () => {
    const observation = {
      ...blankObservation(),
      habit: "tree",
      arrangement: "alternate",
      leafType: "simple",
      shape: "lobed-palmate",
      margin: "toothed",
      venation: "palmate",
      lobes: "five",
      petiole: "long",
      bark: "peeling",
      fruit: "round-ball",
      site: "street",
    }
    const result = identify(observation, "oceania", "city street")
    assert.equal(result.candidates[0]?.taxon.id, "platanus-acerifolia")
    assert.equal(result.candidates[0]?.taxon.scientificName, "Platanus × hispanica")
    assert.equal(result.candidates[0]?.taxon.nativeRegions.length, 0)
    assert.equal(result.geoFlag, "planted")
    assert.ok(result.reviewScore < 60)
    const london = identify(observation, "europe", "London street")
    assert.equal(london.geoFlag, "planted")
    assert.match(london.reviewText, /Most similar name/)
  })

  it("separates needle bundles", () => {
    const base = {
      ...blankObservation(),
      habit: "tree",
      leafType: "needle",
      fascicle: "two",
      fruit: "cone",
      exudate: "resin",
      scent: "aromatic",
    }
    assert.equal(identify(base, "europe").candidates[0]?.taxon.id, "pinus-sylvestris")
    assert.equal(
      identify({ ...base, fascicle: "three" }, "oceania").candidates[0]?.taxon.id,
      "pinus-radiata",
    )
  })

  it("flags yew as poisonous", () => {
    const result = identify(
      {
        ...blankObservation(),
        habit: "tree",
        leafType: "needle",
        fascicle: "flat-spray",
        fruit: "red-cup",
      },
      "europe",
    )
    assert.equal(result.candidates[0]?.taxon.id, "taxus-baccata")
    assert.ok(result.warnings.some((warning) => /poison/i.test(warning)))
  })

  it("queues a baobab outside Africa without erasing the name", () => {
    const result = identify(
      {
        ...blankObservation(),
        habit: "tree",
        arrangement: "alternate",
        leafType: "palmate-compound",
        margin: "entire",
        bark: "smooth",
        fruit: "large-nut",
        site: "open",
      },
      "europe",
      "botanic garden",
    )
    assert.equal(result.candidates[0]?.taxon.id, "adansonia-digitata")
    assert.equal(result.geoFlag, "outside")
    assert.ok(result.reviewScore >= 60)
    assert.match(result.reviewText, /Adansonia digitata/)
    assert.match(result.reviewText, /This record: botanic garden/)
  })

  it("asks a splitting question when two oaks are close", () => {
    const result = identify(
      {
        ...blankObservation(),
        habit: "tree",
        arrangement: "alternate",
        leafType: "simple",
        shape: "lobed-pinnate",
        margin: "entire",
        fruit: "acorn",
      },
      null,
    )
    assert.equal(result.noMatch, false)
    assert.ok(result.split)
    assert.ok(["petiole", "bark"].includes(result.split?.key ?? ""))
  })

  it("warns that bracken is poisonous", () => {
    const result = identify(
      { ...blankObservation(), habit: "fern", leafType: "frond" },
      "europe",
    )
    assert.equal(result.candidates[0]?.taxon.id, "pteridium-aquilinum")
    assert.ok(result.warnings.some((warning) => /bracken/i.test(warning)))
  })

  it("does not invent a name from an empty sheet", () => {
    const result = identify(blankObservation(), null)
    assert.equal(result.noMatch, true)
    assert.equal(result.band, "low")
    assert.match(result.reviewText, /unidentified/i)
  })

  it("keeps a thin observation from looking certain", () => {
    const result = identify({ ...blankObservation(), habit: "tree" }, "europe")
    assert.equal(result.thin, true)
    assert.ok(result.confidence <= 0.46)
  })
})
