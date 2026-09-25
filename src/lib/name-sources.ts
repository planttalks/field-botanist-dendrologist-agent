import { binomialKey, hybridMarked, lookupShouldRun } from "./gbif"
import type { NameKind } from "./taxa"

export const SOURCE_KEYS = ["ipni", "tropicos", "usda", "tela", "mnhn"] as const

export type SourceKey = (typeof SOURCE_KEYS)[number]

export type SkipReason = "token" | "no-response"

export interface SourceLine {
  source: SourceKey
  state: "shown" | "none" | "skipped"
  acceptedName: string | null
  citation: string | null
  latin: string | null
  note: string | null
  detail: string | null
  reason: SkipReason | null
  href: string | null
}

export interface NameSourceReport {
  lines: SourceLine[]
  note: string
}

const IPNI_SEARCH = "https://www.ipni.org/api/1/search"
const TROPICOS_SEARCH = "https://services.tropicos.org/Name/Search"
const USDA_SEARCH = "https://plantsservices.sc.egov.usda.gov/api/PlantSearch"
const TELA_SEARCH = "https://api.tela-botanica.org/service:eflore:0.1/bdtfx/noms"
const MNHN_SEARCH = "https://taxref.mnhn.fr/api/taxa/search"
const TELA_NAME = /^https:\/\/api\.tela-botanica\.org\/service:eflore:0\.1\/bdtfx\/noms\/\d+$/

const SHEET_NAME = /^[A-Z][A-Za-z-]+(?: ×)? [a-z][a-z-]+$/
const INFRA = /\b(subsp\.|ssp\.|var\.|f\.|subvar\.|forma)\b/i

