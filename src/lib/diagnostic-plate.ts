import { isSkipped, phraseFor, type Observation } from "@/lib/types"

const FLOWER_VALUES = ["catkin", "cone", "showy", "flower-head", "fig", "spadix", "tiny"] as const
const FRUIT_VALUES = [
  "acorn",
  "nut-in-husk",
  "samara",
  "round-ball",
  "spiky-ball",
  "cone",
  "cone-like",
  "red-cup",
  "woody-capsule",
  "pod",
  "drupe",
  "fig",
  "berry",
  "large-nut",
  "date",
  "banana",
  "pappus",
  "spiny-capsule",
  "small-winged",
  "fleshy-seed",
  "fluff-capsule",
  "propagule",
  "capsule",
  "tuna",
] as const
const BARK_VALUES = ["smooth", "fissured", "scaly", "peeling", "corky"] as const
const BUD_VALUES = ["small-dry", "long-pointed", "resinous", "clustered"] as const
const HABIT_VALUES = ["tree", "shrub", "herb", "vine", "palm", "fern", "grass", "succulent"] as const
const LETTERS = ["A", "B", "C", "D", "E", "F"] as const

export type DrawnFlower = (typeof FLOWER_VALUES)[number]
export type DrawnFruit = (typeof FRUIT_VALUES)[number]
export type DrawnBark = (typeof BARK_VALUES)[number]
export type DrawnBud = (typeof BUD_VALUES)[number]
export type DrawnHabit = (typeof HABIT_VALUES)[number]
export type LeafKind =
  | "placeholder"
  | "pad"
  | "frond"
  | "scale"
  | "needle"
  | "pinnate"
  | "bipinnate"
  | "palmate"
  | "simple"
export type MainOrgan = "leaf" | "habit" | "flower" | "fruit" | "bark" | "buds" | "roots" | "none"
export type MarginTexture = "none" | "toothed" | "wavy" | "spiny" | "rolled-under"
export type DrawnExudate = "white-latex" | "resin"
export type DrawnRoots = "prop" | "exposed"

export interface PlateLeader {
  id: string
  text: string
}

export interface PlateView {
  letter: string
  organ: Exclude<MainOrgan, "none">
  label: string
}

export interface DiagnosticPlateModel {
  main: MainOrgan
  leafKind: LeafKind | null
  shape: string | null
  lobes: string | null
  margin: string | null
  venation: string | null
  petiole: string | null
  arrangement: string | null
  texture: string | null
  fascicle: string | null
  bundleKnown: boolean
  habit: DrawnHabit | null
  flower: DrawnFlower | null
  fruit: DrawnFruit | null
  bark: DrawnBark | null
  buds: DrawnBud | null
  exudate: DrawnExudate | null
  roots: DrawnRoots | null
  showVeins: boolean
  showHairs: boolean
  showStipple: boolean
  marginTexture: MarginTexture
  placeholder: boolean
  scaleNote: string
  caption: string
  leaders: PlateLeader[]
  views: PlateView[]
}

