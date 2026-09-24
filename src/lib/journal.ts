import type { Identification } from "./identify"
import type { IllustrationPlate } from "./plate"
import { regionLabel, type Region } from "./regions"
import { taxonById, type NameKind } from "./taxa"
import type { Observation } from "./types"

export const JOURNAL_KEY = "field-sheet.v1"
const MAX_RECORDS = 40

export interface StoredCandidate {
  taxonId: string
  scientificName: string
  commonName: string
  fit: number
}

export interface Specimen {
  id: string
  createdAt: string
  locality: string
  region: Region | null
  latitude: number | null
  longitude: number | null
  elevationM: number | null
  habitat: string
  notes: string
  photoDataUrl: string | null
  photoDropped: boolean
  qualityWarnings: string[]
  observation: Observation
  scientificName: string | null
  family: string | null
  taxonId: string | null
  confidence: number
  reviewScore: number
  reviewLabel: string
  reviewText: string
  candidates: StoredCandidate[]
  illustration?: IllustrationPlate | null
}

export class JournalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "JournalError"
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function loadJournal(): Specimen[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(JOURNAL_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is Specimen => {
      return !!item && typeof item === "object" && typeof (item as Specimen).id === "string"
    })
  } catch {
    throw new JournalError("The journal in this browser could not be read.")
  }
}

function writeAll(records: Specimen[]) {
  if (!canUseStorage()) {
    throw new JournalError("This browser will not store a journal.")
  }
  try {
    window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(records))
    window.dispatchEvent(new Event("field-sheet-journal"))
  } catch {
    throw new JournalError(
      "The browser refused to store this record. Export what you have, delete an old photo, and try again.",
    )
  }
}

export interface SaveInput {
  locality: string
  region: Region | null
  latitude: number | null
  longitude: number | null
  elevationM: number | null
  habitat: string
  notes: string
  photoDataUrl: string | null
  qualityWarnings: string[]
  observation: Observation
  identification: Identification
  taxonId: string | null
  illustration: IllustrationPlate | null
}

export function saveSpecimen(input: SaveInput): Specimen {
  const existing = loadJournal()
  if (existing.length >= MAX_RECORDS) {
    throw new JournalError(
      `This browser already holds ${MAX_RECORDS} records. Export the journal and delete one before saving another.`,
    )
  }

  const chosen = input.taxonId
    ? input.identification.candidates.find((candidate) => candidate.taxon.id === input.taxonId)
    : undefined
  let photoDataUrl = input.photoDataUrl
  let photoDropped = false
  if (photoDataUrl && photoDataUrl.length > 500_000) {
    photoDataUrl = null
    photoDropped = true
  }

  const specimen: Specimen = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    locality: input.locality.trim(),
    region: input.region,
    latitude: input.latitude,
    longitude: input.longitude,
    elevationM: input.elevationM,
    habitat: input.habitat.trim(),
    notes: input.notes.trim(),
    photoDataUrl,
    photoDropped,
    qualityWarnings: input.qualityWarnings,
    observation: input.observation,
    scientificName: chosen?.taxon.scientificName ?? null,
    family: chosen?.taxon.family ?? null,
    taxonId: chosen?.taxon.id ?? null,
    confidence: input.identification.confidence,
    reviewScore: input.identification.reviewScore,
    reviewLabel: input.identification.reviewLabel,
    reviewText: input.identification.reviewText,
    candidates: input.identification.candidates.slice(0, 5).map((candidate) => ({
      taxonId: candidate.taxon.id,
      scientificName: candidate.taxon.scientificName,
      commonName: candidate.taxon.commonNames[0] ?? "",
      fit: candidate.max > 0 ? candidate.raw / candidate.max : 0,
    })),
    illustration: fitIllustration(input.illustration),
  }

  writeAll([specimen, ...existing])
  return specimen
}

export function deleteSpecimen(id: string) {
  const next = loadJournal().filter((record) => record.id !== id)
  writeAll(next)
}

function fitIllustration(plate: IllustrationPlate | null): IllustrationPlate | null {
  if (!plate?.dataUrl) return plate
  if (plate.dataUrl.length <= 500_000) return plate
  return { ...plate, dataUrl: null, dropped: true }
}

function csvCell(value: string | number | null): string {
  const text = value === null || value === undefined ? "" : String(value)
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

function qualifierFor(kind: NameKind | undefined): string {
  switch (kind) {
    case "aggregate":
      return "agg."
    case "hybrid":
    case "species":
    case undefined:
      return ""
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function locationRemarks(record: Specimen): string {
  const bits: string[] = []
  if (record.region) bits.push(`Coarse region: ${regionLabel(record.region)}.`)
  if (record.latitude !== null && record.longitude !== null) {
    bits.push("Coordinates came from the phone. Uncertainty was not recorded, so none is given.")
  }
  return bits.join(" ")
}

export function specimenToCsv(records: Specimen[]): string {
  const headers = [
    "occurrenceID",
    "basisOfRecord",
    "eventDate",
    "eventRemarks",
    "decimalLatitude",
    "decimalLongitude",
    "geodeticDatum",
    "minimumElevationInMeters",
    "locality",
    "locationRemarks",
    "habitat",
    "scientificName",
    "taxonRank",
    "identificationQualifier",
    "identificationVerificationStatus",
    "identificationRemarks",
    "organismRemarks",
  ]
  const lines = [headers.join(",")]
  for (const record of records) {
    const taxon = record.taxonId ? taxonById(record.taxonId) : undefined
    const named = Boolean(record.scientificName)
    const remarks = [
      "Field hypothesis from a character worksheet. Not a determination and not a new species.",
      record.reviewText,
    ]
      .filter(Boolean)
      .join(" ")
    lines.push(
      [
        record.id,
        "HumanObservation",
        record.createdAt,
        "eventDate is when this sheet was saved in the browser. It may be later than the observation.",
        record.latitude,
        record.longitude,
        record.latitude !== null && record.longitude !== null ? "WGS84" : "",
        record.elevationM,
        record.locality,
        locationRemarks(record),
        record.habitat,
        record.scientificName ?? "",
        named ? "species" : "",
        named ? qualifierFor(taxon?.nameKind) : "",
        "unverified",
        remarks,
        record.notes,
      ]
        .map((value) => csvCell(value))
        .join(","),
    )
  }
  return `\uFEFF${lines.join("\n")}`
}

export function specimenToJson(records: Specimen[]): string {
  return JSON.stringify(records, null, 2)
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}
