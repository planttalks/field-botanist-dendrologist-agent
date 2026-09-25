"use client"

import { useEffect, useState } from "react"
import {
  missedLines,
  recordLabel,
  sourceLabel,
  stayNote,
  type NameSourceReport,
  type SourceLine,
} from "@/lib/name-sources"
import type { NameKind } from "@/lib/taxa"

type View = NameSourceReport | { state: "loading" }

function CitationWords({ line }: { line: SourceLine }) {
  const citation = line.citation
  if (!citation) return null
  const latin = line.latin
  if (latin && citation.startsWith(latin)) {
    return (
      <>
        <em lang="la" className="font-serif">
          {latin}
        </em>
        {citation.slice(latin.length)}
      </>
    )
  }
  return <>{citation}</>
}

function SourceItem({ line }: { line: SourceLine }) {
  const label = sourceLabel(line.source)
  if (line.state === "skipped") {
    return (
      <li>
        {line.reason === "token"
          ? `${label}. The check did not run. Token required.`
          : `${label}. The check did not run. No response.`}
      </li>
    )
  }
  if (line.state === "none") {
    return (
      <li>
        {label}. {line.detail ?? "No matching record was returned."}
      </li>
    )
  }
  return (
    <li>
      {label}.
      {line.acceptedName ? (
        <>
          {" "}
          Accepted name{" "}
          <em lang="la" className="font-serif">
            {line.acceptedName}
          </em>
          .
        </>
      ) : null}
      {line.citation ? (
        <>
          {" "}
          {line.source === "usda" ? "Matching name" : "Citation"} <CitationWords line={line} />
          {line.citation.endsWith(".") ? "" : "."}
        </>
      ) : null}
      {line.note ? ` ${line.note}` : null}
      {line.href ? (
        <>
          {" "}
          <a className="underline underline-offset-4" href={line.href}>
            {recordLabel(line.source)}
          </a>
          .
        </>
      ) : null}
    </li>
  )
}

export function SourceLines({ name, nameKind }: { name: string; nameKind?: NameKind }) {
  const [view, setView] = useState<View>({ state: "loading" })

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      queueMicrotask(() => {
        if (!cancelled) setView({ lines: missedLines("no-response"), note: stayNote(nameKind) })
      })
      return () => {
        cancelled = true
        controller.abort()
      }
    }
    const url = new URL("/api/name-sources", window.location.origin)
    url.searchParams.set("name", name)
    if (nameKind) url.searchParams.set("kind", nameKind)
    void fetch(url, { signal: controller.signal, headers: { Accept: "application/json" }, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return { lines: missedLines("no-response"), note: stayNote(nameKind) }
        const payload = (await response.json()) as NameSourceReport
        if (!payload || !Array.isArray(payload.lines) || payload.lines.length !== 5) {
          return { lines: missedLines("no-response"), note: stayNote(nameKind) }
        }
        return payload
      })
      .then((report) => {
        if (!cancelled) setView(report)
      })
      .catch(() => {
        if (!cancelled) setView({ lines: missedLines("no-response"), note: stayNote(nameKind) })
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [name, nameKind])

  if ("state" in view) {
    return <p className="text-sm text-muted-foreground">Checking the other name lists...</p>
  }

  return (
    <div className="space-y-1 text-sm">
      <ul className="space-y-1">
        {view.lines.map((line) => (
          <SourceItem key={line.source} line={line} />
        ))}
      </ul>
      <p className="text-muted-foreground">{view.note}</p>
    </div>
  )
}
