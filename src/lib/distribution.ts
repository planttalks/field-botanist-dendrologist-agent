import { interpretGbif, lookupShouldRun, readGbifRecord, type GbifMatch } from "./gbif"
import type { NameKind } from "./taxa"

const MATCH_URL = "https://api.gbif.org/v1/species/match"
const OCCURRENCE_URL = "https://api.gbif.org/v1/occurrence/search"

export interface CountryCount {
  code: string
  label: string
  count: number
}

export interface OccurrenceMap {
  name: string
  taxonKey: number
  baseUrl: string
  densityUrl: string
  pageUrl: string
}

export type DistributionOutcome =
  | { state: "skipped"; detail: string }
  | {
      state: "shown"
      geographicNote: string | null
      geographicName: string | null
      map: OccurrenceMap | null
      mapDetail: string | null
      countries: CountryCount[]
      countryDetail: string | null
      note: string
    }

export function occurrenceMap(taxonKey: number, name: string): OccurrenceMap {
  const density = new URL("https://api.gbif.org/v2/map/occurrence/density/0/0/0@1x.png")
  density.searchParams.set("taxonKey", String(taxonKey))
  density.searchParams.set("style", "classic.point")
  density.searchParams.set("bin", "hex")
  density.searchParams.set("hexPerTile", "32")
  return {
    name,
    taxonKey,
    baseUrl: "https://tile.gbif.org/4326/omt/0/0/0@1x.png",
    densityUrl: density.toString(),
    pageUrl: `https://www.gbif.org/species/${taxonKey}`,
  }
}

export function readCountryCounts(value: unknown): { code: string; count: number }[] | null {
  if (!value || typeof value !== "object") return null
  const facets = (value as { facets?: unknown }).facets
  if (!Array.isArray(facets)) return null
  const facet = facets.find((item) => {
    if (!item || typeof item !== "object") return false
    return (item as { field?: unknown }).field === "COUNTRY"
  }) as { counts?: unknown } | undefined
  if (!facet || !Array.isArray(facet.counts)) return null
  const counts: { code: string; count: number }[] = []
  for (const item of facet.counts) {
    if (!item || typeof item !== "object") continue
    const code = (item as { name?: unknown }).name
    const count = (item as { count?: unknown }).count
    if (typeof code !== "string" || !/^[A-Z]{2}$/.test(code)) continue
    if (typeof count !== "number" || !Number.isFinite(count) || count < 1) continue
    counts.push({ code, count })
  }
  return counts
}

export function countryLabel(code: string): string {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" })
    const label = names.of(code)
    return label && label !== code ? label : code
  } catch {
    return code
  }
}

function shownMap(sheetName: string, nameKind: NameKind | undefined, match: GbifMatch, accepted: GbifMatch | null): OccurrenceMap | null {
  const outcome = interpretGbif({ sheetName, nameKind, match, accepted })
  if (outcome.state !== "shown") return null
  const key = outcome.url.match(/(\d+)$/)?.[1]
  if (!key) return null
  return occurrenceMap(Number(key), outcome.acceptedName)
}

function emptyShown(input: {
  geographicNote: string | null
  geographicName: string | null
  map: OccurrenceMap | null
  mapDetail: string | null
  countries: CountryCount[]
  countryDetail: string | null
}): DistributionOutcome {
  if (!input.geographicNote && !input.map && input.countries.length === 0) {
    return { state: "skipped", detail: "The distribution was not retrieved." }
  }
  return {
    state: "shown",
    geographicNote: input.geographicNote,
    geographicName: input.geographicName,
    map: input.map,
    mapDetail: input.map ? null : (input.mapDetail ?? "The occurrence map was not retrieved."),
    countries: input.countries,
    countryDetail: input.countries.length > 0 ? null : input.countryDetail,
    note: "The sheet name stays. No range was drawn by this sheet.",
  }
}

async function readJson(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>
}

export async function lookupDistribution(
  sheetName: string,
  nameKind: NameKind | undefined,
  geographic: { note: string; name: string } | null,
  fetchImpl: typeof fetch = fetch,
  onLine?: boolean,
  signal?: AbortSignal,
): Promise<DistributionOutcome> {
  const online = onLine ?? (typeof navigator === "undefined" ? undefined : navigator.onLine)
  if (!lookupShouldRun(online)) return { state: "skipped", detail: "The distribution was not retrieved." }
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), 8000)
  const requestSignal = signal ? AbortSignal.any([timeout.signal, signal]) : timeout.signal
  const geographicNote = geographic?.note ?? null
  const geographicName = geographic?.name ?? null
  try {
    const url = new URL(MATCH_URL)
    url.searchParams.set("name", sheetName)
    url.searchParams.set("kingdom", "Plantae")
    const response = await fetchImpl(url, { signal: requestSignal, headers: { Accept: "application/json" } })
    if (!response.ok) {
      return emptyShown({
        geographicNote,
        geographicName,
        map: null,
        mapDetail: "The occurrence map was not retrieved.",
        countries: [],
        countryDetail: "The occurrence list was not retrieved.",
      })
    }
    const match = readGbifRecord(await readJson(response))
    if (!match) {
      return emptyShown({
        geographicNote,
        geographicName,
        map: null,
        mapDetail: "The occurrence map was not retrieved.",
        countries: [],
        countryDetail: "The occurrence list was not retrieved.",
      })
    }
    let accepted: GbifMatch | null = null
    const status = match.taxonomicStatus ?? match.status
    if (status && status !== "ACCEPTED" && status !== "DOUBTFUL" && match.acceptedUsageKey) {
      const acceptedResponse = await fetchImpl(`https://api.gbif.org/v1/species/${match.acceptedUsageKey}`, {
        signal: requestSignal,
        headers: { Accept: "application/json" },
      })
      if (acceptedResponse.ok) accepted = readGbifRecord(await readJson(acceptedResponse))
    }
    const map = shownMap(sheetName, nameKind, match, accepted)
    if (!map) {
      return emptyShown({
        geographicNote,
        geographicName,
        map: null,
        mapDetail: "The occurrence map was not retrieved.",
        countries: [],
        countryDetail: null,
      })
    }
    let countries: CountryCount[] = []
    let countryDetail: string | null = null
    try {
      const search = new URL(OCCURRENCE_URL)
      search.searchParams.set("taxonKey", String(map.taxonKey))
      search.searchParams.set("limit", "0")
      search.searchParams.set("facet", "country")
      search.searchParams.set("facetLimit", "8")
      const countryResponse = await fetchImpl(search, { signal: requestSignal, headers: { Accept: "application/json" } })
      if (!countryResponse.ok) {
        countryDetail = "The occurrence list was not retrieved."
      } else {
        const counts = readCountryCounts(await readJson(countryResponse))
        if (!counts) {
          countryDetail = "The occurrence list was not retrieved."
        } else if (counts.length === 0) {
          countryDetail = "GBIF returned no occurrences for this name."
        } else {
          countries = counts.slice(0, 8).map((item) => ({
            code: item.code,
            label: countryLabel(item.code),
            count: item.count,
          }))
        }
      }
    } catch {
      countryDetail = "The occurrence list was not retrieved."
    }
    return emptyShown({
      geographicNote,
      geographicName,
      map,
      mapDetail: null,
      countries,
      countryDetail,
    })
  } catch {
    return emptyShown({
      geographicNote,
      geographicName,
      map: null,
      mapDetail: "The occurrence map was not retrieved.",
      countries: [],
      countryDetail: "The occurrence list was not retrieved.",
    })
  } finally {
    clearTimeout(timer)
  }
}
