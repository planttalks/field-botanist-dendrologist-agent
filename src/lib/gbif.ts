import type { NameKind } from "./taxa"

const MATCH_URL = "https://api.gbif.org/v1/species/match"
const SPECIES_URL = "https://api.gbif.org/v1/species/"

const NAME_RANKS: Record<string, string> = {
  SPECIES: "species",
  HYBRID: "hybrid",
  SUBSPECIES: "subspecies",
  VARIETY: "variety",
  FORM: "form",
}

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: "accepted",
  SYNONYM: "synonym",
  DOUBTFUL: "doubtful",
  HOMOTYPIC_SYNONYM: "homotypic synonym",
  HETEROTYPIC_SYNONYM: "heterotypic synonym",
  PROPARTE_SYNONYM: "pro parte synonym",
  MISAPPLIED: "misapplied",
}

export interface GbifMatch {
  usageKey?: number
  acceptedUsageKey?: number
  scientificName?: string
  canonicalName?: string
  rank?: string
  status?: string
  taxonomicStatus?: string
  matchType?: string
  kingdom?: string
  key?: number
}

export type GbifOutcome =
  | { state: "skipped" }
  | { state: "none" }
  | { state: "kept"; detail: string }
  | {
      state: "shown"
      acceptedName: string
      rankLabel: string
      statusLabel: string
      url: string
      note: string
    }

export function lookupShouldRun(onLine: boolean | undefined): boolean {
  return onLine !== false
}

export function binomialKey(name: string): string {
  const parts = name
    .replace(/×/g, " ")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
  if (parts[1] === "x") return `${parts[0]} ${parts[2] ?? ""}`.trim()
  return parts.slice(0, 2).join(" ")
}

export function hybridMarked(name: string): boolean {
  if (/×/.test(name)) return true
  return /^[A-Z][A-Za-z-]+\s+x\s+[a-z]/i.test(name.trim())
}

export function latinWithoutAuthor(scientificName: string, canonicalName: string | undefined): string | null {
  const trimmed = scientificName.trim()
  const times = trimmed.match(/^([A-Z][A-Za-z-]+)\s+×\s*([a-z][a-z-]+)/)
  if (times) return `${times[1]} × ${times[2]}`
  const spelled = trimmed.match(/^([A-Z][A-Za-z-]+)\s+x\s+([a-z][a-z-]+)/i)
  if (spelled) return `${spelled[1]} × ${spelled[2]}`
  const canonical = canonicalName?.trim()
  if (canonical && /^[A-Z][A-Za-z-]+ [a-z][a-z-]+$/.test(canonical)) return canonical
  const plain = trimmed.match(/^([A-Z][A-Za-z-]+)\s+([a-z][a-z-]+)/)
  if (plain) return `${plain[1]} ${plain[2]}`
  return null
}

function statusOf(record: GbifMatch): string | undefined {
  return record.taxonomicStatus ?? record.status
}

function isSynonym(status: string | undefined): boolean {
  if (!status) return false
  return status !== "ACCEPTED" && status !== "DOUBTFUL" && status in STATUS_LABELS
}

