import {
  CHARACTER_FIELDS,
  CHARACTER_PROMPTS,
  isSkipped,
  phraseFor,
  type CharacterKey,
  type Observation,
} from "./types"
import { regionLabel, type Region } from "./regions"
import { displayName, TAXA, type Taxon } from "./taxa"

const WEIGHTS: Record<CharacterKey, number> = {
  habit: 3.2,
  arrangement: 2.8,
  leafType: 2.8,
  fruit: 2.6,
  fascicle: 2.4,
  exudate: 2.2,
  reproductive: 2,
  shape: 1.8,
  roots: 1.6,
  margin: 1.6,
  bark: 1.5,
  scent: 1.4,
  lobes: 1.4,
  venation: 1.3,
  petiole: 1.2,
  texture: 1.1,
  buds: 1,
  site: 0.8,
}

const CHARACTER_KEYS = Object.keys(CHARACTER_FIELDS) as CharacterKey[]

export type GeoFlag = "native" | "planted" | "outside" | "unknown"

export interface Candidate {
  taxon: Taxon
  raw: number
  max: number
  rankScore: number
  hits: string[]
  misses: string[]
}

export interface SplitQuestion {
  key: CharacterKey
  prompt: string
  options: { value: string; label: string }[]
}

export interface Identification {
  candidates: Candidate[]
  confidence: number
  band: "low" | "fair" | "strong"
  answered: number
  thin: boolean
  noMatch: boolean
  reviewScore: number
  reviewLabel: string
  reviewText: string
  geoFlag: GeoFlag
  split: SplitQuestion | null
  warnings: string[]
  invasives: string[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function joinAnd(items: string[]): string {
  if (items.length === 0) return ""
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

type Mark = "skip" | "hit" | "miss" | "soft-miss"

function scoreMark(key: CharacterKey, value: string, taxon: Taxon): Mark {
  if (isSkipped(value)) return "skip"
  const allowed = taxon.characters[key]

  if (key === "fascicle") {
    const needle = value === "two" || value === "three" || value === "flat-spray"
    if (!allowed || allowed.length === 0) return needle ? "miss" : "skip"
    return allowed.includes(value) ? "hit" : "miss"
  }

  if (key === "roots") {
    if (!allowed || allowed.length === 0) {
      return value === "prop" || value === "exposed" ? "soft-miss" : "skip"
    }
    return allowed.includes(value) ? "hit" : "miss"
  }

  if (!allowed || allowed.length === 0) return "skip"
  if (allowed.includes(value)) return "hit"
  if (key === "site") return "soft-miss"
  return "miss"
}

function geoFlagFor(taxon: Taxon, region: Region | null): GeoFlag {
  if (!region) return "unknown"
  if (taxon.nativeRegions.includes(region)) return "native"
  if (taxon.plantedRegions.includes(region)) return "planted"
  return "outside"
}

function confidenceOf(top: Candidate, second: Candidate | undefined, answered: number): number {
  if (top.max <= 0) return 0.12
  const fit = clamp((top.raw / top.max + 1) / 2, 0, 1)
  const runner = second?.raw ?? top.raw - top.max
  const margin = clamp((top.raw - runner) / top.max, 0, 1)
  let confidence = 0.18 + 0.5 * fit + 0.32 * margin
  if (answered < 3) confidence = Math.min(confidence, 0.46)
  if (top.misses.length >= 2) confidence = Math.min(confidence, 0.58)
  return clamp(confidence, 0.08, 0.9)
}

function bandFor(confidence: number): Identification["band"] {
  if (confidence >= 0.72) return "strong"
  if (confidence >= 0.48) return "fair"
  return "low"
}

function reviewLabelFor(score: number): string {
  if (score >= 56) return "Specialist queue"
  if (score >= 25) return "Compare similar species"
  return "Routine check"
}

function splitQuestion(observation: Observation, top: Candidate[]): SplitQuestion | null {
  if (top.length < 2) return null
  let bestKey: CharacterKey | null = null
  let bestScore = 0

  for (const key of CHARACTER_KEYS) {
    if (!isSkipped(observation[key])) continue
    const specified = top
      .map((candidate) => candidate.taxon.characters[key])
      .filter((values): values is string[] => !!values && values.length > 0)
    if (specified.length < 2) continue
    const signatures = new Set(specified.map((values) => [...values].sort().join("|")))
    if (signatures.size < 2) continue
    const score = signatures.size * specified.length
    if (score > bestScore) {
      bestScore = score
      bestKey = key
    }
  }

  if (!bestKey) return null
  const used = new Set<string>()
  for (const candidate of top) {
    for (const value of candidate.taxon.characters[bestKey] ?? []) used.add(value)
  }
  const options = CHARACTER_FIELDS[bestKey].filter(
    (choice) => choice.value === "not-seen" || choice.value === "not-checked" || choice.value === "unknown" || used.has(choice.value),
  )
  return {
    key: bestKey,
    prompt: CHARACTER_PROMPTS[bestKey],
    options: options.map((choice) => ({ value: choice.value, label: choice.label })),
  }
}

function reviewText(top: Candidate | undefined, region: Region | null, locality: string): string {
  if (!top || top.raw <= 0) {
    return "Nothing on this sheet fits the characters you marked. Save the record unidentified and compare it with a local flora."
  }
  const name = displayName(top.taxon)
  const fits = joinAnd(top.hits.slice(0, 4))
  const clashes = joinAnd(top.misses.slice(0, 3))
  const where = locality.trim() || regionLabel(region)
  let text = `Most similar name on this sheet: ${name}.`
  text += fits ? ` Traits that fit: ${fits}.` : " No marked character stands out as a fit yet."
  text += clashes
    ? ` Marked traits that do not fit: ${clashes}.`
    : " No marked character clashes with this name."
  text += ` Known range: ${top.taxon.rangeText} This record: ${where}.`
  return text
}

function warningsFrom(candidates: Candidate[]): { warnings: string[]; invasives: string[] } {
  const warnings: string[] = []
  const invasives: string[] = []
  for (const candidate of candidates.slice(0, 3)) {
    if (candidate.taxon.toxic && !warnings.includes(candidate.taxon.toxic)) {
      warnings.push(candidate.taxon.toxic)
    }
    if (candidate.taxon.invasive && !invasives.includes(candidate.taxon.invasive)) {
      invasives.push(candidate.taxon.invasive)
    }
  }
  return { warnings, invasives }
}

export function identify(observation: Observation, region: Region | null, locality = ""): Identification {
  const answered = CHARACTER_KEYS.filter((key) => !isSkipped(observation[key])).length

  const scored: Candidate[] = TAXA.map((taxon) => {
    let raw = 0
    let max = 0
    const hits: string[] = []
    const misses: string[] = []

    for (const key of CHARACTER_KEYS) {
      const value = observation[key]
      const mark = scoreMark(key, value, taxon)
      if (mark === "skip") continue
      const weight = WEIGHTS[key]
      max += weight
      if (mark === "hit") {
        raw += weight
        hits.push(phraseFor(key, value))
      } else if (mark === "soft-miss") {
        raw -= weight * 0.35
        misses.push(phraseFor(key, value))
      } else {
        raw -= weight * 0.75
        misses.push(phraseFor(key, value))
      }
    }

    let rankScore = raw
    if (region && taxon.nativeRegions.includes(region)) rankScore += 0.15
    else if (region && taxon.plantedRegions.includes(region)) rankScore += 0.05

    return { taxon, raw, max, rankScore, hits, misses }
  })
    .filter((candidate) => candidate.max > 0)
    .sort(
      (a, b) => b.rankScore - a.rankScore || a.taxon.scientificName.localeCompare(b.taxon.scientificName),
    )

  const candidates = scored.slice(0, 5)
  const top = candidates[0]
  const second = candidates[1]
  const noMatch = !top || top.raw <= 0
  const confidence = top ? confidenceOf(top, second, answered) : 0.12
  const band = bandFor(confidence)
  const geoFlag = top && !noMatch ? geoFlagFor(top.taxon, region) : "unknown"
  const thin = answered < 3

  let reviewScore = 0
  if (noMatch) reviewScore += 70
  else {
    if (confidence < 0.45) reviewScore += 28
    else if (confidence < 0.62) reviewScore += 12
    if (second && top.rankScore - second.rankScore < 1.5) reviewScore += 22
    reviewScore += Math.min(21, top.misses.length * 7)
    if (geoFlag === "outside") reviewScore = Math.max(60, reviewScore + 20)
    else if (geoFlag === "planted") reviewScore += 8
  }
  reviewScore = clamp(reviewScore, 0, 100)

  const close = second ? top.rankScore - second.rankScore < 1.5 : false
  const split = !noMatch && (close || thin) ? splitQuestion(observation, candidates.slice(0, 3)) : null
  const { warnings, invasives } = warningsFrom(noMatch ? [] : candidates)

  return {
    candidates: noMatch ? candidates.slice(0, 3) : candidates,
    confidence: noMatch ? Math.min(confidence, 0.35) : confidence,
    band: noMatch ? "low" : band,
    answered,
    thin,
    noMatch,
    reviewScore,
    reviewLabel: reviewLabelFor(reviewScore),
    reviewText: reviewText(noMatch ? undefined : top, region, locality),
    geoFlag,
    split,
    warnings,
    invasives: noMatch ? [] : invasives,
  }
}