function oneOf<T extends string>(values: readonly T[], value: string): T | null {
  for (const item of values) {
    if (item === value) return item
  }
  return null
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ""
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

function scored(value: string): string | null {
  return isSkipped(value) ? null : value
}

export function leafKindOf(observation: Observation): LeafKind | null {
  if (observation.shape === "pad") return "pad"
  if (observation.leafType === "frond") return "frond"
  if (observation.leafType === "scale-like") return "scale"
  if (
    observation.leafType === "needle" ||
    observation.fascicle === "two" ||
    observation.fascicle === "three" ||
    observation.fascicle === "flat-spray"
  ) {
    return "needle"
  }
  if (observation.leafType === "pinnate") return "pinnate"
  if (observation.leafType === "bipinnate") return "bipinnate"
  if (observation.leafType === "palmate-compound") return "palmate"
  if (scored(observation.shape)) return "simple"
  const partial =
    observation.leafType === "simple" ||
    scored(observation.arrangement) !== null ||
    scored(observation.margin) !== null ||
    scored(observation.venation) !== null ||
    scored(observation.petiole) !== null ||
    scored(observation.lobes) !== null ||
    scored(observation.texture) !== null
  if (partial) return "placeholder"
  return null
}

function marginTerm(margin: string): string {
  switch (margin) {
    case "entire":
      return "entire margin"
    case "toothed":
      return "toothed margin"
    case "wavy":
      return "wavy margin"
    case "spiny":
      return "spiny margin"
    case "rolled-under":
      return "margin rolled under"
    default:
      return margin
  }
}

function marginTextureOf(margin: string | null, placeholder: boolean): MarginTexture {
  if (placeholder || margin === null) return "none"
  switch (margin) {
    case "toothed":
    case "wavy":
    case "spiny":
    case "rolled-under":
      return margin
    case "entire":
      return "none"
    default:
      return "none"
  }
}

function shapeTerm(shape: string): string {
  switch (shape) {
    case "lobed-pinnate":
      return "pinnately lobed"
    case "lobed-palmate":
      return "palmately lobed"
    case "pad":
      return "flat pad"
    case "fan":
      return "fan-shaped"
    case "cordate":
      return "heart-shaped"
    default:
      return shape
  }
}

function budTerm(buds: DrawnBud): string {
  switch (buds) {
    case "clustered":
      return "clustered buds"
    case "small-dry":
      return "small dry buds"
    case "long-pointed":
      return "long pointed buds"
    case "resinous":
      return "resinous buds"
    default: {
      const exhaustive: never = buds
      return exhaustive
    }
  }
}

function exudateTerm(exudate: DrawnExudate): string {
  switch (exudate) {
    case "white-latex":
      return "white latex"
    case "resin":
      return "resin or gum"
    default: {
      const exhaustive: never = exudate
      return exhaustive
    }
  }
}

function rootTerm(roots: DrawnRoots): string {
  switch (roots) {
    case "prop":
      return "prop roots"
    case "exposed":
      return "exposed roots"
    default: {
      const exhaustive: never = roots
      return exhaustive
    }
  }
}

function flowerTerm(flower: DrawnFlower): string {
  return phraseFor("reproductive", flower)
}

function fruitTerm(fruit: DrawnFruit): string {
  return phraseFor("fruit", fruit)
}

function barkTerm(bark: DrawnBark): string {
  return phraseFor("bark", bark)
}

export function scaleNoteFor(observation: Observation): string {
  const length = observation.lengthCm
  const width = observation.widthCm
  if (length !== null && width !== null) return `Scale: lamina ${length} by ${width} cm.`
  if (length !== null) return `Scale: lamina length ${length} cm.`
  if (width !== null) return `Scale: lamina width ${width} cm.`
  return "Scale not stated."
}

function leafClause(input: {
  observation: Observation
  kind: LeafKind
  placeholder: boolean
  showVeins: boolean
  shape: string | null
  margin: string | null
}): string {
  if (input.placeholder) {
    const bits = ["shape not scored"]
    if (scored(input.observation.leafType) && input.observation.leafType === "simple") bits.push("simple leaves")
    if (scored(input.observation.lobes)) bits.push(phraseFor("lobes", input.observation.lobes))
    if (input.margin) bits.push(marginTerm(input.margin))
    if (scored(input.observation.petiole)) bits.push(phraseFor("petiole", input.observation.petiole))
    if (scored(input.observation.arrangement)) bits.push(phraseFor("arrangement", input.observation.arrangement))
    if (scored(input.observation.texture)) bits.push(phraseFor("texture", input.observation.texture))
    return `leaf: ${joinList(bits)}`
  }
  const bits: string[] = []
  if (scored(input.observation.leafType)) bits.push(phraseFor("leafType", input.observation.leafType))
  if (input.shape) bits.push(input.shape === "pad" ? "flat pads" : phraseFor("shape", input.shape))
  if (
    !input.shape &&
    (input.kind === "pinnate" || input.kind === "bipinnate" || input.kind === "palmate")
  ) {
    bits.push("leaflet shape not scored")
  }
  if (scored(input.observation.lobes)) bits.push(phraseFor("lobes", input.observation.lobes))
  if (input.margin) bits.push(marginTerm(input.margin))
  if (input.showVeins && scored(input.observation.venation)) {
    bits.push(phraseFor("venation", input.observation.venation))
  }
  if (scored(input.observation.petiole)) bits.push(phraseFor("petiole", input.observation.petiole))
  if (scored(input.observation.arrangement)) bits.push(phraseFor("arrangement", input.observation.arrangement))
  if (scored(input.observation.texture)) bits.push(phraseFor("texture", input.observation.texture))
  if (input.kind === "needle") {
    const fascicle = input.observation.fascicle
    if (fascicle === "two" || fascicle === "three" || fascicle === "flat-spray") {
      bits.push(phraseFor("fascicle", fascicle))
    } else {
      bits.push("needle bundle not scored")
    }
  }
  return `leaf: ${joinList(bits)}`
}

function pushLeader(leaders: PlateLeader[], id: string, text: string) {
  leaders.push({ id, text })
}

export function diagnosticPlateModel(observation: Observation): DiagnosticPlateModel {
  const leafKind = leafKindOf(observation)
  const placeholder = leafKind === "placeholder"
  const shape = scored(observation.shape)
  const lobes = scored(observation.lobes)
  const margin = scored(observation.margin)
  const venation = scored(observation.venation)
  const petiole = scored(observation.petiole)
  const arrangement = scored(observation.arrangement)
  const texture = scored(observation.texture)
  const fascicle = scored(observation.fascicle)
  const bundleKnown = fascicle === "two" || fascicle === "three" || fascicle === "flat-spray"
  const habit = oneOf(HABIT_VALUES, observation.habit)
  const flower = oneOf(FLOWER_VALUES, observation.reproductive)
  const fruit = oneOf(FRUIT_VALUES, observation.fruit)
  const bark = oneOf(BARK_VALUES, observation.bark)
  const buds = oneOf(BUD_VALUES, observation.buds)
  const exudate = observation.exudate === "white-latex" || observation.exudate === "resin" ? observation.exudate : null
  const roots = observation.roots === "prop" || observation.roots === "exposed" ? observation.roots : null
  const needsBlade = leafKind === "simple" || leafKind === "pinnate" || leafKind === "bipinnate" || leafKind === "palmate"
  const showVeins = venation !== null && leafKind !== null && !placeholder && (!needsBlade || shape !== null)
  const showHairs = texture === "hairy" && leafKind !== null
  const showStipple = texture === "rough" && leafKind !== null && !placeholder
  const marginTexture = marginTextureOf(margin, placeholder)
  const scaleNote = scaleNoteFor(observation)

  let main: MainOrgan = "none"
  if (leafKind) main = "leaf"
  else if (habit) main = "habit"
  else if (flower) main = "flower"
  else if (fruit) main = "fruit"
  else if (bark) main = "bark"
  else if (buds) main = "buds"
  else if (roots) main = "roots"

  const views: PlateView[] = []
  if (main === "leaf" && leafKind) {
    views.push({
      letter: "A",
      organ: "leaf",
      label: leafClause({ observation, kind: leafKind, placeholder, showVeins, shape, margin }),
    })
  } else if (main === "habit" && habit) {
    views.push({ letter: "A", organ: "habit", label: `habit: ${phraseFor("habit", habit)}` })
  } else if (main === "flower" && flower) {
    views.push({ letter: "A", organ: "flower", label: flowerTerm(flower) })
  } else if (main === "fruit" && fruit) {
    views.push({ letter: "A", organ: "fruit", label: fruitTerm(fruit) })
  } else if (main === "bark" && bark) {
    views.push({ letter: "A", organ: "bark", label: barkTerm(bark) })
  } else if (main === "buds" && buds) {
    views.push({ letter: "A", organ: "buds", label: budTerm(buds) })
  } else if (main === "roots" && roots) {
    views.push({ letter: "A", organ: "roots", label: rootTerm(roots) })
  }

  const sides: Array<{ organ: "flower" | "fruit" | "bark"; label: string }> = []
  if (flower && main !== "flower") sides.push({ organ: "flower", label: flowerTerm(flower) })
  if (fruit && main !== "fruit") sides.push({ organ: "fruit", label: fruitTerm(fruit) })
  if (bark && main !== "bark") sides.push({ organ: "bark", label: barkTerm(bark) })
  for (const side of sides) {
    const letter = LETTERS[views.length] ?? "F"
    views.push({ letter, organ: side.organ, label: side.label })
  }

  const leaders: PlateLeader[] = []
  if (main === "leaf") {
    if (placeholder || (needsBlade && !shape)) pushLeader(leaders, "shape", "Shape not scored.")
    else if (shape) pushLeader(leaders, "shape", shapeTerm(shape))
    else if (leafKind === "needle") pushLeader(leaders, "shape", "needles")
    else if (leafKind === "scale") pushLeader(leaders, "shape", "scale-like leaves")
    else if (leafKind === "frond") pushLeader(leaders, "shape", "fern frond")
    if (!placeholder && lobes && lobes !== "none") pushLeader(leaders, "lobes", phraseFor("lobes", lobes))
    if (!placeholder && lobes === "none") pushLeader(leaders, "lobes", "unlobed blade")
    if (!placeholder && margin) pushLeader(leaders, "margin", marginTerm(margin))
    if (showVeins && venation) pushLeader(leaders, "veins", phraseFor("venation", venation))
    if (texture === "hairy") pushLeader(leaders, "surface", "hairy surface")
    else if (texture === "rough") pushLeader(leaders, "surface", "rough surface")
    else if (texture === "smooth") pushLeader(leaders, "surface", "smooth surface")
    else if (texture === "glossy") pushLeader(leaders, "surface", "glossy surface")
    if (petiole) pushLeader(leaders, "petiole", phraseFor("petiole", petiole).replace(/^a /, ""))
    else if (arrangement) pushLeader(leaders, "petiole", "Petiole not scored.")
    if (arrangement) pushLeader(leaders, "arrangement", phraseFor("arrangement", arrangement))
    if (leafKind === "needle" && !bundleKnown) pushLeader(leaders, "fascicle", "Needle bundle not scored.")
    if (leafKind === "needle" && bundleKnown && fascicle) pushLeader(leaders, "fascicle", phraseFor("fascicle", fascicle))
  }
  if (buds && (main === "leaf" || main === "habit" || main === "buds")) pushLeader(leaders, "buds", budTerm(buds))
  if (exudate && (main === "leaf" || main === "habit")) pushLeader(leaders, "exudate", exudateTerm(exudate))
  if (roots && (main === "habit" || main === "roots" || main === "leaf")) pushLeader(leaders, "roots", rootTerm(roots))
  if (main === "habit" && habit) pushLeader(leaders, "habit", phraseFor("habit", habit))
  if (flower) pushLeader(leaders, "flower", flowerTerm(flower))
  if (fruit) pushLeader(leaders, "fruit", fruitTerm(fruit))
  if (bark) pushLeader(leaders, "bark", barkTerm(bark))

  const sentences: string[] = []
  if (views.length === 0) {
    sentences.push("No characters scored. Nothing is drawn.")
  } else {
    sentences.push(views.length === 1 ? `View ${views[0]?.letter}.` : `Views ${joinList(views.map((view) => view.letter))}.`)
  }
  sentences.push("Ink plate of scored characters.")
  sentences.push("This plate is not a drawing of the specimen.")
  sentences.push("It is not a copy of a published plate.")
  for (const view of views) {
    sentences.push(`${view.letter}, ${view.label}.`)
  }
  if (main === "leaf" && habit) sentences.push(`Habit: ${phraseFor("habit", habit)}.`)
  if (buds && main !== "buds") {
    const budPhrase = phraseFor("buds", buds)
    sentences.push(`${budPhrase.charAt(0).toUpperCase()}${budPhrase.slice(1)}.`)
  }
  if (exudate && main !== "none") sentences.push(`Exudate: ${exudateTerm(exudate)}.`)
  if (roots && main !== "roots") sentences.push(`${rootTerm(roots).charAt(0).toUpperCase()}${rootTerm(roots).slice(1)}.`)
  if (venation && !showVeins && leafKind) {
    const veinPhrase = phraseFor("venation", venation)
    const capital = `${veinPhrase.charAt(0).toUpperCase()}${veinPhrase.slice(1)}`
    sentences.push(`${capital} were scored. They are not drawn, because the blade shape was not scored.`)
  }
  sentences.push(scaleNote)

  return {
    main,
    leafKind,
    shape,
    lobes,
    margin,
    venation,
    petiole,
    arrangement,
    texture,
    fascicle,
    bundleKnown,
    habit,
    flower,
    fruit,
    bark,
    buds,
    exudate,
    roots,
    showVeins,
    showHairs,
    showStipple,
    marginTexture,
    placeholder,
    scaleNote,
    caption: sentences.join(" "),
    leaders,
    views,
  }
}