function noteFor(kind: NameKind | undefined): string {
  switch (kind) {
    case "hybrid":
      return "The sheet name stays. This hybrid was not turned into another species."
    case "aggregate":
      return "The sheet name stays. This aggregate was not turned into another species."
    case "species":
    case undefined:
      return "The sheet name stays."
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function keptDetail(kind: NameKind): string {
  switch (kind) {
    case "hybrid":
      return "GBIF did not return this hybrid. The sheet name stays."
    case "aggregate":
      return "GBIF did not return this aggregate. The sheet name stays."
    case "species":
      return "GBIF returned a different name. It was not applied. The sheet name stays."
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function allowShown(kind: NameKind | undefined, same: boolean, marked: boolean): boolean {
  switch (kind) {
    case "hybrid":
      return same && marked
    case "aggregate":
      return same
    case "species":
    case undefined:
      return true
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

export function readGbifRecord(value: unknown): GbifMatch | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  return {
    usageKey: readNumber(row.usageKey),
    acceptedUsageKey: readNumber(row.acceptedUsageKey),
    key: readNumber(row.key),
    scientificName: readString(row.scientificName),
    canonicalName: readString(row.canonicalName),
    rank: readString(row.rank),
    status: readString(row.status),
    taxonomicStatus: readString(row.taxonomicStatus),
    matchType: readString(row.matchType),
    kingdom: readString(row.kingdom),
  }
}

function displayRecord(match: GbifMatch, accepted: GbifMatch | null): GbifMatch | null {
  const status = statusOf(match)
  if (isSynonym(status)) return accepted
  return match
}

export function interpretGbif(input: {
  sheetName: string
  nameKind: NameKind | undefined
  match: GbifMatch
  accepted: GbifMatch | null
}): GbifOutcome {
  if (input.match.matchType !== "EXACT" || !input.match.usageKey) return { state: "none" }
  if (input.match.kingdom && input.match.kingdom !== "Plantae") return { state: "none" }

  const status = statusOf(input.match)
  if (isSynonym(status) && !input.accepted) return { state: "none" }

  const record = displayRecord(input.match, input.accepted)
  if (!record?.scientificName) return { state: "none" }
  const key = record.key ?? record.usageKey
  const rank = record.rank
  const recordStatus = statusOf(record)
  if (!key || !rank || !recordStatus) return { state: "none" }
  if (record.kingdom && record.kingdom !== "Plantae") return { state: "none" }

  const acceptedName = latinWithoutAuthor(record.scientificName, record.canonicalName)
  const rankLabel = NAME_RANKS[rank]
  const statusLabel = STATUS_LABELS[recordStatus]
  if (!acceptedName || !rankLabel || !statusLabel) return { state: "none" }

  const kind = input.nameKind
  const same = binomialKey(acceptedName) === binomialKey(input.sheetName)
  const marked = hybridMarked(record.scientificName) || rank === "HYBRID"
  if (!allowShown(kind, same, marked)) {
    if (kind === "hybrid" || kind === "aggregate") return { state: "kept", detail: keptDetail(kind) }
    return { state: "none" }
  }

  return {
    state: "shown",
    acceptedName,
    rankLabel,
    statusLabel,
    url: `https://www.gbif.org/species/${key}`,
    note: noteFor(kind),
  }
}

async function readJson(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>
}

export async function lookupGbifName(
  sheetName: string,
  nameKind: NameKind | undefined,
  fetchImpl: typeof fetch = fetch,
  onLine?: boolean,
  signal?: AbortSignal,
): Promise<GbifOutcome> {
  const online = onLine ?? (typeof navigator === "undefined" ? undefined : navigator.onLine)
  if (!lookupShouldRun(online)) return { state: "skipped" }
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), 8000)
  const requestSignal = signal ? AbortSignal.any([timeout.signal, signal]) : timeout.signal
  try {
    const url = new URL(MATCH_URL)
    url.searchParams.set("name", sheetName)
    url.searchParams.set("kingdom", "Plantae")
    const response = await fetchImpl(url, { signal: requestSignal })
    if (!response.ok) return { state: "skipped" }
    const match = readGbifRecord(await readJson(response))
    if (!match) return { state: "skipped" }
    let accepted: GbifMatch | null = null
    if (isSynonym(statusOf(match))) {
      if (!match.acceptedUsageKey) return { state: "none" }
      const acceptedResponse = await fetchImpl(`${SPECIES_URL}${match.acceptedUsageKey}`, { signal: requestSignal })
      if (!acceptedResponse.ok) return { state: "skipped" }
      accepted = readGbifRecord(await readJson(acceptedResponse))
      if (!accepted) return { state: "skipped" }
    }
    return interpretGbif({ sheetName, nameKind, match, accepted })
  } catch {
    return { state: "skipped" }
  } finally {
    clearTimeout(timer)
  }
}
