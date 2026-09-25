import { binomialKey, lookupShouldRun } from "./gbif"

/** Preferred BHL API. Operation GetNameMetadata. A key is required. */
export const BHL_API = "https://www.biodiversitylibrary.org/api3"

export const BHL_SKIPPED = "The BHL check did not run."
export const BHL_MISSED = "The published plate was not retrieved."
export const BHL_NONE = "No published plate was found for this name."
export const BHL_LABEL = "Published illustration of this name, not a drawing of this specimen."

/**
 * The public API returns HTTP 401 when apikey is empty.
 * This sheet does not hold a key, so the live lookup does not call the API.
 */
export const BHL_KEY_REQUIRED = true

export interface BhlPlate {
  queriedName: string
  imageUrl: string
  pageUrl: string
  title: string
  creator: string | null
  year: string | null
}

export type BhlOutcome =
  | { state: "unnamed" }
  | { state: "skipped"; detail: string }
  | { state: "missed"; detail: string }
  | { state: "none"; detail: string }
  | { state: "shown"; plate: BhlPlate }

export function bhlNameMetadataUrl(name: string): string {
  const url = new URL(BHL_API)
  url.searchParams.set("op", "GetNameMetadata")
  url.searchParams.set("name", name)
  url.searchParams.set("format", "json")
  return url.toString()
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") return [value]
  return []
}

function hostAllowed(url: URL): boolean {
  return url.hostname === "www.biodiversitylibrary.org" || url.hostname === "biodiversitylibrary.org"
}

export function bhlImageUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || !hostAllowed(url)) return null
    if (!url.pathname.startsWith("/pageimage/") && !url.pathname.startsWith("/pagethumb/")) return null
    return url.toString()
  } catch {
    return null
  }
}

export function bhlPageUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || !hostAllowed(url)) return null
    if (!url.pathname.startsWith("/page/")) return null
    return url.toString()
  } catch {
    return null
  }
}

function yearOf(values: (string | undefined)[]): string | null {
  for (const value of values) {
    if (!value) continue
    const match = value.match(/\b([12]\d{3})\b/)
    if (match) return match[1]
  }
  return null
}

function creatorOf(authors: unknown): string | null {
  for (const author of asList(authors)) {
    if (!author || typeof author !== "object") continue
    const row = author as Record<string, unknown>
    const name = readString(row.Name) ?? readString(row.FullName) ?? readString(row.CreatorName)
    if (!name) continue
    const cleaned = name.replace(/,\s*$/, "").trim()
    if (cleaned) return cleaned
  }
  return null
}

function pageIsIllustration(page: Record<string, unknown>): boolean {
  for (const entry of asList(page.PageTypes)) {
    if (!entry || typeof entry !== "object") continue
    const label = readString((entry as Record<string, unknown>).PageTypeName)
    if (label?.toLowerCase() === "illustration") return true
  }
  return false
}

interface PlateCandidate {
  illustration: boolean
  plate: BhlPlate
}

function pagesOf(title: Record<string, unknown>): Record<string, unknown>[] {
  const direct = asList(title.Pages).flatMap((page) => {
    if (!page || typeof page !== "object") return []
    return [page as Record<string, unknown>]
  })
  const nested = asList(title.Items).flatMap((item) => {
    if (!item || typeof item !== "object") return []
    return asList((item as Record<string, unknown>).Pages).flatMap((page) => {
      if (!page || typeof page !== "object") return []
      return [page as Record<string, unknown>]
    })
  })
  return [...direct, ...nested]
}

function itemYear(title: Record<string, unknown>, page: Record<string, unknown>): string | undefined {
  const pageYear = readString(page.Year)
  if (pageYear) return pageYear
  for (const item of asList(title.Items)) {
    if (!item || typeof item !== "object") continue
    const year = readString((item as Record<string, unknown>).Year)
    if (year) return year
  }
  return undefined
}

function nameMatches(confirmed: string, sheetName: string): boolean {
  const left = binomialKey(confirmed)
  const right = binomialKey(sheetName)
  if (!left || !right) return false
  return left === right
}

