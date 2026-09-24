export const REGIONS = [
  { id: "europe", label: "Europe" },
  { id: "africa", label: "Africa" },
  { id: "west-asia", label: "West Asia" },
  { id: "south-asia", label: "South Asia" },
  { id: "east-asia", label: "East Asia, including Taiwan" },
  { id: "southeast-asia", label: "Southeast Asia" },
  { id: "oceania", label: "Australia and New Zealand" },
  { id: "pacific-islands", label: "Pacific islands, including New Guinea" },
  { id: "north-america", label: "North America" },
  { id: "central-america", label: "Central America and the Caribbean" },
  { id: "south-america", label: "South America" },
] as const

export type Region = (typeof REGIONS)[number]["id"]

export function regionLabel(region: Region | null | undefined): string {
  if (!region) return "Region not set"
  const found = REGIONS.find((item) => item.id === region)
  return found?.label ?? region
}

export function isRegion(value: string): value is Region {
  return REGIONS.some((item) => item.id === value)
}

/**
 * Coarse boxes for a field flag. Borders are wrong on purpose near coasts
 * and mountains. The user can override the result.
 */
export function regionFromLatLon(lat: number, lon: number): Region | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null

  if (lat >= 21.7 && lat <= 25.4 && lon >= 119.3 && lon <= 122.1) {
    return "east-asia"
  }
  // The whole of New Guinea, including the Bird's Head and the north coast.
  // West of 130° stays Maluku. South of 10.5°S stays Cape York.
  if (lat <= 0.8 && lat >= -10.5 && lon >= 130 && lon <= 151.5) {
    return "pacific-islands"
  }
  if (lat >= 18 && lat <= 23 && lon >= -161 && lon <= -154) {
    return "pacific-islands"
  }
  if (lat > 63 && lon > -25 && lon < -13) return "europe"
  if (lat < -34 && lat > -48 && lon > 166 && lon < 179) return "oceania"
  if (lat < -10 && lat > -45 && lon > 112 && lon < 154) return "oceania"
  if (lat > 35 && lat < 72 && lon > -12 && lon < 40) return "europe"
  if (lat >= 7 && lat <= 22 && lon <= -60 && lon >= -120) return "central-america"
  if (lat > 22 && lat < 72 && lon > -168 && lon < -50) return "north-america"
  if (lat <= 13 && lat > -56 && lon > -92 && lon < -34) return "south-america"
  if (lat > -10 && lat < 22 && lon >= 95 && lon < 141) return "southeast-asia"
  if (lat > 5 && lat < 36 && lon >= 62 && lon < 98) return "south-asia"
  if (lat > 20 && lat < 55 && lon >= 98 && lon < 150) return "east-asia"
  if (lat > 12 && lat < 42 && lon >= 32 && lon < 62) return "west-asia"
  if (lat > -35 && lat < 38 && lon > -20 && lon < 52) return "africa"
  if (Math.abs(lat) < 28 && (lon > 155 || lon < -130)) return "pacific-islands"
  return null
}
