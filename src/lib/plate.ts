import type { NameKind } from "./taxa"

export const PLATE_SLOTS = [
  {
    id: "habit",
    letter: "A",
    label: "Habit",
    hint: "The whole plant, in the ground if you can.",
  },
  {
    id: "leaf",
    letter: "B",
    label: "Leaf",
    hint: "A leaf, with the stalk if you can get it in frame.",
  },
  {
    id: "flower-fruit",
    letter: "C",
    label: "Flower or fruit",
    hint: "Flower, fruit or cone. One view.",
  },
  {
    id: "detail",
    letter: "D",
    label: "Close detail",
    hint: "Bark, bud, hair, stigma or capsule.",
  },
] as const

export type PlateSlotId = (typeof PLATE_SLOTS)[number]["id"]

export const PLATE_ORGANS = [
  { id: "habit", label: "Habit", slot: "habit" },
  { id: "leaf", label: "Leaf", slot: "leaf" },
  { id: "flower", label: "Flower", slot: "flower-fruit" },
  { id: "fruit", label: "Fruit", slot: "flower-fruit" },
  { id: "bark", label: "Bark", slot: "detail" },
  { id: "bud", label: "Bud", slot: "detail" },
  { id: "hair", label: "Hair", slot: "detail" },
  { id: "stigma", label: "Stigma", slot: "detail" },
  { id: "capsule", label: "Capsule", slot: "detail" },
] as const

export type PlateOrganId = (typeof PLATE_ORGANS)[number]["id"]

export const PLATE_MODES = [
  { id: "line", label: "Line only" },
  { id: "tint", label: "Light tint" },
  { id: "beside", label: "Photo beside the line" },
] as const

export type PlateMode = (typeof PLATE_MODES)[number]["id"]

export type PlateNameState = "pending" | "hypothesis" | "unidentified"

export interface PlateSpecifics {
  organs: PlateOrganId[]
  measurements: string
  pubescence: string
  stigmas: string
  chambers: string
  scale: string
}

export function blankSpecifics(): PlateSpecifics {
  return {
    organs: [],
    measurements: "",
    pubescence: "",
    stigmas: "",
    chambers: "",
    scale: "",
  }
}

export function specificsActive(specifics: PlateSpecifics): boolean {
  if (specifics.organs.length > 0) return true
  return [specifics.measurements, specifics.pubescence, specifics.stigmas, specifics.chambers, specifics.scale].some(
    (value) => value.trim().length > 0,
  )
}

export function isPlateMode(value: string): value is PlateMode {
  return PLATE_MODES.some((mode) => mode.id === value)
}

export function isPlateOrgan(value: string): value is PlateOrganId {
  return PLATE_ORGANS.some((organ) => organ.id === value)
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ""
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

export interface PlateCopy {
  binomial: string | null
  nameLine: string
  lines: string[]
  caption: string
  scaleNote: string
  views: PlateSlotId[]
}

function hypothesisSuffix(nameKind: NameKind | undefined): string {
  switch (nameKind) {
    case "aggregate":
      return " agg., field hypothesis"
    case "hybrid":
    case "species":
    case undefined:
      return ", field hypothesis"
    default: {
      const exhaustive: never = nameKind
      return exhaustive
    }
  }
}

export function plateCopy(input: {
  scientificName: string | null
  nameKind?: NameKind
  nameState: PlateNameState
  present: Record<PlateSlotId, boolean>
  specifics: PlateSpecifics
  lengthCm: number | null
  widthCm: number | null
}): PlateCopy {
  let binomial: string | null = null
  let nameLine = "Name not set"
  if (input.nameState === "unidentified") nameLine = "Unidentified"
  if (input.nameState === "hypothesis" && input.scientificName) {
    binomial = input.scientificName
    nameLine = `${input.scientificName}${hypothesisSuffix(input.nameKind)}`
  }

  const present = PLATE_SLOTS.filter((slot) => input.present[slot.id])
  const absent = PLATE_SLOTS.filter((slot) => !input.present[slot.id])
  const lines: string[] = []
  lines.push(
    present.length > 0
      ? `Views traced: ${joinList(present.map((slot) => `${slot.letter} ${slot.label}`))}.`
      : "No view was photographed.",
  )
  if (absent.length > 0) {
    lines.push(`Not photographed: ${joinList(absent.map((slot) => `${slot.letter} ${slot.label}`))}.`)
  }

  const requested = input.specifics.organs.flatMap((id) => {
    const organ = PLATE_ORGANS.find((item) => item.id === id)
    return organ ? [organ] : []
  })
  if (requested.length > 0) {
    const missing = requested.filter((organ) => !input.present[organ.slot])
    const filled = requested.filter((organ) => input.present[organ.slot])
    if (filled.length > 0) {
      lines.push(`Organs requested: ${joinList(filled.map((organ) => organ.label))}.`)
    }
    if (missing.length > 0) {
      lines.push(`Requested and not photographed: ${joinList(missing.map((organ) => organ.label))}.`)
    }
  }

  const scaleNote = input.specifics.scale.trim() || "Scale not stated."
  lines.push(`Scale: ${scaleNote}`)

  const measures: string[] = []
  if (input.lengthCm && input.widthCm) {
    measures.push(`lamina ${input.lengthCm} by ${input.widthCm} cm`)
  } else if (input.lengthCm) {
    measures.push(`lamina length ${input.lengthCm} cm`)
  } else if (input.widthCm) {
    measures.push(`lamina width ${input.widthCm} cm`)
  }
  if (input.specifics.measurements.trim()) measures.push(input.specifics.measurements.trim())
  if (measures.length > 0) lines.push(`Measurements: ${joinList(measures)}.`)

  if (input.specifics.pubescence.trim()) lines.push(`Pubescence: ${input.specifics.pubescence.trim()}.`)
  if (input.specifics.stigmas.trim()) lines.push(`Stigmas: ${input.specifics.stigmas.trim()}.`)
  if (input.specifics.chambers.trim()) lines.push(`Capsule chambers: ${input.specifics.chambers.trim()}.`)

  return {
    binomial,
    nameLine,
    lines,
    caption: [nameLine, ...lines].join("\n"),
    scaleNote,
    views: present.map((slot) => slot.id),
  }
}

export interface IllustrationPlate {
  dataUrl: string | null
  dropped: boolean
  mode: PlateMode
  views: PlateSlotId[]
  caption: string
  scaleNote: string
  organsRequested: PlateOrganId[]
  measurements: string
  pubescence: string
  stigmas: string
  chambers: string
}
