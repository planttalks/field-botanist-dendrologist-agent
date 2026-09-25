import { lookupNameSources } from "@/lib/name-sources"
import type { NameKind } from "@/lib/taxa"

function readKind(value: string | null): NameKind | undefined {
  switch (value) {
    case "species":
    case "hybrid":
    case "aggregate":
      return value
    default:
      return undefined
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const report = await lookupNameSources(url.searchParams.get("name") ?? "", readKind(url.searchParams.get("kind")))
  return Response.json(report, {
    headers: { "Cache-Control": "no-store" },
  })
}
