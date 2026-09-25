"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ScientificName } from "@/components/scientific-name"
import {
  ILLUSTRATION_LABEL,
  ILLUSTRATION_MISSED,
  lookupNameImage,
  storeNameImage,
  type ImageSource,
  type NameImage,
  type NameImageOutcome,
} from "@/lib/name-image"

type View = NameImageOutcome | { state: "loading" }

function pageLink(source: ImageSource): string {
  switch (source) {
    case "commons":
      return "Open the Wikimedia Commons page"
    case "trefle":
      return "Open the Trefle record"
    case "bhl":
      return "Open the BHL page"
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

function titleLabel(source: ImageSource): string {
  switch (source) {
    case "commons":
      return "File title"
    case "trefle":
      return "Title"
    case "bhl":
      return "Work"
    default: {
      const exhaustive: never = source
      return exhaustive
    }
  }
}

function PlateFigure({ image, onMiss }: { image: NameImage; onMiss: () => void }) {
  return (
    <div className="space-y-2">
      {/* A published file for this name. It is not a drawing of this specimen. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.imageUrl}
        alt={`${ILLUSTRATION_LABEL} ${image.queriedName}. Source: ${image.sourceLabel}.`}
        className="max-h-96 w-full object-contain"
        referrerPolicy="no-referrer"
        onError={onMiss}
      />
      <p className="text-sm leading-relaxed">{ILLUSTRATION_LABEL}</p>
      <p className="text-sm">Source: {image.sourceLabel}.</p>
      <p className="text-sm">
        {titleLabel(image.source)}: {image.title}.
      </p>
      {image.credit ? <p className="text-sm">Artist: {image.credit}.</p> : null}
      <p className="text-sm">
        Name sought: <ScientificName name={image.queriedName} />. The sheet name stays.
      </p>
      <p className="text-sm">
        <a className="underline underline-offset-4" href={image.pageUrl}>
          {pageLink(image.source)}
        </a>
        .
      </p>
    </div>
  )
}

function storedView(image: NameImage): View {
  const online = typeof navigator === "undefined" ? true : navigator.onLine
  if (!online) return { state: "missed", detail: ILLUSTRATION_MISSED }
  return { state: "shown", image }
}

export function PublishedPlate({
  name,
  stored,
  onPlate,
}: {
  name: string | null
  stored?: NameImage | null
  onPlate?: (image: NameImage | null) => void
}) {
  const queried = name?.trim() ?? ""
  const storedMatch = useMemo(
    () => storeNameImage(stored && stored.queriedName === queried ? stored : null),
    [stored, queried],
  )
  const [fetched, setFetched] = useState<{ name: string; outcome: NameImageOutcome } | null>(null)
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
    void lookupNameImage(queried, fetch, online, controller.signal).then((outcome) => {
      if (cancelled) return
      setFetched({ name: queried, outcome })
      onPlateRef.current?.(outcome.state === "shown" ? outcome.image : null)
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

  const imageMissed = view.state === "shown" && missedUrl === view.image.imageUrl

  let body: ReactNode
  if (imageMissed) {
    body = <p className="text-sm">{ILLUSTRATION_MISSED}</p>
  } else {
    switch (view.state) {
      case "loading":
        body = <p className="text-sm text-muted-foreground">Looking for a published illustration of this name.</p>
        break
      case "unnamed":
        body = <p className="text-sm">No sheet name is set. A published illustration is not sought.</p>
        break
      case "missed":
        body = <p className="text-sm">{view.detail}</p>
        break
      case "shown":
        body = <PlateFigure image={view.image} onMiss={() => setMissedUrl(view.image.imageUrl)} />
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
        <span className="text-xs">{ILLUSTRATION_LABEL}</span>
      </figcaption>
      {body}
    </figure>
  )
}
