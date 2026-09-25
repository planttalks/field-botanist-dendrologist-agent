"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ScientificName } from "@/components/scientific-name"
import {
  BHL_LABEL,
  BHL_MISSED,
  lookupPublishedPlate,
  type BhlOutcome,
  type BhlPlate,
} from "@/lib/bhl"

type View = BhlOutcome | { state: "loading" }

function PlateFigure({ plate, onMiss }: { plate: BhlPlate; onMiss: () => void }) {
  return (
    <div className="space-y-2">
      {/* A published BHL page image. It is not a drawing of this specimen. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={plate.imageUrl}
        alt={`${BHL_LABEL} ${plate.queriedName}.`}
        className="max-h-96 w-full object-contain"
        referrerPolicy="no-referrer"
        onError={onMiss}
      />
      <p className="text-sm leading-relaxed">{BHL_LABEL}</p>
      <p className="text-sm">
        Name sought: <ScientificName name={plate.queriedName} />. The sheet name stays.
      </p>
      <p className="text-sm leading-relaxed">Work: {plate.title}</p>
      {plate.creator ? <p className="text-sm">Creator: {plate.creator}.</p> : null}
      {plate.year ? <p className="text-sm">Year: {plate.year}.</p> : null}
      <p className="text-sm">
        <a className="underline underline-offset-4" href={plate.pageUrl}>
          Open the BHL page
        </a>
        .
      </p>
    </div>
  )
}

function storedView(plate: BhlPlate): View {
  const online = typeof navigator === "undefined" ? true : navigator.onLine
  if (!online) return { state: "missed", detail: BHL_MISSED }
  return { state: "shown", plate }
}

export function PublishedPlate({
  name,
  stored,
  onPlate,
}: {
  name: string | null
  stored?: BhlPlate | null
  onPlate?: (plate: BhlPlate | null) => void
}) {
  const queried = name?.trim() ?? ""
  const storedMatch = stored && stored.queriedName === queried ? stored : null
  const [fetched, setFetched] = useState<{ name: string; outcome: BhlOutcome } | null>(null)
  const [missedUrl, setMissedUrl] = useState<string | null>(null)
  const onPlateRef = useRef(onPlate)

  useEffect(() => {
    onPlateRef.current = onPlate
  }, [onPlate])

  useEffect(() => {
    if (!queried) {
      onPlateRef.current?.(null)
      return
    }
    if (storedMatch) {
      const online = typeof navigator === "undefined" ? true : navigator.onLine
      onPlateRef.current?.(online ? storedMatch : null)
      return
    }
    const controller = new AbortController()
    let cancelled = false
    const online = typeof navigator === "undefined" ? undefined : navigator.onLine
    void lookupPublishedPlate(queried, fetch, online, controller.signal).then((outcome) => {
      if (cancelled) return
      setFetched({ name: queried, outcome })
      onPlateRef.current?.(outcome.state === "shown" ? outcome.plate : null)
    })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [queried, storedMatch])

  let view: View
  if (!queried) view = { state: "unnamed" }
  else if (storedMatch) view = storedView(storedMatch)
  else if (!fetched || fetched.name !== queried) view = { state: "loading" }
  else view = fetched.outcome

  const imageMissed = view.state === "shown" && missedUrl === view.plate.imageUrl

  let body: ReactNode
  if (imageMissed) {
    body = <p className="text-sm">{BHL_MISSED}</p>
  } else {
    switch (view.state) {
      case "loading":
        body = <p className="text-sm text-muted-foreground">Looking for a published illustration.</p>
        break
      case "unnamed":
        body = <p className="text-sm">No sheet name is set. A published plate is not sought.</p>
        break
      case "skipped":
      case "missed":
      case "none":
        body = <p className="text-sm">{view.detail}</p>
        break
      case "shown":
        body = <PlateFigure plate={view.plate} onMiss={() => setMissedUrl(view.plate.imageUrl)} />
        break
      default: {
        const exhaustive: never = view
        body = exhaustive
      }
    }
  }

  return (
    <figure className="ink-frame p-3 text-foreground">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-foreground/25 pb-2">
        <span className="font-serif text-lg">Published illustration</span>
        <span className="text-xs">{BHL_LABEL}</span>
      </figcaption>
      {body}
    </figure>
  )
}