export function interpretBhlName(sheetName: string, body: unknown): BhlOutcome {
  const queriedName = sheetName.trim()
  if (!queriedName) return { state: "unnamed" }
  if (!body || typeof body !== "object") return { state: "missed", detail: BHL_MISSED }
  const root = body as Record<string, unknown>
  const status = readString(root.Status)?.toLowerCase()
  const error = readString(root.ErrorMessage)?.toLowerCase() ?? ""
  if (status === "unauthorized" || error.includes("api key")) {
    return { state: "skipped", detail: BHL_SKIPPED }
  }
  if (status && status !== "ok") return { state: "missed", detail: BHL_MISSED }

  const found: PlateCandidate[] = []
  for (const block of asList(root.Result)) {
    if (!block || typeof block !== "object") continue
    const row = block as Record<string, unknown>
    const confirmed = readString(row.NameConfirmed)
    if (!confirmed || !nameMatches(confirmed, queriedName)) continue
    for (const titleValue of asList(row.Titles)) {
      if (!titleValue || typeof titleValue !== "object") continue
      const title = titleValue as Record<string, unknown>
      const work = readString(title.FullTitle) ?? readString(title.ShortTitle)
      if (!work) continue
      const creator = creatorOf(title.Authors ?? title.Creators)
      const published = readString(title.PublicationDate)
      for (const page of pagesOf(title)) {
        const imageUrl = bhlImageUrl(readString(page.FullSizeImageUrl) ?? readString(page.ThumbnailUrl))
        const pageUrl = bhlPageUrl(readString(page.PageUrl))
        if (!imageUrl || !pageUrl) continue
        found.push({
          illustration: pageIsIllustration(page),
          plate: {
            queriedName,
            imageUrl,
            pageUrl,
            title: work.replace(/\s+/g, " ").trim(),
            creator,
            year: yearOf([readString(page.Year), itemYear(title, page), published]),
          },
        })
      }
    }
  }

  const plate = found.find((item) => item.illustration)?.plate
  if (!plate) return { state: "none", detail: BHL_NONE }
  return { state: "shown", plate }
}

export function storeBhlPlate(plate: BhlPlate | null): BhlPlate | null {
  if (!plate) return null
  const imageUrl = bhlImageUrl(plate.imageUrl)
  const pageUrl = bhlPageUrl(plate.pageUrl)
  const queriedName = plate.queriedName.trim()
  const title = plate.title.trim()
  if (!imageUrl || !pageUrl || !queriedName || !title) return null
  return {
    queriedName,
    imageUrl,
    pageUrl,
    title,
    creator: plate.creator?.trim() || null,
    year: plate.year?.trim() || null,
  }
}

function keyRejected(status: number, body: unknown): boolean {
  if (status === 401) return true
  if (!body || typeof body !== "object") return false
  const row = body as Record<string, unknown>
  const text = `${readString(row.Status) ?? ""} ${readString(row.ErrorMessage) ?? ""}`.toLowerCase()
  return text.includes("api key") || text.includes("unauthorized")
}

export async function requestPublishedPlate(
  sheetName: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<BhlOutcome> {
  const name = sheetName.trim()
  if (!name) return { state: "unnamed" }
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), 8000)
  const requestSignal = signal ? AbortSignal.any([timeout.signal, signal]) : timeout.signal
  try {
    const response = await fetchImpl(bhlNameMetadataUrl(name), { signal: requestSignal })
    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    if (keyRejected(response.status, body)) return { state: "skipped", detail: BHL_SKIPPED }
    if (!response.ok) return { state: "missed", detail: BHL_MISSED }
    return interpretBhlName(name, body)
  } catch {
    return { state: "missed", detail: BHL_MISSED }
  } finally {
    clearTimeout(timer)
  }
}

export async function lookupPublishedPlate(
  sheetName: string,
  fetchImpl: typeof fetch = fetch,
  onLine?: boolean,
  signal?: AbortSignal,
): Promise<BhlOutcome> {
  const name = sheetName.trim()
  if (!name) return { state: "unnamed" }
  const online = onLine ?? (typeof navigator === "undefined" ? undefined : navigator.onLine)
  if (!lookupShouldRun(online)) return { state: "missed", detail: BHL_MISSED }
  if (BHL_KEY_REQUIRED) return { state: "skipped", detail: BHL_SKIPPED }
  return requestPublishedPlate(name, fetchImpl, signal)
}
