import { binomialKey, hybridMarked, lookupShouldRun } from "./gbif"
import type { NameKind } from "./taxa"

const SEARCH = "https://api.checklistbank.org/dataset"

export const POWO_DATASET = 2000
export const WFO_DATASET = 2004

const INFRA_RANKS = ["subspecies", "variety", "form", "subvariety", "subform"] as const

type InfraRank = (typeof INFRA_RANKS)[number]

export type ClassRank = "family" | "genus" | "species" | InfraRank

export interface ClassNode {
  rank: ClassRank
  name: string
}

export interface ChecklistPlacement {
  id: string
  scientificName: string
  rank: string
  remarks: string | null
}

export interface ChecklistHit {
  classification: { name: string; rank: string }[]
  id: string
  status: string
  scientificName: string
  rank: string
  remarks: string | null
  accepted: ChecklistPlacement | null
}

export type SourceId = "powo" | "wfo"

export interface SourceOutcome {
  source: SourceId
  state: "shown" | "none" | "skipped"
  detail: string
  acceptedName: string | null
  acceptedRank: string | null
  statusLabel: string | null
  tree: ClassNode[]
  portalUrl: string | null
  recordUrl: string | null
  geographicNote: string | null
}

export type BackboneOutcome =
  | { state: "skipped"; detail: string; powo: SourceOutcome; wfo: SourceOutcome }
  | { state: "ready"; powo: SourceOutcome; wfo: SourceOutcome }

const BINOMIAL = /^[A-Z][A-Za-z-]+ (× )?[a-z][a-z-]+$/
const INFRASPECIFIC = /^[A-Z][A-Za-z-]+ (× )?[a-z][a-z-]+ (subsp\.|var\.|f\.|subvar\.|subf\.) [a-z][a-z-]+$/
const NOT_GEOGRAPHIC = /^(available|illegitimate|invalid|rejected|unpublished)$/i

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function datasetKey(source: SourceId): number {
  switch (source) {
    case "powo":
      return POWO_DATASET
    case "wfo":
      return WFO_DATASET
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

export function checklistQueryName(sheetName: string): string {
  return sheetName
    .trim()
    .replace(/\s+x\s+/i, " × ")
    .replace(/×\s*/g, "× ")
    .replace(/\s+/g, " ")
    .trim()
}

export function isCleanBinomial(name: string): boolean {
  return BINOMIAL.test(name.trim())
}

export function isInfraspecificName(name: string): boolean {
  return INFRASPECIFIC.test(name.trim())
}

function readPlacement(value: unknown): ChecklistPlacement | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const name = row.name
  if (!name || typeof name !== "object") return null
  const scientificName = readString((name as Record<string, unknown>).scientificName)
  const rank = readString((name as Record<string, unknown>).rank)
  const id = readString(row.id)
  if (!scientificName || !rank || !id) return null
  return {
    id,
    scientificName,
    rank,
    remarks: readString(row.remarks) ?? null,
  }
}

function readHit(value: unknown): ChecklistHit | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  const usage = row.usage
  if (!usage || typeof usage !== "object") return null
  const placed = readPlacement(usage)
  if (!placed) return null
  const usageRow = usage as Record<string, unknown>
  const status = readString(usageRow.status)
  if (!status) return null
  const rawClass = Array.isArray(row.classification) ? row.classification : []
  const classification = rawClass.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const name = readString((item as Record<string, unknown>).name)
    const rank = readString((item as Record<string, unknown>).rank)
    if (!name || !rank) return []
    return [{ name, rank }]
  })
  const acceptedRaw = usageRow.accepted
  return {
    classification,
    id: placed.id,
    status,
    scientificName: placed.scientificName,
    rank: placed.rank,
    remarks: placed.remarks,
    accepted: acceptedRaw ? readPlacement(acceptedRaw) : null,
  }
}

export function readChecklistHits(value: unknown): ChecklistHit[] | null {
  if (!value || typeof value !== "object") return null
  const row = value as { result?: unknown; total?: unknown }
  if (!Array.isArray(row.result)) {
    return row.total === 0 ? [] : null
  }
  return row.result.flatMap((item) => {
    const hit = readHit(item)
    return hit ? [hit] : []
  })
}

