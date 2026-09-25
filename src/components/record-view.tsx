"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DiagnosticPlate } from "@/components/diagnostic-plate"
import { PublishedPlate } from "@/components/published-plate"
import { GbifLine } from "@/components/gbif-line"
import { SourceLines } from "@/components/source-lines"
import { PlacementPanels } from "@/components/placement-panels"
import { ScientificName } from "@/components/scientific-name"
import {
  CHARACTER_FIELDS,
  isSkipped,
  phraseFor,
  type CharacterKey,
} from "@/lib/types"
import {
  deleteSpecimen,
  downloadText,
  loadJournal,
  specimenToCsv,
  specimenToJson,
  type Specimen,
} from "@/lib/journal"
import { regionLabel } from "@/lib/regions"
import { taxonById } from "@/lib/taxa"

const KEYS = Object.keys(CHARACTER_FIELDS) as CharacterKey[]

export function RecordView({ id }: { id: string }) {
  const router = useRouter()
  const [record, setRecord] = useState<Specimen | null | undefined>(undefined)
  const [error, setError] = useState("")
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      try {
        const found = loadJournal().find((item) => item.id === id) ?? null
        setRecord(found)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The journal could not be read.")
        setRecord(null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (record === undefined) {
    return <p className="text-sm">Opening the record...</p>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Journal unreadable</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!record) {
    return (
      <div className="space-y-3">
        <p className="sheet-kicker">Journal</p>
        <h1 className="font-serif text-3xl leading-tight">No record here</h1>
        <p className="max-w-lg text-sm">
          Nothing with that id is stored in this browser. It may have been deleted, or you may be on a different device.
        </p>
        <Link href="/journal" className="text-sm underline underline-offset-4">
          Back to the journal
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="label-sheet flex flex-wrap items-start justify-between gap-3 rounded-none border border-foreground p-4">
        <div>
          <p className="sheet-kicker">{record.family ?? "No family stored"}</p>
          <h1 className="mt-1 font-serif text-3xl leading-tight">
            <ScientificName name={record.scientificName} taxonId={record.taxonId} />
          </h1>
          {record.scientificName ? (
            <div className="mt-2">
              <GbifLine
                name={record.scientificName}
                nameKind={record.taxonId ? taxonById(record.taxonId)?.nameKind : undefined}
              />
              <SourceLines
                key={`${record.id}:${record.scientificName}`}
                name={record.scientificName}
                nameKind={record.taxonId ? taxonById(record.taxonId)?.nameKind : undefined}
              />
            </div>
          ) : null}
          <p className="mt-1 text-sm">
            {new Date(record.createdAt).toLocaleString()}
            {". "}
            {record.locality || "Locality not recorded"}
            {record.region ? `. ${regionLabel(record.region)}` : ""}
          </p>
        </div>
        <Badge variant="outline">{record.reviewLabel}</Badge>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
        <DiagnosticPlate observation={record.observation} />
        <PublishedPlate name={record.scientificName} stored={record.nameImage ?? null} />
      </div>

      {record.scientificName ? (
        <PlacementPanels
          key={`${record.id}:${record.scientificName}`}
          name={record.scientificName}
          nameKind={record.taxonId ? taxonById(record.taxonId)?.nameKind : undefined}
        />
      ) : null}

      <p className="max-w-2xl text-sm leading-relaxed">{record.reviewText}</p>
      <p className="text-sm">
        Stored as {record.scientificName ? "a field hypothesis" : "unidentified"}. Fit {record.confidence.toFixed(2)}. Review score {record.reviewScore}.
      </p>

      {record.illustration?.dataUrl ? (
        <figure className="space-y-2">
          <h2 className="section-rule font-serif text-xl">Illustration plate</h2>
          {/* Local data URL stored with this record. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.illustration.dataUrl}
            alt="Pen and ink plate traced from the uploaded photos"
            className="plate-ground w-full"
          />
          <figcaption className="whitespace-pre-line text-sm leading-relaxed">{record.illustration.caption}</figcaption>
        </figure>
      ) : record.illustration ? (
        <div className="ink-empty space-y-2 text-sm">
          <h2 className="font-serif text-xl">Illustration plate</h2>
          <p className="text-muted-foreground">
            {record.illustration.dropped
              ? "The plate image was too large to store. The caption was kept."
              : "No plate image was stored."}
          </p>
          <p className="whitespace-pre-line leading-relaxed">{record.illustration.caption}</p>
        </div>
      ) : (
        <div className="ink-empty text-sm">
          No illustration plate was saved with this record.
        </div>
      )}

      <div className="space-y-3">
        {record.photoDataUrl ? (
          // Local data URL from this browser's journal.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={record.photoDataUrl} alt="Photo stored with this record" className="plate-ground max-h-96 w-full object-contain" />
        ) : (
          <div className="ink-empty text-sm">
            {record.photoDropped ? "The photo was too large to store with this record." : "No photo was attached."}
          </div>
        )}
        {record.qualityWarnings.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {record.qualityWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <dl className="grid gap-4 border-y border-foreground/30 py-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="sheet-kicker">Coordinates</dt>
          <dd>
            {record.latitude !== null && record.longitude !== null
              ? `${record.latitude.toFixed(5)}, ${record.longitude.toFixed(5)} (WGS84, uncertainty not recorded)`
              : "The point is missing"}
          </dd>
        </div>
        <div>
          <dt className="sheet-kicker">Elevation</dt>
          <dd>{record.elevationM !== null ? `${record.elevationM} m` : "Not recorded"}</dd>
        </div>
        <div>
          <dt className="sheet-kicker">Habitat</dt>
          <dd>{record.habitat || "Not recorded"}</dd>
        </div>
        <div>
          <dt className="sheet-kicker">Notes</dt>
          <dd>{record.notes || "None"}</dd>
        </div>
      </dl>

      <div>
        <h2 className="section-rule font-serif text-xl">Characters</h2>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {KEYS.filter((key) => !isSkipped(record.observation[key])).map((key) => (
            <li key={key}>{phraseFor(key, record.observation[key])}</li>
          ))}
        </ul>
      </div>

      {record.candidates.length > 0 ? (
        <div>
          <h2 className="section-rule font-serif text-xl">Names considered</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {record.candidates.map((candidate) => (
              <li key={candidate.taxonId}>
                <ScientificName name={candidate.scientificName} taxonId={candidate.taxonId} className="font-serif" />{" "}
                {candidate.commonName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => downloadText(`${record.id}.json`, specimenToJson([record]), "application/json")}
        >
          Export JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => downloadText(`${record.id}.csv`, specimenToCsv([record]), "text/csv")}
        >
          Export CSV
        </Button>
        {confirming ? (
          <>
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              onClick={() => {
                deleteSpecimen(id)
                if (window.location.pathname === "/journal") {
                  window.location.hash = ""
                } else {
                  router.push("/journal")
                }
              }}
            >
              Delete it
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </>
        ) : (
          <Button type="button" variant="destructive" className="h-11" onClick={() => setConfirming(true)}>
            Delete
          </Button>
        )}
      </div>
      {confirming ? <p className="text-sm">Delete this record from this browser? Export it first if you still need it.</p> : null}
    </div>
  )
}
