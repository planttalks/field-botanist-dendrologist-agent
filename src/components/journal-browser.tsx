"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RecordView } from "@/components/record-view"
import { ScientificName } from "@/components/scientific-name"
import {
  downloadText,
  loadJournal,
  specimenToCsv,
  specimenToJson,
  stamp,
  type Specimen,
} from "@/lib/journal"
import { regionLabel } from "@/lib/regions"

function recordIdFromHash(): string | null {
  const hash = window.location.hash.replace(/^#/, "")
  return hash ? decodeURIComponent(hash) : null
}

export function JournalBrowser() {
  const [records, setRecords] = useState<Specimen[] | null>(null)
  const [error, setError] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const read = () => {
      if (cancelled) return
      try {
        setRecords(loadJournal())
        setError("")
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The journal could not be read.")
        setRecords([])
      }
    }
    const readHash = () => {
      if (!cancelled) setOpenId(recordIdFromHash())
    }
    queueMicrotask(read)
    queueMicrotask(readHash)
    window.addEventListener("field-sheet-journal", read)
    window.addEventListener("hashchange", readHash)
    return () => {
      cancelled = true
      window.removeEventListener("field-sheet-journal", read)
      window.removeEventListener("hashchange", readHash)
    }
  }, [])

  if (records === null) {
    return <p className="text-sm">Opening the journal...</p>
  }

  if (openId) {
    return (
      <div className="space-y-4">
        <Link
          href="/journal"
          className="text-sm underline underline-offset-4"
          onClick={(event) => {
            if (window.location.pathname === "/journal" && window.location.hash) {
              event.preventDefault()
              window.location.hash = ""
            }
          }}
        >
          Back to the journal
        </Link>
        <RecordView id={openId} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-foreground/35 pb-4">
        <div>
          <p className="sheet-kicker">Local records</p>
          <h1 className="mt-1 font-serif text-3xl leading-tight tracking-tight">Journal</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed">
            Records stay in this browser. Clearing site data clears them. Export before you rely on a single phone.
          </p>
        </div>
        {records.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => downloadText(`field-sheet-${stamp()}.json`, specimenToJson(records), "application/json")}
            >
              Export JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => downloadText(`field-sheet-${stamp()}.csv`, specimenToCsv(records), "text/csv")}
            >
              Export CSV
            </Button>
          </div>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Journal unreadable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {records.length === 0 && !error ? (
        <div className="ink-empty">
          <h2 className="font-serif text-xl">No specimens yet</h2>
          <p className="mt-2 max-w-lg text-sm">
            An identification can be saved even when the name is uncertain. Start a sheet and choose Save as unidentified if the key does not fit.
          </p>
          <Link href="/identify" className="mt-4 inline-block text-sm underline underline-offset-4">
            Start a sheet
          </Link>
        </div>
      ) : null}

      {records.length > 0 ? (
      <ul className="border-t border-foreground">
        {records.map((record) => (
          <li key={record.id} className="border-b border-foreground/30">
            <Link
              href={`/journal#${record.id}`}
              className="grid gap-1 py-3 sm:grid-cols-[10.5rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-4"
            >
              <time className="sheet-kicker" dateTime={record.createdAt}>
                {new Date(record.createdAt).toLocaleDateString()}
              </time>
              <span>
                <span className="font-serif text-lg">
                  <ScientificName name={record.scientificName} taxonId={record.taxonId} />
                </span>
                <span className="mt-0.5 block text-sm">
                  {record.locality || "Locality not recorded"}
                  {record.region ? `. ${regionLabel(record.region)}` : ""}
                </span>
              </span>
              <Badge variant="outline" className="w-fit">
                {record.reviewLabel}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
      ) : null}
    </div>
  )
}