function stays(kind: NameKind | undefined): string {
  switch (kind) {
    case "hybrid":
      return "The sheet name stays. The hybrid was not changed. This is not a new species."
    case "aggregate":
      return "The sheet name stays. The aggregate was not changed. This is not a new species."
    case "species":
    case undefined:
      return "The sheet name stays. This is not a new species."
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function skippedDetail(source: SourceId): string {
  switch (source) {
    case "powo":
      return "The Plants of the World Online check did not run. The sheet name stays."
    case "wfo":
      return "The World Flora Online check did not run. The sheet name stays."
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

function noneDetail(source: SourceId, kind: NameKind | undefined): string {
  const list = source === "powo" ? "The World Checklist of Vascular Plants" : "The World Flora Online Plant List"
  switch (kind) {
    case "hybrid":
      return `${list} returned no exact placement for this hybrid. The sheet name stays.`
    case "aggregate":
      return `${list} returned no exact placement for this aggregate. The sheet name stays.`
    case "species":
    case undefined:
      return `${list} returned no exact placement for the sheet name. The sheet name stays.`
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function shownDetail(input: {
  kind: NameKind | undefined
  status: string
  same: boolean
  speciesShown: boolean
}): string {
  const tail = stays(input.kind)
  if (!input.speciesShown) {
    return `This list did not return a species for the accepted record. ${tail}`
  }
  if (input.status === "synonym") {
    return `This list treats the sheet name as a synonym. ${tail}`
  }
  if (input.same) {
    switch (input.kind) {
      case "hybrid":
        return `This list accepts this hybrid. ${tail}`
      case "aggregate":
        return `This list accepts this aggregate name. ${tail}`
      case "species":
      case undefined:
        return `This list accepts the sheet name. ${tail}`
      default: {
        const exhaustive: never = input.kind
        return exhaustive
      }
    }
  }
  switch (input.kind) {
    case "hybrid":
      return `This list did not return this hybrid as the accepted name. ${tail}`
    case "aggregate":
      return `This list did not turn the aggregate into another species. ${tail}`
    case "species":
    case undefined:
      return `The accepted name on this list differs from the sheet name. ${tail}`
    default: {
      const exhaustive: never = input.kind
      return exhaustive
    }
  }
}

function safeId(id: string): string | null {
  return /^[\w:.-]+$/.test(id) ? id : null
}

function portalUrl(source: SourceId, id: string): string | null {
  const safe = safeId(id)
  if (!safe) return null
  switch (source) {
    case "powo":
      return safe.startsWith("urn:lsid:ipni.org:names:") ? `https://powo.science.kew.org/taxon/${safe}` : null
    case "wfo": {
      const bare = safe.match(/^(wfo-\d+)/)?.[1]
      return bare ? `https://www.worldfloraonline.org/taxon/${bare}` : null
    }
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

function recordUrl(source: SourceId, id: string): string | null {
  const safe = safeId(id)
  if (!safe) return null
  return `https://api.checklistbank.org/dataset/${datasetKey(source)}/nameusage/${safe}`
}

function geographicRemark(remarks: string | null, acceptedName: string): string | null {
  if (!remarks) return null
  const text = remarks.trim()
  if (!text || text.length > 240 || NOT_GEOGRAPHIC.test(text)) return null
  if (!isCleanBinomial(acceptedName) && !isInfraspecificName(acceptedName)) return null
  return text
}

function firstRank(hit: ChecklistHit, rank: string, accept: (name: string) => boolean): string | null {
  const found = hit.classification.find((item) => item.rank === rank && accept(item.name))
  return found?.name ?? null
}

function speciesNode(hit: ChecklistHit, acceptedName: string): string | null {
  const species = hit.classification.filter((item) => item.rank === "species" && isCleanBinomial(item.name))
  if (isCleanBinomial(acceptedName)) {
    return species.find((item) => item.name === acceptedName)?.name ?? acceptedName
  }
  if (isInfraspecificName(acceptedName)) {
    const binomial = acceptedName.split(" ").slice(0, 2).join(" ")
    return species.find((item) => item.name === binomial)?.name ?? (isCleanBinomial(binomial) ? binomial : null)
  }
  return null
}

function infraRank(rank: string): InfraRank | null {
  return INFRA_RANKS.find((item) => item === rank) ?? null
}

function buildTree(hit: ChecklistHit, acceptedName: string, acceptedRank: string): ClassNode[] {
  const tree: ClassNode[] = []
  const family = firstRank(hit, "family", (name) => /^[A-Z][a-z]+$/.test(name))
  if (family) tree.push({ rank: "family", name: family })
  const genus = firstRank(hit, "genus", (name) => /^[A-Z][A-Za-z-]+$/.test(name))
  const species = speciesNode(hit, acceptedName)
  const genusName = genus ?? (species ? species.split(" ")[0] : null)
  if (genusName) tree.push({ rank: "genus", name: genusName })
  if (species) tree.push({ rank: "species", name: species })
  const infra = infraRank(acceptedRank)
  if (infra && isInfraspecificName(acceptedName)) {
    tree.push({ rank: infra, name: acceptedName })
  }
  return tree
}

function blank(source: SourceId, state: "none" | "skipped", detail: string): SourceOutcome {
  return {
    source,
    state,
    detail,
    acceptedName: null,
    acceptedRank: null,
    statusLabel: null,
    tree: [],
    portalUrl: null,
    recordUrl: null,
    geographicNote: null,
  }
}

function nameMatches(hit: ChecklistHit, sheetName: string, kind: NameKind | undefined): boolean {
  if (binomialKey(hit.scientificName) !== binomialKey(sheetName)) return false
  if (kind === "hybrid" && !hybridMarked(hit.scientificName)) return false
  return true
}

function targetOf(hit: ChecklistHit): ChecklistPlacement | null {
  if (hit.status === "synonym") return hit.accepted
  if (hit.status === "accepted" || hit.status === "provisionally accepted") {
    return {
      id: hit.id,
      scientificName: hit.scientificName,
      rank: hit.rank,
      remarks: hit.remarks,
    }
  }
  return null
}

function statusLabel(status: string): string | null {
  switch (status) {
    case "accepted":
      return "accepted"
    case "provisionally accepted":
      return "provisionally accepted"
    case "synonym":
      return "synonym"
    default:
      return null
  }
}

export function interpretSource(input: {
  source: SourceId
  sheetName: string
  nameKind: NameKind | undefined
  hits: ChecklistHit[]
}): SourceOutcome {
  const usable = input.hits.filter((hit) => nameMatches(hit, input.sheetName, input.nameKind) && targetOf(hit))
  const accepted = usable.filter((hit) => hit.status === "accepted" || hit.status === "provisionally accepted")
  const synonyms = usable.filter((hit) => hit.status === "synonym" && hit.accepted)
  const pool = accepted.length > 0 ? accepted : synonyms
  if (pool.length === 0) return blank(input.source, "none", noneDetail(input.source, input.nameKind))
  const targets = new Set(pool.map((hit) => targetOf(hit)?.scientificName).filter((name): name is string => !!name))
  if (targets.size !== 1) return blank(input.source, "none", noneDetail(input.source, input.nameKind))
  const hit = pool[0]
  const target = targetOf(hit)
  const label = statusLabel(hit.status)
  if (!target || !label) return blank(input.source, "none", noneDetail(input.source, input.nameKind))
  const tree = buildTree(hit, target.scientificName, target.rank)
  const speciesShown = tree.some((node) => node.rank === "species")
  const same = binomialKey(target.scientificName) === binomialKey(input.sheetName)
  return {
    source: input.source,
    state: "shown",
    detail: shownDetail({ kind: input.nameKind, status: hit.status, same, speciesShown }),
    acceptedName: speciesShown ? target.scientificName : null,
    acceptedRank: target.rank,
    statusLabel: label,
    tree,
    portalUrl: portalUrl(input.source, target.id),
    recordUrl: recordUrl(input.source, target.id),
    geographicNote: input.source === "powo" ? geographicRemark(target.remarks, target.scientificName) : null,
  }
}

async function readJson(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>
}

async function searchSource(
  source: SourceId,
  sheetName: string,
  nameKind: NameKind | undefined,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<SourceOutcome> {
  try {
    const url = new URL(`${SEARCH}/${datasetKey(source)}/nameusage/search`)
    url.searchParams.set("q", checklistQueryName(sheetName))
    url.searchParams.set("type", "EXACT")
    url.searchParams.set("limit", "8")
    const response = await fetchImpl(url, { signal, headers: { Accept: "application/json" } })
    if (!response.ok) return blank(source, "skipped", skippedDetail(source))
    const hits = readChecklistHits(await readJson(response))
    if (!hits) return blank(source, "skipped", skippedDetail(source))
    return interpretSource({ source, sheetName, nameKind, hits })
  } catch {
    return blank(source, "skipped", skippedDetail(source))
  }
}

export async function lookupBackbone(
  sheetName: string,
  nameKind: NameKind | undefined,
  fetchImpl: typeof fetch = fetch,
  onLine?: boolean,
  signal?: AbortSignal,
): Promise<BackboneOutcome> {
  const online = onLine ?? (typeof navigator === "undefined" ? undefined : navigator.onLine)
  const skippedPowo = blank("powo", "skipped", skippedDetail("powo"))
  const skippedWfo = blank("wfo", "skipped", skippedDetail("wfo"))
  if (!lookupShouldRun(online)) {
    return {
      state: "skipped",
      detail: "The backbone check did not run. The sheet name stays.",
      powo: skippedPowo,
      wfo: skippedWfo,
    }
  }
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), 8000)
  const requestSignal = signal ? AbortSignal.any([timeout.signal, signal]) : timeout.signal
  try {
    const [powo, wfo] = await Promise.all([
      searchSource("powo", sheetName, nameKind, fetchImpl, requestSignal),
      searchSource("wfo", sheetName, nameKind, fetchImpl, requestSignal),
    ])
    if (powo.state === "skipped" && wfo.state === "skipped") {
      return {
        state: "skipped",
        detail: "The backbone check did not run. The sheet name stays.",
        powo,
        wfo,
      }
    }
    return { state: "ready", powo, wfo }
  } finally {
    clearTimeout(timer)
  }
}
