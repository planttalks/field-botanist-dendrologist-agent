"use client"

import { useEffect, useState } from "react"
import { lookupBackbone, type BackboneOutcome, type ClassRank, type SourceOutcome } from "@/lib/backbone"
import { lookupDistribution, type DistributionOutcome } from "@/lib/distribution"
import type { NameKind } from "@/lib/taxa"

type BackboneView = BackboneOutcome | { state: "loading" }
type DistributionView = DistributionOutcome | { state: "loading" }

function rankDepth(rank: ClassRank): string {
  switch (rank) {
    case "family":
      return "ml-0"
    case "genus":
      return "ml-3"
    case "species":
      return "ml-6"
    case "subspecies":
    case "variety":
    case "form":
    case "subvariety":
    case "subform":
      return "ml-9"
    default: {
      const exhaustive: never = rank
      return exhaustive
    }
  }
}

function rankLabel(rank: ClassRank): string {
  switch (rank) {
    case "family":
      return "Family"
    case "genus":
      return "Genus"
    case "species":
      return "Species"
    case "subspecies":
      return "Subspecies"
    case "variety":
      return "Variety"
    case "form":
      return "Form"
    case "subvariety":
      return "Subvariety"
    case "subform":
      return "Subform"
    default: {
      const exhaustive: never = rank
      return exhaustive
    }
  }
}