export function sourceLabel(source: SourceKey): string {
  switch (source) {
    case "ipni":
      return "IPNI"
    case "tropicos":
      return "Tropicos"
    case "usda":
      return "USDA PLANTS"
    case "tela":
      return "Tela Botanica"
    case "mnhn":
      return "MNHN"
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

export function recordLabel(source: SourceKey): string {
  switch (source) {
    case "ipni":
      return "Open the IPNI record"
    case "tropicos":
      return "Open the Tropicos record"
    case "usda":
      return "Open the USDA PLANTS record"
    case "tela":
      return "Open the Tela Botanica record"
    case "mnhn":
      return "Open the MNHN record"
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

export function stayNote(kind: NameKind | undefined): string {
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

export function sheetNameAllowed(name: string): boolean {
  return SHEET_NAME.test(name.trim())
}

function sentence(parts: string[]): string {
  const text = parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(". ")
    .replace(/\.\s*$/, "")
  return `${text}.`
}

export function lineText(line: SourceLine): string {
  const label = sourceLabel(line.source)
  switch (line.state) {
    case "skipped":
      return line.reason === "token"
        ? `${label}. The check did not run. Token required.`
        : `${label}. The check did not run. No response.`
    case "none":
      return sentence([label, line.detail ?? "No matching record was returned"])
    case "shown":
      return sentence([
        label,
        line.acceptedName ? `Accepted name ${line.acceptedName}` : "",
        line.citation ? `${line.source === "usda" ? "Matching name" : "Citation"} ${line.citation}` : "",
        line.note ?? "",
      ])
    default: {
      const exhaustive: never = line.state
      return exhaustive
    }
  }
}

function skipped(source: SourceKey, reason: SkipReason): SourceLine {
  return {
    source,
    state: "skipped",
    acceptedName: null,
    citation: null,
    latin: null,
    note: null,
    detail: null,
    reason,
    href: null,
  }
}

function none(source: SourceKey, detail: string): SourceLine {
  return {
    source,
    state: "none",
    acceptedName: null,
    citation: null,
    latin: null,
    note: null,
    detail,
    reason: null,
    href: null,
  }
}

function shown(input: {
  source: SourceKey
  acceptedName?: string | null
  citation?: string | null
  latin?: string | null
  note?: string | null
  href?: string | null
}): SourceLine {
  return {
    source: input.source,
    state: "shown",
    acceptedName: input.acceptedName ?? null,
    citation: input.citation ?? null,
    latin: input.latin ?? null,
    note: input.note ?? null,
    detail: null,
    reason: null,
    href: input.href ?? null,
  }
}

export function missedLines(reason: SkipReason): SourceLine[] {
  return SOURCE_KEYS.map((source) => skipped(source, reason))
}

function plainName(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function binomialLatin(name: string): string {
  const parts = plainName(name).split(" ")
  if (parts[1] === "×" || parts[1]?.toLowerCase() === "x") return `${parts[0] ?? ""} × ${parts[2] ?? ""}`.trim()
  return parts.slice(0, 2).join(" ")
}

function sameBinomial(name: string, sheetName: string): boolean {
  return binomialKey(plainName(name)) === binomialKey(sheetName)
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function safeHttp(value: string | undefined, allow: (url: URL) => boolean): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return null
    return allow(url) ? url.toString() : null
  } catch {
    return null
  }
}

interface IpniHit {
  name: string
  authors: string | null
  reference: string | null
  rank: string | null
  hybrid: boolean
  inPowo: boolean
  href: string | null
}

function readIpniHit(value: unknown): IpniHit | null {
  const row = readRecord(value)
  if (!row) return null
  const name = readString(row.name)
  if (!name) return null
  const path = readString(row.url)
  const href = path && /^\/n\/[\w-]+$/.test(path) ? `https://www.ipni.org${path}` : null
  return {
    name,
    authors: readString(row.authors) ?? null,
    reference: readString(row.reference) ?? null,
    rank: readString(row.rank) ?? null,
    hybrid: row.hybrid === true || hybridMarked(name),
    inPowo: row.inPowo === true,
    href,
  }
}

export function readIpniHits(value: unknown): IpniHit[] | null {
  const row = readRecord(value)
  if (!row || !Array.isArray(row.results)) return null
  return row.results.flatMap((item) => {
    const hit = readIpniHit(item)
    return hit ? [hit] : []
  })
}

function ipniCitation(hit: IpniHit): string {
  const head = hit.authors ? `${hit.name} ${hit.authors}` : hit.name
  return hit.reference ? `${head}, ${hit.reference}` : head
}

function noneDetail(kind: NameKind | undefined, what: "species" | "hybrid"): string {
  if (kind === "hybrid" || what === "hybrid") return "No hybrid citation matched the sheet name."
  return "No species citation matched the sheet name."
}

export function interpretIpni(sheetName: string, nameKind: NameKind | undefined, payload: unknown): SourceLine {
  const hits = readIpniHits(payload)
  if (!hits) return skipped("ipni", "no-response")
  const species = hits.filter((hit) => hit.rank === "spec." && sameBinomial(hit.name, sheetName) && !INFRA.test(hit.name))
  const pool = nameKind === "hybrid" ? species.filter((hit) => hit.hybrid) : species
  if (pool.length === 0) return none("ipni", noneDetail(nameKind, nameKind === "hybrid" ? "hybrid" : "species"))
  const linked = pool.filter((hit) => hit.inPowo)
  const chosen = linked.length === 1 ? linked[0] : pool.length === 1 ? pool[0] : null
  if (!chosen) {
    return none(
      "ipni",
      nameKind === "hybrid"
        ? "More than one hybrid citation matched. None was chosen."
        : "More than one species citation matched. None was chosen.",
    )
  }
  return shown({
    source: "ipni",
    citation: ipniCitation(chosen),
    latin: chosen.name,
    note: linked.length === 1 && pool.length > 1 ? "This citation is the one IPNI links to Plants of the World Online." : null,
    href: chosen.href,
  })
}

function tropicosToken(payload: unknown): boolean {
  if (!Array.isArray(payload)) return false
  return payload.some((item) => {
    const row = readRecord(item)
    const error = row ? readString(row.Error) : undefined
    return !!error && /not allowed|api key|apikey|unauthorized|token/i.test(error)
  })
}

interface TropicosHit {
  name: string
  citation: string
  href: string | null
}

function readTropicosHit(value: unknown): TropicosHit | null {
  const row = readRecord(value)
  if (!row) return null
  const name = readString(row.ScientificName)
  const withAuthors = readString(row.ScientificNameWithAuthors)
  if (!name && !withAuthors) return null
  const id = typeof row.NameId === "number" && Number.isInteger(row.NameId) ? String(row.NameId) : readString(row.NameId)
  const href = id && /^\d+$/.test(id) ? `https://www.tropicos.org/name/${id}` : null
  return {
    name: name ?? withAuthors ?? "",
    citation: withAuthors ?? name ?? "",
    href,
  }
}

export function interpretTropicos(sheetName: string, payload: unknown, status: number): SourceLine {
  if (tropicosToken(payload) || status === 401) return skipped("tropicos", "token")
  if (status !== 200 || !Array.isArray(payload)) return skipped("tropicos", "no-response")
  const hits = payload.flatMap((item) => {
    const hit = readTropicosHit(item)
    return hit && sameBinomial(hit.name, sheetName) && !INFRA.test(hit.citation) ? [hit] : []
  })
  const citations = new Set(hits.map((hit) => hit.citation))
  if (citations.size !== 1) {
    return none(
      "tropicos",
      citations.size === 0 ? "No species citation matched the sheet name." : "More than one species citation matched. None was chosen.",
    )
  }
  const hit = hits[0]
  if (!hit) return none("tropicos", "No species citation matched the sheet name.")
  return shown({ source: "tropicos", citation: hit.citation, latin: hit.name, href: hit.href })
}

interface UsdaHit {
  name: string
  rank: string | null
  accepted: string | null
  href: string | null
}

function readUsdaHit(value: unknown): UsdaHit | null {
  const row = readRecord(value)
  if (!row) return null
  const plant = readRecord(row.Plant) ?? row
  const raw = readString(plant.ScientificName)
  if (!raw) return null
  const acceptedRaw = readString(plant.AcceptedScientificName)
  const symbol = readString(plant.Symbol)
  const href = symbol && /^[A-Z0-9]+$/.test(symbol) ? `https://plants.sc.egov.usda.gov/home/plantProfile?symbol=${symbol}` : null
  return {
    name: plainName(raw),
    rank: readString(plant.Rank) ?? null,
    accepted: acceptedRaw ? plainName(acceptedRaw) : null,
    href,
  }
}

export function readUsdaHits(value: unknown): UsdaHit[] | null {
  if (!Array.isArray(value)) return null
  return value.flatMap((item) => {
    const hit = readUsdaHit(item)
    return hit ? [hit] : []
  })
}

export function interpretUsda(sheetName: string, nameKind: NameKind | undefined, payload: unknown): SourceLine {
  const hits = readUsdaHits(payload)
  if (!hits) return skipped("usda", "no-response")
  const matched = hits.filter((hit) => sameBinomial(hit.name, sheetName) && !INFRA.test(hit.name))
  const species = matched.filter((hit) => !hit.rank || hit.rank.toLowerCase() === "species")
  const pool = nameKind === "hybrid" ? species.filter((hit) => hybridMarked(hit.name)) : species
  if (pool.length === 0) return none("usda", noneDetail(nameKind, nameKind === "hybrid" ? "hybrid" : "species"))
  const names = new Set(pool.map((hit) => hit.name))
  const accepted = new Set(pool.map((hit) => hit.accepted).filter((name): name is string => !!name))
  if (names.size !== 1 || accepted.size > 1) return none("usda", "More than one species name matched. None was chosen.")
  const hit = pool[0]
  if (!hit) return none("usda", noneDetail(nameKind, "species"))
  const latin = binomialLatin(hit.accepted ?? hit.name)
  return shown({
    source: "usda",
    acceptedName: hit.accepted,
    citation: hit.accepted ? null : hit.name,
    latin,
    href: hit.href,
  })
}

interface TelaHit {
  name: string
  citation: string
  retained: boolean
  href: string | null
}

function readTelaHit(value: unknown): TelaHit | null {
  const row = readRecord(value)
  if (!row) return null
  const name = readString(row.nom_sci)
  const citation = readString(row.nom_sci_complet)
  if (!name || !citation) return null
  const href = safeHttp(readString(row.href), (url) => TELA_NAME.test(url.toString()))
  return {
    name,
    citation: plainName(citation),
    retained: row.retenu === true || row.retenu === "true",
    href,
  }
}

export function readTelaHits(value: unknown): TelaHit[] | null {
  const row = readRecord(value)
  if (!row) return null
  const header = readRecord(row.entete)
  const result = row.resultat
  if (!header || !result || typeof result !== "object" || Array.isArray(result)) return null
  return Object.values(result).flatMap((item) => {
    const hit = readTelaHit(item)
    return hit ? [hit] : []
  })
}

function telaShown(hit: TelaHit, acceptedName: string, citation: string): SourceLine {
  return shown({
    source: "tela",
    acceptedName,
    citation,
    latin: acceptedName,
    href: hit.href,
  })
}

export function interpretTela(sheetName: string, payload: unknown): SourceLine | { state: "detail"; href: string } {
  const hits = readTelaHits(payload)
  if (!hits) return skipped("tela", "no-response")
  const matched = hits.filter((hit) => sameBinomial(hit.name, sheetName))
  const retained = matched.filter((hit) => hit.retained)
  const pool = retained.length > 0 ? retained : []
  if (pool.length === 1 && pool[0]) return telaShown(pool[0], pool[0].name, pool[0].citation)
  if (pool.length > 1) {
    const citations = new Set(pool.map((hit) => hit.citation))
    if (citations.size === 1 && pool[0]) return telaShown(pool[0], pool[0].name, pool[0].citation)
    return none("tela", "More than one retained name matched. None was chosen.")
  }
  if (matched.length === 1 && matched[0]?.href) return { state: "detail", href: matched[0].href }
  return none("tela", "No retained name matched the sheet name.")
}

export function interpretTelaDetail(payload: unknown): SourceLine {
  const row = readRecord(payload)
  if (!row) return skipped("tela", "no-response")
  const accepted = readString(row["nom_retenu.libelle"]) ?? readString(row.nom_retenu_libelle)
  const citation = readString(row.nom_retenu_complet)
  if (!accepted || !citation) return none("tela", "No retained name matched the sheet name.")
  const href = safeHttp(readString(row["nom_retenu.href"]), (url) => TELA_NAME.test(url.toString()))
  return shown({
    source: "tela",
    acceptedName: plainName(accepted),
    citation: plainName(citation),
    latin: plainName(accepted),
    href,
  })
}

interface MnhnHit {
  id: number
  scientificName: string
  fullName: string | null
  referenceName: string | null
  referenceId: number | null
  rankId: string | null
}

function readMnhnHit(value: unknown): MnhnHit | null {
  const row = readRecord(value)
  if (!row) return null
  const scientificName = readString(row.scientificName)
  const id = typeof row.id === "number" && Number.isInteger(row.id) ? row.id : null
  if (!scientificName || id === null) return null
  const referenceId = typeof row.referenceId === "number" && Number.isInteger(row.referenceId) ? row.referenceId : null
  return {
    id,
    scientificName: plainName(scientificName),
    fullName: readString(row.fullName) ? plainName(readString(row.fullName) ?? "") : null,
    referenceName: readString(row.referenceName) ? plainName(readString(row.referenceName) ?? "") : null,
    referenceId,
    rankId: readString(row.rankId) ?? null,
  }
}

export function readMnhnHits(value: unknown): MnhnHit[] | null {
  const row = readRecord(value)
  if (!row) return null
  const embedded = readRecord(row._embedded)
  const taxa = embedded?.taxa
  if (Array.isArray(taxa)) {
    return taxa.flatMap((item) => {
      const hit = readMnhnHit(item)
      return hit ? [hit] : []
    })
  }
  const page = readRecord(row.page)
  if (page && page.totalElements === 0) return []
  return null
}

export function interpretMnhn(sheetName: string, nameKind: NameKind | undefined, payload: unknown, status: number): SourceLine {
  if (status === 401) return skipped("mnhn", "token")
  if (status !== 200) return skipped("mnhn", "no-response")
  const hits = readMnhnHits(payload)
  if (!hits) return skipped("mnhn", "no-response")
  const matched = hits.filter((hit) => sameBinomial(hit.scientificName, sheetName) && !INFRA.test(hit.scientificName))
  const species = matched.filter((hit) => !hit.rankId || hit.rankId === "ES")
  const pool = nameKind === "hybrid" ? species.filter((hit) => hybridMarked(hit.scientificName)) : species
  if (pool.length === 0) return none("mnhn", noneDetail(nameKind, nameKind === "hybrid" ? "hybrid" : "species"))
  const acceptedNames = new Set(
    pool.map((hit) => (hit.referenceName && hit.referenceId !== null && hit.referenceId !== hit.id ? hit.referenceName : hit.scientificName)),
  )
  if (acceptedNames.size !== 1) return none("mnhn", "More than one name matched. None was chosen.")
  const acceptedName = [...acceptedNames][0]
  if (!acceptedName) return none("mnhn", noneDetail(nameKind, "species"))
  const self = pool.find((hit) => hit.scientificName === acceptedName && hit.referenceId === hit.id) ?? pool.find((hit) => hit.scientificName === acceptedName)
  const citation = self?.fullName && self.fullName !== acceptedName ? self.fullName : null
  const href = self ? `https://inpn.mnhn.fr/espece/cd_nom/${self.id}` : null
  return shown({
    source: "mnhn",
    acceptedName,
    citation,
    latin: acceptedName,
    href,
  })
}

function tokenOrSilent(status: number, payload: unknown): SkipReason {
  if (tropicosToken(payload) || status === 401) return "token"
  return "no-response"
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text()
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

async function callSource(
  source: SourceKey,
  url: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<{ status: number; payload: unknown } | null> {
  try {
    const response = await fetchImpl(url, {
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    return { status: response.status, payload: await readPayload(response) }
  } catch {
    return null
  }
}

function nameParts(sheetName: string): { genus: string; species: string } | null {
  const match = sheetName.trim().match(/^([A-Z][A-Za-z-]+)(?: ×)? ([a-z][a-z-]+)$/)
  if (!match) return null
  return { genus: match[1] ?? "", species: match[2] ?? "" }
}

async function lookupIpni(
  sheetName: string,
  nameKind: NameKind | undefined,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<SourceLine> {
  const parts = nameParts(sheetName)
  if (!parts) return skipped("ipni", "no-response")
  const url = new URL(IPNI_SEARCH)
  url.searchParams.set("genus", parts.genus)
  url.searchParams.set("species", parts.species)
  url.searchParams.set("rank", "spec.")
  url.searchParams.set("perPage", "20")
  const result = await callSource("ipni", url.toString(), fetchImpl, signal)
  if (!result || result.status !== 200) return skipped("ipni", result ? tokenOrSilent(result.status, result.payload) : "no-response")
  return interpretIpni(sheetName, nameKind, result.payload)
}

async function lookupTropicos(sheetName: string, fetchImpl: typeof fetch, signal: AbortSignal): Promise<SourceLine> {
  const url = new URL(TROPICOS_SEARCH)
  url.searchParams.set("name", sheetName)
  url.searchParams.set("type", "exact")
  url.searchParams.set("format", "json")
  const result = await callSource("tropicos", url.toString(), fetchImpl, signal)
  if (!result) return skipped("tropicos", "no-response")
  return interpretTropicos(sheetName, result.payload, result.status)
}

async function lookupUsda(
  sheetName: string,
  nameKind: NameKind | undefined,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<SourceLine> {
  const parts = nameParts(sheetName)
  if (!parts) return skipped("usda", "no-response")
  const url = new URL(USDA_SEARCH)
  url.searchParams.set("searchText", `${parts.genus} ${parts.species}`)
  url.searchParams.set("searchType", "Scientific Name")
  const result = await callSource("usda", url.toString(), fetchImpl, signal)
  if (!result || result.status !== 200) return skipped("usda", result ? tokenOrSilent(result.status, result.payload) : "no-response")
  return interpretUsda(sheetName, nameKind, result.payload)
}

async function lookupTela(sheetName: string, fetchImpl: typeof fetch, signal: AbortSignal): Promise<SourceLine> {
  const url = new URL(TELA_SEARCH)
  url.searchParams.set("masque", sheetName)
  url.searchParams.set("limite", "8")
  const result = await callSource("tela", url.toString(), fetchImpl, signal)
  if (!result || result.status !== 200) return skipped("tela", result ? tokenOrSilent(result.status, result.payload) : "no-response")
  const first = interpretTela(sheetName, result.payload)
  if (first.state !== "detail") return first
  const detail = await callSource("tela", first.href, fetchImpl, signal)
  if (!detail || detail.status !== 200) return none("tela", "No retained name matched the sheet name.")
  return interpretTelaDetail(detail.payload)
}

async function lookupMnhn(
  sheetName: string,
  nameKind: NameKind | undefined,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<SourceLine> {
  const url = new URL(MNHN_SEARCH)
  url.searchParams.set("scientificNames", sheetName)
  url.searchParams.set("size", "20")
  const result = await callSource("mnhn", url.toString(), fetchImpl, signal)
  if (!result) return skipped("mnhn", "no-response")
  return interpretMnhn(sheetName, nameKind, result.payload, result.status)
}

export async function lookupNameSources(
  sheetName: string,
  nameKind: NameKind | undefined,
  fetchImpl: typeof fetch = fetch,
  onLine?: boolean,
  signal?: AbortSignal,
): Promise<NameSourceReport> {
  const note = stayNote(nameKind)
  const online = onLine ?? (typeof navigator === "undefined" ? undefined : navigator.onLine)
  if (!lookupShouldRun(online) || !sheetNameAllowed(sheetName)) {
    return { lines: missedLines("no-response"), note }
  }
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), 8000)
  const requestSignal = signal ? AbortSignal.any([timeout.signal, signal]) : timeout.signal
  try {
    const lines = await Promise.all([
      lookupIpni(sheetName, nameKind, fetchImpl, requestSignal),
      lookupTropicos(sheetName, fetchImpl, requestSignal),
      lookupUsda(sheetName, nameKind, fetchImpl, requestSignal),
      lookupTela(sheetName, fetchImpl, requestSignal),
      lookupMnhn(sheetName, nameKind, fetchImpl, requestSignal),
    ])
    return { lines, note }
  } finally {
    clearTimeout(timer)
  }
}
