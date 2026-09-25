"use client"

import { ChipGroup } from "@/components/chip-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  isPlateMode,
  PLATE_MODES,
  PLATE_ORGANS,
  PLATE_SLOTS,
  type PlateMode,
  type PlateOrganId,
  type PlateSlotId,
  type PlateSpecifics,
} from "@/lib/plate"

export interface SlotDraft {
  status: "empty" | "loading" | "ready" | "error"
  dataUrl: string | null
  error: string
}

export function PlateFigure({
  status,
  url,
  error,
  caption,
}: {
  status: "empty" | "loading" | "ready" | "error"
  url: string | null
  error: string
  caption: string
}) {
  if (status === "empty") {
    return (
      <div className="ink-empty text-sm">
        No photos yet. Each empty view stays blank and keeps its label. Notes print under the plate. They do not add a drawing.
      </div>
    )
  }
  if (status === "loading" && !url) {
    return (
      <p className="text-sm" aria-live="polite">
        Tracing lines from the photos...
      </p>
    )
  }
  if (status === "error" && !url) {
    return (
      <Alert variant="destructive">
        <AlertTitle>The plate could not be drawn</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  if (!url) return null
  return (
    <figure className="space-y-2">
      {/* The plate is a local data URL built in this browser. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Pen and ink plate traced from the uploaded photos"
        className="plate-ground w-full"
      />
      <figcaption className="whitespace-pre-line text-sm leading-relaxed">{caption}</figcaption>
      {status === "loading" ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Tracing lines from the photos...
        </p>
      ) : null}
      {status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>The plate could not be drawn</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </figure>
  )
}

export function PlateStep({
  slots,
  voucherUrl,
  specifics,
  mode,
  plateStatus,
  plateUrl,
  plateError,
  plateCaption,
  onFile,
  onUseVoucher,
  onClear,
  onSpecifics,
  onMode,
}: {
  slots: Record<PlateSlotId, SlotDraft>
  voucherUrl: string | null
  specifics: PlateSpecifics
  mode: PlateMode
  plateStatus: "empty" | "loading" | "ready" | "error"
  plateUrl: string | null
  plateError: string
  plateCaption: string
  onFile: (slot: PlateSlotId, file: File | undefined) => void
  onUseVoucher: (slot: PlateSlotId) => void
  onClear: (slot: PlateSlotId) => void
  onSpecifics: (next: PlateSpecifics) => void
  onMode: (mode: PlateMode) => void
}) {
  function toggleOrgan(id: PlateOrganId) {
    const organs = specifics.organs.includes(id)
      ? specifics.organs.filter((organ) => organ !== id)
      : [...specifics.organs, id]
    onSpecifics({ ...specifics, organs })
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="section-rule font-serif text-xl">Angles</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Four views. Skip any you do not have. A missing view stays empty. The plate will not invent it.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLATE_SLOTS.map((slot) => {
            const draft = slots[slot.id]
            return (
              <section key={slot.id} className="ink-frame space-y-3 p-3">
                <div>
                  <h3 className="text-sm font-medium">
                    {slot.letter}. {slot.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">{slot.hint}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Label className="flex h-11 cursor-pointer items-center rounded-sm border bg-primary px-3 text-sm text-primary-foreground">
                    Camera
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      aria-label={`${slot.label} from the camera`}
                      onChange={(event) => {
                        onFile(slot.id, event.target.files?.[0])
                        event.target.value = ""
                      }}
                    />
                  </Label>
                  <Label className="flex h-11 cursor-pointer items-center rounded-sm border border-foreground/45 bg-card px-3 text-sm">
                    Upload
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      aria-label={`${slot.label} from a file`}
                      onChange={(event) => {
                        onFile(slot.id, event.target.files?.[0])
                        event.target.value = ""
                      }}
                    />
                  </Label>
                  {voucherUrl ? (
                    <button
                      type="button"
                      className="h-11 rounded-sm border border-foreground/45 bg-card px-3 text-sm"
                      onClick={() => onUseVoucher(slot.id)}
                    >
                      Use the sheet photo
                    </button>
                  ) : null}
                  {draft.status === "ready" ? (
                    <button type="button" className="h-11 rounded-sm border border-foreground/45 px-3 text-sm" onClick={() => onClear(slot.id)}>
                      Clear
                    </button>
                  ) : null}
                </div>
                <div aria-live="polite" className="min-h-12">
                  {draft.status === "empty" ? (
                    <p className="text-sm text-muted-foreground">Empty. This view will stay blank.</p>
                  ) : null}
                  {draft.status === "loading" ? <p className="text-sm">Reading that photo...</p> : null}
                  {draft.status === "error" ? (
                    <Alert variant="destructive">
                      <AlertTitle>That photo did not open</AlertTitle>
                      <AlertDescription>{draft.error}</AlertDescription>
                    </Alert>
                  ) : null}
                  {draft.status === "ready" && draft.dataUrl ? (
                    // Local data URL from the file the user just picked.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.dataUrl}
                      alt={`${slot.label} photo`}
                      className="plate-ground max-h-40 w-full object-contain"
                    />
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="section-rule font-serif text-xl">Specifics</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Which organs have to appear, plus measurements and short notes. This text is printed with the description. It does not draw an organ.
          </p>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Organs that must appear</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PLATE_ORGANS.map((organ) => {
              const checked = specifics.organs.includes(organ.id)
              return (
                <label key={organ.id} className="flex min-h-11 items-center gap-2 rounded-sm border border-foreground/40 bg-card px-3 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-current"
                    checked={checked}
                    onChange={() => toggleOrgan(organ.id)}
                  />
                  {organ.label}
                </label>
              )
            })}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="plate-measurements">Measurements</Label>
            <Textarea
              id="plate-measurements"
              rows={2}
              value={specifics.measurements}
              onChange={(event) => onSpecifics({ ...specifics, measurements: event.target.value })}
              placeholder="Petiole 1.5 cm. Capsule 8 mm."
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="plate-scale">Scale</Label>
            <Input
              id="plate-scale"
              className="h-11"
              value={specifics.scale}
              onChange={(event) => onSpecifics({ ...specifics, scale: event.target.value })}
              placeholder="Leaf life size, habit reduced"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="plate-pubescence">Pubescence</Label>
            <Textarea
              id="plate-pubescence"
              rows={2}
              value={specifics.pubescence}
              onChange={(event) => onSpecifics({ ...specifics, pubescence: event.target.value })}
              placeholder="Lower surface densely hairy"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="plate-stigmas">Branching stigmas</Label>
            <Textarea
              id="plate-stigmas"
              rows={2}
              value={specifics.stigmas}
              onChange={(event) => onSpecifics({ ...specifics, stigmas: event.target.value })}
              placeholder="Stigmas 3, branched"
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="plate-chambers">Capsule chambers</Label>
            <Textarea
              id="plate-chambers"
              rows={2}
              value={specifics.chambers}
              onChange={(event) => onSpecifics({ ...specifics, chambers: event.target.value })}
              placeholder="3 chambers"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <ChipGroup
          legend="Plate color"
          hint="Line only is the default. A tint, or the photo beside the line, still uses the pixels you uploaded."
          value={mode}
          options={PLATE_MODES.map((item) => ({ value: item.id, label: item.label }))}
          onChange={(value) => {
            if (isPlateMode(value)) onMode(value)
          }}
        />
        <PlateFigure status={plateStatus} url={plateUrl} error={plateError} caption={plateCaption} />
      </section>
    </div>
  )
}
