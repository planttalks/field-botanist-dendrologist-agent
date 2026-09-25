import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { diagnosticPlateModel } from "./diagnostic-plate"
import { CHART_SHAPES, bladeOutline, needleParts, scaleOutlines } from "./leaf-outlines"
import { SAMPLES } from "./samples"
import { blankObservation, type Observation } from "./types"

function parkOak(): Observation {
  const sample = SAMPLES.find((item) => item.id === "park-oak")
  if (!sample) throw new Error("Park oak sample is missing.")
  return sample.observation
}

describe("diagnostic plate", () => {
  it("draws the park oak from scored characters only", () => {
    const model = diagnosticPlateModel(parkOak())
    assert.equal(model.main, "leaf")
    assert.equal(model.leafKind, "simple")
    assert.equal(model.placeholder, false)
    assert.equal(model.showVeins, true)
    assert.equal(model.showHairs, false)
    assert.equal(model.showStipple, false)
    assert.equal(model.marginTexture, "none")
    assert.equal(model.flower, "catkin")
    assert.equal(model.fruit, "acorn")
    assert.equal(model.bark, "fissured")
    assert.equal(model.buds, "clustered")
    assert.equal(model.scaleNote, "Scale not stated.")
    assert.deepEqual(
      model.views.map((view) => view.organ),
      ["leaf", "flower", "fruit", "bark"],
    )
    assert.deepEqual(
      model.leaders.map((leader) => leader.id),
      ["shape", "lobes", "margin", "veins", "surface", "petiole", "arrangement", "buds", "flower", "fruit", "bark"],
    )
    assert.equal(model.leaders.find((leader) => leader.id === "margin")?.text, "entire margin")
    assert.equal(model.leaders.find((leader) => leader.id === "veins")?.text, "pinnate veins")
    assert.equal(model.leaders.find((leader) => leader.id === "surface")?.text, "smooth surface")
    assert.equal(model.leaders.find((leader) => leader.id === "fruit")?.text, "acorns")
    assert.equal(model.leaders.some((leader) => leader.id === "hairs"), false)
    assert.match(model.caption, /Ink plate of scored characters/)
    assert.match(model.caption, /not a drawing of the specimen/)
    assert.match(model.caption, /not a copy of a published plate/)
    assert.match(model.caption, /pinnately lobed/)
    assert.match(model.caption, /entire margin/)
    assert.match(model.caption, /pinnate veins/)
    assert.match(model.caption, /Habit: tree/)
    assert.match(model.caption, /Buds clustered at the tip/)
    assert.match(model.caption, /catkins/)
    assert.match(model.caption, /acorns/)
    assert.match(model.caption, /fissured bark/)
    assert.match(model.caption, /Scale not stated/)
    assert.doesNotMatch(model.caption, /hair/)
    assert.doesNotMatch(model.caption, /'/)
  })

  it("draws nothing when no character is scored", () => {
    const model = diagnosticPlateModel(blankObservation())
    assert.equal(model.main, "none")
    assert.equal(model.leafKind, null)
    assert.equal(model.showVeins, false)
    assert.equal(model.showHairs, false)
    assert.equal(model.fruit, null)
    assert.equal(model.flower, null)
    assert.equal(model.bark, null)
    assert.equal(model.views.length, 0)
    assert.match(model.caption, /Nothing is drawn/)
    assert.match(model.caption, /Scale not stated/)
  })

  it("omits fruit, veins and hairs that were not scored", () => {
    const model = diagnosticPlateModel({
      ...parkOak(),
      fruit: "not-seen",
      reproductive: "not-seen",
      bark: "not-seen",
      venation: "not-seen",
      texture: "not-seen",
      buds: "not-seen",
    })
    assert.equal(model.fruit, null)
    assert.equal(model.flower, null)
    assert.equal(model.bark, null)
    assert.equal(model.showVeins, false)
    assert.equal(model.showHairs, false)
    assert.deepEqual(
      model.views.map((view) => view.organ),
      ["leaf"],
    )
    assert.equal(model.leaders.some((leader) => leader.id === "veins"), false)
    assert.equal(model.leaders.some((leader) => leader.id === "fruit"), false)
    assert.equal(model.leaders.some((leader) => leader.id === "surface"), false)
  })

  it("uses a dashed placeholder instead of a default leaf", () => {
    const model = diagnosticPlateModel({
      ...blankObservation(),
      arrangement: "alternate",
      venation: "pinnate",
    })
    assert.equal(model.placeholder, true)
    assert.equal(model.showVeins, false)
    assert.equal(model.leafKind, "placeholder")
    assert.equal(model.leaders.find((leader) => leader.id === "shape")?.text, "Shape not scored.")
    assert.match(model.caption, /not drawn, because the blade shape was not scored/)
  })

  it("draws hairs only when the surface is scored as hairy", () => {
    const model = diagnosticPlateModel({
      ...parkOak(),
      texture: "hairy",
      margin: "toothed",
    })
    assert.equal(model.showHairs, true)
    assert.equal(model.marginTexture, "toothed")
    assert.equal(model.leaders.find((leader) => leader.id === "surface")?.text, "hairy surface")
  })

  it("prints a scale only when a measurement was entered", () => {
    const bare = diagnosticPlateModel({ ...blankObservation(), shape: "ovate" })
    assert.equal(bare.scaleNote, "Scale not stated.")
    const measured = diagnosticPlateModel({
      ...blankObservation(),
      shape: "ovate",
      lengthCm: 8,
      widthCm: 4,
    })
    assert.equal(measured.scaleNote, "Scale: lamina 8 by 4 cm.")
    assert.match(measured.caption, /lamina 8 by 4 cm/)
  })

  it("draws a distinct chart outline for each scored blade shape and none when shape is missing", () => {
    const paths = CHART_SHAPES.map((shape) => {
      const outline = bladeOutline(shape, shape.startsWith("lobed") ? "five" : null)
      assert.ok(outline)
      assert.match(outline.d, /^M /)
      return outline.d
    })
    assert.equal(new Set(paths).size, CHART_SHAPES.length)
    assert.equal(bladeOutline(null, null), null)
    assert.equal(bladeOutline("not-seen", null), null)
    assert.notEqual(bladeOutline("lobed-pinnate", "three")?.d, bladeOutline("lobed-pinnate", "many")?.d)
    assert.notEqual(bladeOutline("lobed-palmate", "three")?.d, bladeOutline("lobed-palmate", "five")?.d)
    assert.equal(needleParts("one").blades.length, 1)
    assert.equal(needleParts("two").blades.length, 2)
    assert.equal(needleParts("three").blades.length, 3)
    assert.ok(scaleOutlines().length > 1)
    const needle = diagnosticPlateModel({ ...blankObservation(), leafType: "needle" })
    assert.equal(needle.leaders.find((leader) => leader.id === "shape")?.text, "needles")
    const scale = diagnosticPlateModel({ ...blankObservation(), leafType: "scale-like" })
    assert.equal(scale.leaders.find((leader) => leader.id === "shape")?.text, "scale-like leaves")
  })
})
