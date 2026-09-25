import { bhlImageUrl, bhlPageUrl, requestPublishedPlate } from "./bhl"
import { binomialKey, lookupShouldRun } from "./gbif"

/** Documented Trefle search. A token is required. This sheet does not send one. */
export const TREFLE_PLANTS = "https://trefle.io/api/v1/plants"

const COMMONS_API = "https://commons.wikimedia.org/w/api.php"

export const ILLUSTRATION_MISSED = "The illustration was not retrieved."
export const ILLUSTRATION_LABEL = "Published illustration of this name, not a drawing of this specimen."

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i
const CANDIDATE_LIMIT = 4

export const IMAGE_SOURCES = ["commons", "trefle", "bhl"] as const
export type ImageSource = (typeof IMAGE_SOURCES)[number]

export interface NameImage {
  queriedName: string
  imageUrl: string
  pageUrl: string
  source: ImageSource
  sourceLabel: string
  title: string
  credit: string | null
}

export type NameImageOutcome =
  | { state: "unnamed" }
  | { state: "missed"; detail: string }
  | { state: "shown"; image: NameImage }

export function sourceLabel(source: ImageSource): string {
  switch (source) {
    case "commons":
      return "Wikimedia Commons"
    case "trefle":
      return "Trefle"
    case "bhl":
      return "Biodiversity Heritage Library"
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

export function trefleSearchUrl(name: string): string {
  const url = new URL(TREFLE_PLANTS)
  url.searchParams.set("q", name)
  return url.toString()
}

export function commonsCategoryTitle(name: string, kind: "botanical" | "illustrations"): string {
  const binomial = name.trim()
  switch (kind) {
    case "botanical":
      return `Category:${binomial} - botanical illustrations`
    case "illustrations":
      return `Category:${binomial} (illustrations)`
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function commonsQuery(params: Record<string, string>): string {
  const url = new URL(COMMONS_API)
  url.searchParams.set("action", "query")
  url.searchParams.set("format", "json")
  url.searchParams.set("origin", "*")
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

export function commonsCategoryUrl(categoryTitle: string): string {
  return commonsQuery({
    generator: "categorymembers",
    gcmtitle: categoryTitle,
    gcmtype: "file",
    gcmlimit: "20",
    prop: "imageinfo",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "960",
  })
}

export function commonsSearchUrl(name: string): string {
  return commonsQuery({
    generator: "search",
    gsrsearch: `"${name.trim()}" illustration`,
    gsrnamespace: "6",
    gsrlimit: "10",
    prop: "imageinfo|categories",
    iiprop: "url|mime|size|extmetadata",
    iiurlwidth: "960",
    cllimit: "30",
  })
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") return [value]
  return []
}

function httpsUrl(value: string | undefined): URL | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") return null
    if (url.username || url.password) return null
    return url
  } catch {
    return null
  }
}

function sameName(left: string, right: string): boolean {
  const a = binomialKey(left)
  const b = binomialKey(right)
  return Boolean(a && b && a === b)
}

function nameInText(name: string, text: string): boolean {
  return text.toLowerCase().includes(name.trim().toLowerCase())
}

export function plainText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function artistOf(value: string | undefined): string | null {
  if (!value) return null
  const text = plainText(value)
  if (!text || text.toLowerCase() === "own work") return null
  return text.length > 160 ? `${text.slice(0, 157).trim()}...` : text
}

function parentAborted(error: unknown, parent: AbortSignal): boolean {
  return parent.aborted || (error instanceof Error && error.name === "AbortError" && parent.aborted)
}

async function cancelBody(response: Response) {
  try {
    await response.body?.cancel()
  } catch {
    // A closed body is not an image.
  }
}

export function allowedImageUrl(source: ImageSource, value: string): string | null {
  const url = httpsUrl(value)
  if (!url) return null
  switch (source) {
    case "commons":
      if (!IMAGE_EXT.test(url.pathname)) return null
      if (url.hostname === "upload.wikimedia.org" && url.pathname.includes("/wikipedia/commons/")) {
        url.search = ""
        url.hash = ""
        return url.toString()
      }
      if (url.hostname === "thumb.wikimedia.org" && url.pathname.includes("/wikipedia/commons/")) {
        url.hash = ""
        return url.toString()
      }
      return null
    case "trefle":
      if (!IMAGE_EXT.test(url.pathname)) return null
      url.hash = ""
      return url.toString()
    case "bhl":
      return bhlImageUrl(value)
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

export function allowedPageUrl(source: ImageSource, value: string): string | null {
  const url = httpsUrl(value)
  if (!url) return null
  url.hash = ""
  switch (source) {
    case "commons":
      if (url.hostname !== "commons.wikimedia.org") return null
      if (!url.pathname.startsWith("/wiki/File:")) return null
      url.search = ""
      return url.toString()
    case "trefle":
      if (url.hostname !== "trefle.io" && url.hostname !== "www.trefle.io") return null
      if (!url.pathname.startsWith("/plants/")) return null
      return url.toString()
    case "bhl":
      return bhlPageUrl(value)
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

export function storeNameImage(image: NameImage | null): NameImage | null {
  if (!image) return null
  if (!IMAGE_SOURCES.includes(image.source)) return null
  const queriedName = image.queriedName.trim()
  const title = image.title.trim()
  const imageUrl = allowedImageUrl(image.source, image.imageUrl)
  const pageUrl = allowedPageUrl(image.source, image.pageUrl)
  if (!queriedName || !title || !imageUrl || !pageUrl) return null
  return {
    queriedName,
    imageUrl,
    pageUrl,
    source: image.source,
    sourceLabel: sourceLabel(image.source),
    title,
    credit: image.credit?.trim() || null,
  }
}

function trefleBlocked(status: number, body: unknown): boolean {
  if (status === 401 || status === 403) return true
  if (!body || typeof body !== "object") return false
  const row = body as Record<string, unknown>
  const code = readString(row.code)?.toLowerCase() ?? ""
  const message = `${readString(row.message) ?? ""} ${readString(row.error) ?? ""}`.toLowerCase()
  return code === "unauthorized" || message.includes("access token") || message.includes("api key")
}

function treflePage(row: Record<string, unknown>): string | null {
  const slug = readString(row.slug)
  if (slug && /^[a-z0-9-]+$/i.test(slug)) return `https://trefle.io/plants/${slug}`
  const id = readNumber(row.id)
  if (id && id > 0) return `https://trefle.io/plants/${id}`
  return null
}

function trefleImageValue(row: Record<string, unknown>): string | undefined {
  const direct = readString(row.image_url) ?? readString(row.imageUrl)
  if (direct) return direct
  for (const entry of asList(row.images)) {
    if (!entry || typeof entry !== "object") continue
    const url = readString((entry as Record<string, unknown>).url)
    if (url) return url
  }
  return undefined
}

/** A matching Trefle row with an image address. A token error is not an image. */
export function readTrefleCandidate(sheetName: string, status: number, body: unknown): NameImage | null {
  const queriedName = sheetName.trim()
  if (!queriedName || trefleBlocked(status, body)) return null
  if (!body || typeof body !== "object") return null
  for (const entry of asList((body as Record<string, unknown>).data)) {
    if (!entry || typeof entry !== "object") continue
    const row = entry as Record<string, unknown>
    const scientific = readString(row.scientific_name) ?? readString(row.scientificName)
    if (!scientific || !sameName(scientific, queriedName)) continue
    const imageUrl = allowedImageUrl("trefle", trefleImageValue(row) ?? "")
    const page = treflePage(row)
    const pageUrl = page ? allowedPageUrl("trefle", page) : null
    const title = readString(row.common_name) ?? scientific
    if (!imageUrl || !pageUrl) continue
    return {
      queriedName,
      imageUrl,
      pageUrl,
      source: "trefle",
      sourceLabel: sourceLabel("trefle"),
      title,
      credit: null,
    }
  }
  return null
}

function fileTitle(pageTitle: string): string | null {
  if (!pageTitle.startsWith("File:")) return null
  const title = pageTitle.slice("File:".length).trim()
  return title || null
}

function illustrationWord(title: string): boolean {
  return /illustration|plate|flora|fig\./i.test(title)
}

function categoryIsIllustration(title: string): boolean {
  return /botanical illustration|\(illustrations\)|taxonomic drawings/i.test(title)
}

function pageList(body: unknown): Record<string, unknown>[] {
  if (!body || typeof body !== "object") return []
  const query = (body as Record<string, unknown>).query
  if (!query || typeof query !== "object") return []
  const pages = (query as Record<string, unknown>).pages
  if (Array.isArray(pages)) {
    return pages.flatMap((page) => (page && typeof page === "object" ? [page as Record<string, unknown>] : []))
  }
  if (!pages || typeof pages !== "object") return []
  return Object.values(pages).flatMap((page) => (page && typeof page === "object" ? [page as Record<string, unknown>] : []))
}

function metaValue(info: Record<string, unknown>, key: string): string | undefined {
  const meta = info.extmetadata
  if (!meta || typeof meta !== "object") return undefined
  const entry = (meta as Record<string, unknown>)[key]
  if (!entry || typeof entry !== "object") return undefined
  return readString((entry as Record<string, unknown>).value)
}

function chooseCommonsFile(info: Record<string, unknown>): string | null {
  const size = readNumber(info.size) ?? 0
  const original = allowedImageUrl("commons", readString(info.url) ?? "")
  if (original && (size === 0 || size <= 1_500_000)) return original
  const thumb = allowedImageUrl("commons", readString(info.thumburl) ?? "")
  return thumb ?? original
}

/**
 * Files from a Commons category or search.
 * A file is kept when its title or object name contains the sheet name.
 * A search hit must also be an illustration.
 */
export function readCommonsCandidates(sheetName: string, body: unknown, search = false): NameImage[] {
  const queriedName = sheetName.trim()
  if (!queriedName) return []
  const found: { score: number; image: NameImage }[] = []
  for (const page of pageList(body)) {
    const rawTitle = readString(page.title)
    if (!rawTitle) continue
    const title = fileTitle(rawTitle)
    if (!title) continue
    const info = asList(page.imageinfo)[0]
    if (!info || typeof info !== "object") continue
    const row = info as Record<string, unknown>
    const mime = readString(row.mime)?.toLowerCase() ?? ""
    if (mime && !mime.startsWith("image/")) continue
    const objectName = metaValue(row, "ObjectName")
    const named = nameInText(queriedName, title) || (objectName ? nameInText(queriedName, objectName) : false)
    if (!named) continue
    const categories = asList(page.categories).flatMap((entry) => {
      if (!entry || typeof entry !== "object") return []
      const label = readString((entry as Record<string, unknown>).title)
      return label ? [label] : []
    })
    const illustrated = illustrationWord(title) || categories.some(categoryIsIllustration)
    if (search && !illustrated) continue
    const imageUrl = chooseCommonsFile(row)
    const pageUrl = allowedPageUrl("commons", readString(row.descriptionurl) ?? "")
    if (!imageUrl || !pageUrl) continue
    let score = nameInText(queriedName, title) ? 4 : 1
    if (/ & | and /i.test(title)) score -= 2
    if (score <= 0) continue
    const image = storeNameImage({
      queriedName,
      imageUrl,
      pageUrl,
      source: "commons",
      sourceLabel: sourceLabel("commons"),
      title,
      credit: artistOf(metaValue(row, "Artist")),
    })
    if (!image) continue
    found.push({ score, image })
  }
  found.sort((left, right) => right.score - left.score)
  return found.slice(0, CANDIDATE_LIMIT).map((item) => item.image)
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function imageFileReturned(
  url: string,
  fetchImpl: typeof fetch,
  parent: AbortSignal,
): Promise<boolean> {
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), 4000)
  const signal = AbortSignal.any([parent, timeout.signal])
  try {
    const head = await fetchImpl(url, { method: "HEAD", signal })
    const headType = (head.headers.get("content-type") ?? "").toLowerCase()
    if (head.ok && headType.startsWith("image/")) {
      await cancelBody(head)
      return true
    }
    await cancelBody(head)
    if (head.status === 404 || head.status === 410 || head.status === 401 || head.status === 403) return false
    const get = await fetchImpl(url, { method: "GET", signal, headers: { Range: "bytes=0-64" } })
    const getType = (get.headers.get("content-type") ?? "").toLowerCase()
    await cancelBody(get)
    return get.ok && getType.startsWith("image/")
  } catch (error) {
    if (parentAborted(error, parent)) throw error
    return false
  } finally {
    clearTimeout(timer)
  }
}

async function firstConfirmed(
  images: NameImage[],
  fetchImpl: typeof fetch,
  parent: AbortSignal,
): Promise<NameImage | null> {
  for (const image of images) {
    if (await imageFileReturned(image.imageUrl, fetchImpl, parent)) return image
  }
  return null
}

async function requestCommons(
  name: string,
  fetchImpl: typeof fetch,
  parent: AbortSignal,
): Promise<NameImage | null> {
  const urls = [
    commonsCategoryUrl(commonsCategoryTitle(name, "botanical")),
    commonsCategoryUrl(commonsCategoryTitle(name, "illustrations")),
    commonsSearchUrl(name),
  ]
  try {
    for (const [index, url] of urls.entries()) {
      const response = await fetchImpl(url, { signal: parent })
      if (!response.ok) continue
      const images = readCommonsCandidates(name, await readJson(response), index === 2)
      const image = await firstConfirmed(images, fetchImpl, parent)
      if (image) return image
    }
    return null
  } catch (error) {
    if (parentAborted(error, parent)) throw error
    return null
  }
}

async function requestTrefle(
  name: string,
  fetchImpl: typeof fetch,
  parent: AbortSignal,
): Promise<NameImage | null> {
  try {
    const response = await fetchImpl(trefleSearchUrl(name), { signal: parent })
    const candidate = readTrefleCandidate(name, response.status, await readJson(response))
    if (!candidate) return null
    if (!(await imageFileReturned(candidate.imageUrl, fetchImpl, parent))) return null
    return candidate
  } catch (error) {
    if (parentAborted(error, parent)) throw error
    return null
  }
}

async function requestBhl(
  name: string,
  fetchImpl: typeof fetch,
  parent: AbortSignal,
): Promise<NameImage | null> {
  try {
    const outcome = await requestPublishedPlate(name, fetchImpl, parent)
    if (outcome.state !== "shown") return null
    const imageUrl = bhlImageUrl(outcome.plate.imageUrl)
    const pageUrl = bhlPageUrl(outcome.plate.pageUrl)
    if (!imageUrl || !pageUrl) return null
    if (!(await imageFileReturned(imageUrl, fetchImpl, parent))) return null
    return storeNameImage({
      queriedName: name,
      imageUrl,
      pageUrl,
      source: "bhl",
      sourceLabel: sourceLabel("bhl"),
      title: outcome.plate.title,
      credit: outcome.plate.creator,
    })
  } catch (error) {
    if (parentAborted(error, parent)) throw error
    return null
  }
}

/**
 * Prefer a Wikimedia Commons botanical illustration of the sheet name.
 * Trefle and BHL are used only when they return an image file and Commons does not.
 * This sheet does not generate a plant.
 */
export async function lookupNameImage(
  sheetName: string,
  fetchImpl: typeof fetch = fetch,
  onLine?: boolean,
  signal?: AbortSignal,
): Promise<NameImageOutcome> {
  const name = sheetName.trim()
  if (!name) return { state: "unnamed" }
  const online = onLine ?? (typeof navigator === "undefined" ? undefined : navigator.onLine)
  if (!lookupShouldRun(online)) return { state: "missed", detail: ILLUSTRATION_MISSED }

  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), 12000)
  const parent = signal ? AbortSignal.any([timeout.signal, signal]) : timeout.signal
  try {
    const commons = await requestCommons(name, fetchImpl, parent)
    if (commons) return { state: "shown", image: commons }
    const trefle = await requestTrefle(name, fetchImpl, parent)
    if (trefle) return { state: "shown", image: trefle }
    const bhl = await requestBhl(name, fetchImpl, parent)
    if (bhl) return { state: "shown", image: bhl }
    return { state: "missed", detail: ILLUSTRATION_MISSED }
  } catch {
    return { state: "missed", detail: ILLUSTRATION_MISSED }
  } finally {
    clearTimeout(timer)
  }
}