function sourceTitle(source: SourceOutcome["source"]): string {
  switch (source) {
    case "powo":
      return "Plants of the World Online"
    case "wfo":
      return "World Flora Online"
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

function sourceCaption(source: SourceOutcome["source"]): string {
  switch (source) {
    case "powo":
      return "World Checklist of Vascular Plants, Kew. This is the names backbone of Plants of the World Online. The record is read from ChecklistBank."
    case "wfo":
      return "World Flora Online Plant List. The record is read from ChecklistBank."
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

function SourceBlock({ source }: { source: SourceOutcome }) {
  return (
    <div className="space-y-2 border border-foreground/30 p-3">
      <h3 className="font-serif text-lg">{sourceTitle(source.source)}</h3>
      <p className="text-sm text-muted-foreground">{sourceCaption(source.source)}</p>
      {source.state === "shown" ? (
        <div className="space-y-2">
          {source.acceptedName ? (
            <p className="text-sm">
              Accepted name <em lang="la" className="font-serif">{source.acceptedName}</em>
              {source.acceptedRank ? `. Rank ${source.acceptedRank}.` : "."}
              {source.statusLabel ? ` Status ${source.statusLabel}.` : ""}
            </p>
          ) : null}
          {source.tree.length > 0 ? (
            <ol className="space-y-1 border-l border-foreground/40 pl-3 text-sm">
              {source.tree.map((node) => (
                <li key={`${node.rank}-${node.name}`} className={rankDepth(node.rank)}>
                  <span className="text-muted-foreground">{rankLabel(node.rank)}. </span>
                  {node.rank === "family" ? node.name : <em lang="la" className="font-serif">{node.name}</em>}
                </li>
              ))}
            </ol>
          ) : null}
          <p className="text-sm">{source.detail}</p>
          <p className="text-sm">
            {source.portalUrl ? (
              <a className="underline underline-offset-4" href={source.portalUrl}>
                Open the {source.source === "powo" ? "POWO" : "World Flora Online"} taxon
              </a>
            ) : null}
            {source.portalUrl && source.recordUrl ? " " : null}
            {source.recordUrl ? (
              <a className="underline underline-offset-4" href={source.recordUrl}>
                Open the ChecklistBank record
              </a>
            ) : null}
          </p>
        </div>
      ) : (
        <p className="text-sm">{source.detail}</p>
      )}
    </div>
  )
}

function OccurrenceMap({
  map,
}: {
  map: { name: string; baseUrl: string; densityUrl: string; pageUrl: string }
}) {
  const [failed, setFailed] = useState(false)
  if (failed) return <p className="text-sm">The occurrence map was not retrieved.</p>
  return (
    <figure className="space-y-2">
      <div className="relative w-full max-w-xl overflow-hidden border border-foreground/40">
        {/* GBIF base map and occurrence density. Both images are served by GBIF. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={map.baseUrl} alt="" className="block w-full" onError={() => setFailed(true)} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={map.densityUrl}
          alt={`GBIF occurrence density for ${map.name}`}
          className="absolute inset-0 h-full w-full"
          onError={() => setFailed(true)}
        />
      </div>
      <figcaption className="text-sm leading-relaxed">
        GBIF occurrence density for <em lang="la" className="font-serif">{map.name}</em>.
        {" "}The coastlines and the points both come from GBIF. They are records, not a native range drawn by this sheet.{" "}
        <a className="underline underline-offset-4" href={map.pageUrl}>
          Open the GBIF map
        </a>
        .
      </figcaption>
    </figure>
  )
}

export function PlacementPanels({ name, nameKind }: { name: string; nameKind?: NameKind }) {
  const [backbone, setBackbone] = useState<BackboneView>({ state: "loading" })
  const [distribution, setDistribution] = useState<DistributionView>({ state: "loading" })

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    void lookupBackbone(name, nameKind, fetch, navigator.onLine, controller.signal).then((placement) => {
      if (cancelled) return
      setBackbone(placement)
      const geographic =
        placement.powo.geographicNote && placement.powo.acceptedName
          ? { note: placement.powo.geographicNote, name: placement.powo.acceptedName }
          : null
      return lookupDistribution(name, nameKind, geographic, fetch, navigator.onLine, controller.signal)
    }).then((range) => {
      if (!cancelled && range) setDistribution(range)
    })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [name, nameKind])

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className="section-rule font-serif text-xl">Checklist classification</h2>
        <p className="text-sm leading-relaxed">
          The character key produced the sheet name. The lists below compare that name with a published classification.
          They do not replace the sheet name and they do not declare a new species. This is not a phylogeny.
        </p>
        {backbone.state === "loading" ? <p className="text-sm text-muted-foreground">Comparing the sheet name with the checklists...</p> : null}
        {backbone.state === "skipped" ? <p className="text-sm">{backbone.detail}</p> : null}
        {backbone.state === "ready" ? (
          <div className="grid gap-3">
            <SourceBlock source={backbone.powo} />
            <SourceBlock source={backbone.wfo} />
          </div>
        ) : null}
      </section>
      <section className="space-y-2">
        <h2 className="section-rule font-serif text-xl">Geographic distribution</h2>
        <p className="text-sm leading-relaxed">
          A geographic note is shown only when the World Checklist record includes one. The map, when it loads, is a GBIF occurrence image.
        </p>
        {distribution.state === "loading" ? <p className="text-sm text-muted-foreground">Retrieving the distribution...</p> : null}
        {distribution.state === "skipped" ? <p className="text-sm">{distribution.detail}</p> : null}
        {distribution.state === "shown" ? (
          <div className="space-y-3">
            {distribution.geographicNote ? (
              <p className="text-sm leading-relaxed">
                Geographic note from the World Checklist of Vascular Plants
                {distribution.geographicName ? (
                  <>
                    {" "}for <em lang="la" className="font-serif">{distribution.geographicName}</em>
                  </>
                ) : null}
                : {distribution.geographicNote}.
              </p>
            ) : (
              <p className="text-sm">The checklist did not include a geographic note for a species.</p>
            )}
            {distribution.map ? <OccurrenceMap map={distribution.map} /> : null}
            {distribution.mapDetail ? <p className="text-sm">{distribution.mapDetail}</p> : null}
            {distribution.countries.length > 0 ? (
              <div className="space-y-1">
                <p className="text-sm">Countries with the most GBIF records for this name.</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {distribution.countries.map((country) => (
                    <li key={country.code}>
                      {country.label}: {country.count.toLocaleString("en-US")} records
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground">This list is not a complete native range.</p>
              </div>
            ) : null}
            {distribution.countryDetail ? <p className="text-sm">{distribution.countryDetail}</p> : null}
            <p className="text-sm text-muted-foreground">{distribution.note}</p>
          </div>
        ) : null}
      </section>
    </div>
  )
}
