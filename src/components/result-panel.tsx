"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { DiagnosticPlate } from "@/components/diagnostic-plate"
import { GbifLine } from "@/components/gbif-line"
import { PlacementPanels } from "@/components/placement-panels"
import { PlateFigure } from "@/components/plate-step"
import { ScientificName } from "@/components/scientific-name"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import type { Identification } from "@/lib/identify"
import { regionLabel, type Region } from "@/lib/regions"
import { displayName, taxonById } from "@/lib/taxa"
import type { Observation } from "@/lib/types"

const BAND_LABEL = {
  low: "Low",
  fair: "Fair",
  strong: "Strong for this sheet",
} as const

export function ResultPanel({
  observation,
  region,
  locality,
  identification,
  habitat,
  notes,
  onHabitat,
  onNotes,
  onSplit,
  onSave,
  saving,
  saveError,
  savedId,
  photoDropped,
  plateDropped,
  plateStatus,
  plateUrl,
  plateError,
  plateCaption,
  onChosen,
  pointMissing,
}: {
  observation: Observation
  region: Region | null
  locality: string
  identification: Identification
  habitat: string
  notes: string
  onHabitat: (value: string) => void
  onNotes: (value: string) => void
  onSplit: (value: string) => void
  onSave: (taxonId: string | null) => void
  saving: boolean
  saveError: string
  savedId: string | null
  photoDropped: boolean
  plateDropped: boolean
  plateStatus: "empty" | "loading" | "ready" | "error"
  plateUrl: string | null
  plateError: string
  plateCaption: string
  onChosen: (taxonId: string | null) => void
  pointMissing: boolean
}) {
  const topId = identification.noMatch ? null : (identification.candidates[0]?.taxon.id ?? null)
  const signature = `${identification.noMatch ? "none" : "match"}:${identification.candidates.map((candidate) => candidate.taxon.id).join("|")}`
  const [picked, setPicked] = useState<{ signature: string; id: string } | null>(null)
  const chosenId = picked && picked.signature === signature ? picked.id : topId
  const chosen = chosenId
    ? identification.candidates.find((candidate) => candidate.taxon.id === chosenId)
    : undefined

  useEffect(() => {
    onChosen(chosenId)
  }, [chosenId, onChosen])

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <div className="order-2 space-y-5 lg:order-1">
        <section className="space-y-2">
          <h2 className="section-rule font-serif text-xl">Illustration plate</h2>
          <p className="text-sm leading-relaxed">
            Traced from the photographs on the Plate step. The diagnostic plate is the schematic of the marked characters.
          </p>
          <PlateFigure status={plateStatus} url={plateUrl} error={plateError} caption={plateCaption} />
        </section>
        <DiagnosticPlate observation={observation} />
      </div>
      <div className="order-1 space-y-4 lg:order-2">
        {identification.noMatch ? (
          <Alert>
            <AlertTitle>No name on this sheet fits</AlertTitle>
            <AlertDescription>
              The characters do not land on a species here. Save the record unidentified and compare the photo with a local flora.
            </AlertDescription>
          </Alert>
        ) : chosen ? (
          <Card className="label-sheet rounded-none border-foreground shadow-none">
            <CardHeader>
              <CardDescription className="sheet-kicker text-foreground">{chosen.taxon.family}</CardDescription>
              <CardTitle>
                <ScientificName
                  name={chosen.taxon.scientificName}
                  taxonId={chosen.taxon.id}
                  className="font-serif text-2xl font-medium"
                />
              </CardTitle>
              <p className="text-sm">{chosen.taxon.commonNames.join(", ")}</p>
              <GbifLine name={chosen.taxon.scientificName} nameKind={chosen.taxon.nameKind} />
            </CardHeader>
            <CardContent className="space-y-3">
              <p>{chosen.taxon.summary}</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {chosen.taxon.traits.map((trait) => (
                  <li key={trait}>{trait}</li>
                ))}
              </ul>
              {chosen.taxon.woodyNote ? <p className="text-sm">{chosen.taxon.woodyNote}</p> : null}
              <p className="text-sm text-muted-foreground">
                The panels below compare this sheet name with the checklists. They do not replace it. This sheet does not track later name changes.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {chosen && !identification.noMatch ? (
          <PlacementPanels
            key={`${chosen.taxon.id}:${chosen.taxon.nameKind ?? "species"}`}
            name={chosen.taxon.scientificName}
            nameKind={chosen.taxon.nameKind}
          />
        ) : null}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={identification.band === "low" ? "destructive" : "secondary"}>
              {BAND_LABEL[identification.band]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {identification.confidence.toFixed(2)} capped fit
            </span>
            <Badge variant="outline">{identification.reviewLabel}</Badge>
          </div>
          <Progress value={Math.round(identification.confidence * 100)}>
            <ProgressLabel>Fit with this sheet</ProgressLabel>
            <ProgressValue />
          </Progress>
          <p className="text-sm text-muted-foreground">
            {identification.band === "strong"
              ? "Strong means these answers agree with each other. It does not mean a botanist checked the plant."
              : "A fair or low fit means the sheet is unsure. Add a character or keep the record unidentified."}
          </p>
          {identification.thin ? (
            <p className="text-sm">Fewer than three characters are marked, so the fit stays capped.</p>
          ) : null}
        </div>

        <Alert>
          <AlertTitle>Do not eat any part of this plant from this result</AlertTitle>
          <AlertDescription>
            The sheet does not judge food or medicine. A high review score means show a specialist. It does not mean a new species.
          </AlertDescription>
        </Alert>

        {identification.warnings.map((warning) => (
          <Alert key={warning} variant="destructive">
            <AlertTitle>Poison warning</AlertTitle>
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        ))}
        {identification.invasives.map((note) => (
          <Alert key={note}>
            <AlertTitle>Invasive note</AlertTitle>
            <AlertDescription>{note}</AlertDescription>
          </Alert>
        ))}

        {identification.geoFlag === "outside" ? (
          <Alert variant="destructive">
            <AlertTitle>Outside the range on this sheet</AlertTitle>
            <AlertDescription>
              The characters still point at this name. {regionLabel(region)} is not in its native or commonly planted list. It may be planted, or the local species may be missing here.
            </AlertDescription>
          </Alert>
        ) : null}
        {identification.geoFlag === "planted" ? (
          <p className="text-sm">
            This place is outside the native range. The plant is widely planted or naturalized, so the name can still be right.
          </p>
        ) : null}

        <p className="text-sm leading-relaxed">{identification.reviewText}</p>
        <p className="text-sm text-muted-foreground">
          Place used for the range check: {locality.trim() || regionLabel(region)}.
        </p>
        {pointMissing ? <p className="text-sm">The point is missing.</p> : null}

        {identification.split ? (
          <fieldset className="ink-frame space-y-2 p-3">
            <legend className="px-1 text-sm font-medium">These names are close. Check this.</legend>
            <p className="text-sm">{identification.split.prompt}</p>
            <div className="flex flex-wrap gap-2">
              {identification.split.options.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={observation[identification.split!.key] === option.value ? "default" : "outline"}
                  className="h-11"
                  onClick={() => onSplit(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {identification.candidates.length > 0 ? (
          <div className="space-y-2">
            <h3 className="section-rule font-serif text-lg">{identification.noMatch ? "Poor fits" : "Other names on the sheet"}</h3>
            <ul className="space-y-2">
              {identification.candidates.map((candidate, index) => {
                const selected = candidate.taxon.id === chosenId
                const similar = candidate.taxon.similarTo
                  .map((id) => {
                    const taxon = taxonById(id)
                    return taxon ? displayName(taxon) : undefined
                  })
                  .filter((name): name is string => !!name)
                return (
                  <li key={candidate.taxon.id} className="border-b border-foreground/25 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {index === 0 && !identification.noMatch ? "Top name" : `Option ${index + 1}`}
                          {" in "}
                          {candidate.taxon.family}
                        </p>
                        <p>
                          <ScientificName
                            name={candidate.taxon.scientificName}
                            taxonId={candidate.taxon.id}
                            className="font-serif"
                          />
                          <span className="text-sm text-muted-foreground"> {candidate.taxon.commonNames[0]}</span>
                        </p>
                      </div>
                      {!identification.noMatch ? (
                        <Button
                          type="button"
                          variant={selected ? "secondary" : "outline"}
                          className="h-11"
                          onClick={() => setPicked({ signature, id: candidate.taxon.id })}
                        >
                          {selected ? "Using this name" : "Use this name"}
                        </Button>
                      ) : null}
                    </div>
                    {candidate.hits.length > 0 ? (
                      <p className="mt-2 text-sm">Fits: {candidate.hits.slice(0, 4).join(", ")}.</p>
                    ) : null}
                    {candidate.misses.length > 0 ? (
                      <p className="text-sm">Does not fit: {candidate.misses.slice(0, 3).join(", ")}.</p>
                    ) : null}
                    {similar.length > 0 ? (
                      <p className="text-sm text-muted-foreground">Compare with {similar.join(", ")}.</p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="habitat">Habitat</Label>
            <Textarea
              id="habitat"
              value={habitat}
              onChange={(event) => onHabitat(event.target.value)}
              placeholder="Shade, soil, nearby water, what else is growing."
              rows={2}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(event) => onNotes(event.target.value)}
              placeholder="Voucher number, collector, anything the chips could not say."
              rows={2}
            />
          </div>
        </div>

        {saveError ? (
          <Alert variant="destructive">
            <AlertTitle>The record was not saved</AlertTitle>
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}
        {photoDropped ? (
          <p className="text-sm">The photo was too large for this browser. The characters were saved without it.</p>
        ) : null}
        {plateDropped ? (
          <p className="text-sm">The illustration plate was too large for this browser. The caption was saved without the image.</p>
        ) : null}
        {savedId ? (
          <Alert>
            <AlertTitle>Saved on this device</AlertTitle>
            <AlertDescription>
              <Link href={`/journal#${savedId}`} className="underline underline-offset-4">
                Open the record
              </Link>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-wrap gap-2">
            {!identification.noMatch && chosenId ? (
              <Button type="button" className="h-11" disabled={saving} onClick={() => onSave(chosenId)}>
                {saving ? "Saving..." : "Save this name"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant={identification.noMatch ? "default" : "outline"}
              className="h-11"
              disabled={saving}
              onClick={() => onSave(null)}
            >
              {saving ? "Saving..." : "Save as unidentified"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
