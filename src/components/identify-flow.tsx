"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChipGroup } from "@/components/chip-group"
import { PlateStep, type SlotDraft } from "@/components/plate-step"
import { ResultPanel } from "@/components/result-panel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { missingPointCopy } from "@/lib/geo"
import { saveSpecimen } from "@/lib/journal"
import { identify } from "@/lib/identify"
import {
  blankSpecifics,
  plateCopy,
  PLATE_SLOTS,
  specificsActive,
  type IllustrationPlate,
  type PlateMode,
  type PlateNameState,
  type PlateSlotId,
  type PlateSpecifics,
} from "@/lib/plate"
import { renderPlate } from "@/lib/render-plate"
import { readPhoto, type QualityReport } from "@/lib/quality"
import { isRegion, regionFromLatLon, regionLabel, REGIONS, type Region } from "@/lib/regions"
import { SAMPLES } from "@/lib/samples"
import {
  ARRANGEMENTS,
  BARKS,
  BUDS,
  EXUDATES,
  FASCICLES,
  FRUITS,
  HABITS,
  LEAF_TYPES,
  LOBES,
  MARGINS,
  ORGANS,
  PETIOLES,
  REPRODUCTIVE,
  ROOTS,
  SCENTS,
  SHAPES,
  SITES,
  TEXTURES,
  VENATIONS,
  blankObservation,
  type CharacterKey,
  type Observation,
  type Organ,
} from "@/lib/types"

type Step = "place" | "photo" | "characters" | "plate" | "result"

const STEPS: { id: Step; label: string }[] = [
  { id: "place", label: "Place" },
  { id: "photo", label: "Photo" },
  { id: "characters", label: "Characters" },
  { id: "plate", label: "Plate" },
  { id: "result", label: "Name" },
]

function blankSlots(): Record<PlateSlotId, SlotDraft> {
  return {
    habit: { status: "empty", dataUrl: null, error: "" },
    leaf: { status: "empty", dataUrl: null, error: "" },
    "flower-fruit": { status: "empty", dataUrl: null, error: "" },
    detail: { status: "empty", dataUrl: null, error: "" },
  }
}

function parseMeasure(text: string): { value: number | null; error: string } {
  const trimmed = text.trim()
  if (!trimmed) return { value: null, error: "" }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value <= 0 || value > 500) {
    return { value: null, error: "Use centimeters, above 0 and under 500." }
  }
  return { value, error: "" }
}

function organEmphasis(organ: Organ): "leaves" | "wood" | "flower" | null {
  if (organ === "leaf") return "leaves"
  if (organ === "bark" || organ === "bud" || organ === "roots") return "wood"
  if (organ === "flower" || organ === "fruit") return "flower"
  return null
}

export function IdentifyFlow() {
  const [step, setStep] = useState<Step>("place")
  const [scoring, setScoring] = useState(false)
  const [region, setRegion] = useState<Region | "">("")
  const [locality, setLocality] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [elevation, setElevation] = useState<number | null>(null)
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [geoError, setGeoError] = useState("")
  const [observation, setObservation] = useState<Observation>(blankObservation())
  const [photo, setPhoto] = useState<string | null>(null)
  const [quality, setQuality] = useState<QualityReport | null>(null)
  const [photoStatus, setPhotoStatus] = useState<"empty" | "loading" | "ready" | "error">("empty")
  const [photoError, setPhotoError] = useState("")
  const [lengthText, setLengthText] = useState("")
  const [widthText, setWidthText] = useState("")
  const [habitat, setHabitat] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [savedId, setSavedId] = useState<string | null>(null)
  const [photoDropped, setPhotoDropped] = useState(false)
  const [plateDropped, setPlateDropped] = useState(false)
  const [slots, setSlots] = useState<Record<PlateSlotId, SlotDraft>>(blankSlots)
  const [specifics, setSpecifics] = useState<PlateSpecifics>(blankSpecifics)
  const [plateMode, setPlateMode] = useState<PlateMode>("line")
  const [plateUrl, setPlateUrl] = useState<string | null>(null)
  const [plateStatus, setPlateStatus] = useState<"empty" | "loading" | "ready" | "error">("empty")
  const [plateError, setPlateError] = useState("")
  const [chosenTaxonId, setChosenTaxonId] = useState<string | null>(null)
  const plateRequest = useRef(0)

  const length = parseMeasure(lengthText)
  const width = parseMeasure(widthText)
  const regionValue = region || null
  const liveObservation = useMemo(
    () => ({
      ...observation,
      lengthCm: length.value,
      widthCm: width.value,
    }),
    [observation, length.value, width.value],
  )
  const identification = useMemo(
    () => identify(liveObservation, regionValue, locality),
    [liveObservation, regionValue, locality],
  )
  const slotPhotos = useMemo(() => {
    const photos = {} as Record<PlateSlotId, string | null>
    for (const slot of PLATE_SLOTS) {
      const draft = slots[slot.id]
      photos[slot.id] = draft.status === "ready" ? draft.dataUrl : null
    }
    return photos
  }, [slots])
  const present = useMemo(() => {
    const flags = {} as Record<PlateSlotId, boolean>
    for (const slot of PLATE_SLOTS) flags[slot.id] = Boolean(slotPhotos[slot.id])
    return flags
  }, [slotPhotos])
  const slotPending = PLATE_SLOTS.some((slot) => slots[slot.id].status === "loading")
  const hypothesisTaxon = useMemo(() => {
    if (step !== "result" || identification.noMatch) return null
    const picked = chosenTaxonId
      ? identification.candidates.find((candidate) => candidate.taxon.id === chosenTaxonId)
      : undefined
    return (picked ?? identification.candidates[0])?.taxon ?? null
  }, [step, identification, chosenTaxonId])
  const nameState: PlateNameState = step !== "result" ? "pending" : hypothesisTaxon ? "hypothesis" : "unidentified"
  const copy = useMemo(
    () =>
      plateCopy({
        scientificName: hypothesisTaxon?.scientificName ?? null,
        nameKind: hypothesisTaxon?.nameKind,
        nameState,
        present,
        specifics,
        lengthCm: liveObservation.lengthCm,
        widthCm: liveObservation.widthCm,
      }),
    [hypothesisTaxon, nameState, present, specifics, liveObservation.lengthCm, liveObservation.widthCm],
  )
  const plateWanted = PLATE_SLOTS.some((slot) => present[slot.id]) || specificsActive(specifics)

  useEffect(() => {
    if (slotPending) {
      setPlateStatus((current) => (current === "ready" ? "ready" : "loading"))
      return
    }
    if (!plateWanted) {
      setPlateUrl(null)
      setPlateStatus("empty")
      setPlateError("")
      return
    }
    const request = plateRequest.current + 1
    plateRequest.current = request
    setPlateStatus((current) => (current === "ready" ? "ready" : "loading"))
    const timer = window.setTimeout(() => {
      void renderPlate({
        photos: slotPhotos,
        mode: plateMode,
        nameLine: copy.nameLine,
        binomial: copy.binomial,
        lines: copy.lines,
      })
        .then((url) => {
          if (plateRequest.current !== request) return
          setPlateUrl(url)
          setPlateStatus("ready")
          setPlateError("")
        })
        .catch((error: unknown) => {
          if (plateRequest.current !== request) return
          setPlateUrl(null)
          setPlateStatus("error")
          setPlateError(error instanceof Error ? error.message : "The plate could not be drawn.")
        })
    }, 160)
    return () => window.clearTimeout(timer)
  }, [slotPending, plateWanted, slotPhotos, plateMode, copy.nameLine, copy.binomial, copy.lines])

  function setCharacter(key: CharacterKey, value: string) {
    setObservation((current) => ({ ...current, [key]: value }))
    setSavedId(null)
  }

  function go(next: Step) {
    if (next === "result") {
      setScoring(true)
      window.setTimeout(() => setScoring(false), 320)
    }
    setStep(next)
  }

  function locate() {
    setGeoError("")
    if (!navigator.geolocation) {
      setGeoStatus("error")
      setGeoError("This browser does not share location. Pick a region instead.")
      return
    }
    setGeoStatus("loading")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        setLatitude(lat)
        setLongitude(lon)
        setElevation(
          typeof position.coords.altitude === "number" ? Math.round(position.coords.altitude) : null,
        )
        const guessed = regionFromLatLon(lat, lon)
        if (guessed) setRegion(guessed)
        setGeoStatus("ready")
      },
      (error) => {
        setGeoStatus("error")
        setGeoError(missingPointCopy(error.code).detail)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setPhotoStatus("loading")
    setPhotoError("")
    setSavedId(null)
    try {
      const result = await readPhoto(file)
      setPhoto(result.dataUrl)
      setQuality(result.quality)
      setPhotoStatus("ready")
    } catch (error) {
      setPhoto(null)
      setQuality(null)
      setPhotoStatus("error")
      setPhotoError(error instanceof Error ? error.message : "The photo could not be read.")
    }
  }

  async function onSlotFile(slot: PlateSlotId, file: File | undefined) {
    if (!file) return
    setSlots((current) => ({ ...current, [slot]: { status: "loading", dataUrl: null, error: "" } }))
    setSavedId(null)
    try {
      const result = await readPhoto(file)
      setSlots((current) => ({ ...current, [slot]: { status: "ready", dataUrl: result.dataUrl, error: "" } }))
    } catch (error) {
      setSlots((current) => ({
        ...current,
        [slot]: {
          status: "error",
          dataUrl: null,
          error: error instanceof Error ? error.message : "The photo could not be read.",
        },
      }))
    }
  }

  function onUseVoucher(slot: PlateSlotId) {
    if (!photo) return
    setSlots((current) => ({ ...current, [slot]: { status: "ready", dataUrl: photo, error: "" } }))
    setSavedId(null)
  }

  function onClearSlot(slot: PlateSlotId) {
    setSlots((current) => ({ ...current, [slot]: { status: "empty", dataUrl: null, error: "" } }))
    setSavedId(null)
  }

  function updateSpecifics(next: PlateSpecifics) {
    setSpecifics(next)
    setSavedId(null)
  }

  function applySample(id: string) {
    const sample = SAMPLES.find((item) => item.id === id)
    if (!sample) return
    setObservation(sample.observation)
    setRegion(sample.region)
    setLocality(sample.locality)
    setLengthText("")
    setWidthText("")
    setSavedId(null)
    go("result")
  }

  async function save(taxonId: string | null) {
    setSaving(true)
    setSaveError("")
    setPhotoDropped(false)
    setPlateDropped(false)
    try {
      if (slotPending) {
        setSaveError("A plate photo is still opening. Wait a moment, then save.")
        return
      }
      const chosen = taxonId
        ? identification.candidates.find((candidate) => candidate.taxon.id === taxonId)
        : undefined
      const savedCopy = plateCopy({
        scientificName: chosen?.taxon.scientificName ?? null,
        nameKind: chosen?.taxon.nameKind,
        nameState: chosen ? "hypothesis" : "unidentified",
        present,
        specifics,
        lengthCm: liveObservation.lengthCm,
        widthCm: liveObservation.widthCm,
      })
      let illustration: IllustrationPlate | null = null
      if (plateWanted) {
        const dataUrl = await renderPlate({
          photos: slotPhotos,
          mode: plateMode,
          nameLine: savedCopy.nameLine,
          binomial: savedCopy.binomial,
          lines: savedCopy.lines,
        })
        illustration = {
          dataUrl,
          dropped: false,
          mode: plateMode,
          views: savedCopy.views,
          caption: savedCopy.caption,
          scaleNote: savedCopy.scaleNote,
          organsRequested: specifics.organs,
          measurements: specifics.measurements.trim(),
          pubescence: specifics.pubescence.trim(),
          stigmas: specifics.stigmas.trim(),
          chambers: specifics.chambers.trim(),
        }
      }
      const record = saveSpecimen({
        locality,
        region: regionValue,
        latitude,
        longitude,
        elevationM: elevation,
        habitat,
        notes,
        photoDataUrl: photo,
        qualityWarnings: quality?.warnings ?? [],
        observation: liveObservation,
        identification,
        taxonId,
        illustration,
      })
      setPhotoDropped(record.photoDropped)
      setPlateDropped(record.illustration?.dropped ?? false)
      setSavedId(record.id)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "The record was not saved.")
    } finally {
      setSaving(false)
    }
  }

  const stepIndex = STEPS.findIndex((item) => item.id === step)
  const emphasis = organEmphasis(observation.organ)

  return (
    <div className="space-y-6 pb-28">
      <header className="space-y-2 border-b border-foreground/35 pb-4">
        <p className="sheet-kicker">Worksheet</p>
        <h1 className="font-serif text-3xl leading-tight tracking-tight">New sheet</h1>
        <p className="max-w-2xl text-sm leading-relaxed">
          Record the place. Add a photograph if one is available. Mark only visible organs. Then prepare the plate. The name is a field hypothesis.
        </p>
      </header>

      <ol className="grid grid-cols-5 border border-foreground" aria-label="Steps">
        {STEPS.map((item, index) => {
          const active = item.id === step
          const done = index < stepIndex
          return (
            <li key={item.id} className="border-r border-foreground last:border-r-0">
              <button
                type="button"
                disabled={!done && !active}
                onClick={() => {
                  if (done) setStep(item.id)
                }}
                className={`flex min-h-12 w-full flex-col items-center justify-center px-0.5 py-1 text-center text-[0.7rem] leading-tight sm:text-sm ${
                  active
                    ? "bg-foreground text-background"
                    : done
                      ? "bg-card text-foreground"
                      : "bg-background text-muted-foreground"
                }`}
                aria-current={active ? "step" : undefined}
              >
                <span className="text-[0.62rem] tracking-widest">{index + 1}</span>
                {item.label}
              </button>
            </li>
          )
        })}
      </ol>

      {step === "place" ? (
        <div className="space-y-5">
          <div className="grid gap-1.5">
            <Label htmlFor="locality">Locality</Label>
            <Input
              id="locality"
              className="h-11"
              value={locality}
              onChange={(event) => setLocality(event.target.value)}
              placeholder="Trail junction, street, beach, garden bed"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="region">Region</Label>
            <select
              id="region"
              className="field-select"
              value={region}
              onChange={(event) => {
                const value = event.target.value
                setRegion(isRegion(value) ? value : "")
              }}
            >
              <option value="">Not sure</option>
              {REGIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground">
              The boxes are coarse. Taiwan sits in East Asia. The whole of New Guinea, including the western half, sits with the Pacific islands. Override the guess if it looks wrong.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" className="h-11" onClick={locate} disabled={geoStatus === "loading"}>
              {geoStatus === "loading" ? "Finding you..." : "Use this phone's location"}
            </Button>
            {geoStatus === "ready" && latitude !== null && longitude !== null ? (
              <p className="text-sm">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
                {elevation !== null ? `, about ${elevation} m` : ""}. Suggested region: {regionLabel(regionValue)}.
              </p>
            ) : null}
          </div>
          {geoStatus === "error" && latitude === null ? (
            <Alert>
              <AlertTitle>The point is missing</AlertTitle>
              <AlertDescription>{geoError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium">No plant in front of you? Try a worked example.</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((sample) => (
                <Button key={sample.id} type="button" variant="secondary" className="h-11" onClick={() => applySample(sample.id)}>
                  {sample.title}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === "photo" ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed">
            The photo is the voucher. It is not sent anywhere. You can skip it and still use the key. The camera and a file upload work with no signal.
          </p>
          <div className="flex flex-wrap gap-2">
            <Label className="h-11 cursor-pointer rounded-sm border bg-primary px-4 py-2 text-primary-foreground">
              Take a photo
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => void onFile(event.target.files?.[0])}
              />
            </Label>
            <Label className="h-11 cursor-pointer rounded-sm border border-foreground/45 bg-card px-4 py-2">
              Upload a photo
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => void onFile(event.target.files?.[0])}
              />
            </Label>
          </div>
          <div aria-live="polite" className="min-h-16">
            {photoStatus === "empty" ? (
              <div className="ink-empty text-sm">
                No photo yet. Leaves, flowers, fruit and bark are more useful than a distant crown.
              </div>
            ) : null}
            {photoStatus === "loading" ? <p className="text-sm">Checking the frame...</p> : null}
            {photoStatus === "error" ? (
              <Alert variant="destructive">
                <AlertTitle>The photo did not open</AlertTitle>
                <AlertDescription>{photoError}</AlertDescription>
              </Alert>
            ) : null}
            {photoStatus === "ready" && photo ? (
              <div className="space-y-3">
                {/* User photos are local data URLs, not remote content images. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="The plant frame you chose" className="plate-ground max-h-80 w-full object-contain" />
                {quality?.pass ? (
                  <p className="text-sm">The frame is sharp enough to keep.</p>
                ) : (
                  <Alert>
                    <AlertTitle>Take another if you can</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc space-y-1 pl-4">
                        {quality?.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === "characters" ? (
        <div className="space-y-6">
          <ChipGroup
            legend="What is in the frame?"
            value={observation.organ}
            options={ORGANS.map((item) => ({ value: item.value, label: item.label }))}
            onChange={(value) => setObservation((current) => ({ ...current, organ: value as Organ }))}
          />
          <ChipGroup
            legend="Growth form"
            hint="Pick the closest. A banana is a giant herb. A palm can be marked as a palm."
            value={observation.habit}
            options={HABITS}
            onChange={(value) => setCharacter("habit", value)}
          />
          <div className="space-y-4">
            <h2 className="section-rule font-serif text-xl">Leaves</h2>
            <ChipGroup
              legend="Arrangement"
              emphasized={emphasis === "leaves"}
              value={observation.arrangement}
              options={ARRANGEMENTS}
              onChange={(value) => setCharacter("arrangement", value)}
            />
            <ChipGroup
              legend="Leaf type"
              value={observation.leafType}
              options={LEAF_TYPES}
              onChange={(value) => setCharacter("leafType", value)}
            />
            <ChipGroup legend="Shape" value={observation.shape} options={SHAPES} onChange={(value) => setCharacter("shape", value)} />
            <ChipGroup
              legend="Margin"
              hint="On a lobed leaf, score the edge of one lobe, not the gap between lobes."
              value={observation.margin}
              options={MARGINS}
              onChange={(value) => setCharacter("margin", value)}
            />
            <ChipGroup
              legend="Veins"
              value={observation.venation}
              options={VENATIONS}
              onChange={(value) => setCharacter("venation", value)}
            />
            <ChipGroup
              legend="Surface"
              value={observation.texture}
              options={TEXTURES}
              onChange={(value) => setCharacter("texture", value)}
            />
            <ChipGroup
              legend="Petiole"
              value={observation.petiole}
              options={PETIOLES}
              onChange={(value) => setCharacter("petiole", value)}
            />
            <ChipGroup legend="Lobes" value={observation.lobes} options={LOBES} onChange={(value) => setCharacter("lobes", value)} />
            <ChipGroup
              legend="Needles"
              hint="Skip this if the plant is not a conifer."
              value={observation.fascicle}
              options={FASCICLES}
              onChange={(value) => setCharacter("fascicle", value)}
            />
          </div>
          <div className="space-y-4">
            <h2 className="section-rule font-serif text-xl">Bark, buds and roots</h2>
            <ChipGroup
              legend="Bark"
              emphasized={emphasis === "wood"}
              value={observation.bark}
              options={BARKS}
              onChange={(value) => setCharacter("bark", value)}
            />
            <ChipGroup
              legend="Sap, if a stem is already broken"
              hint="Do not cut a healthy stem. Use sap only when a break is already open."
              value={observation.exudate}
              options={EXUDATES}
              onChange={(value) => setCharacter("exudate", value)}
            />
            <ChipGroup legend="Buds" value={observation.buds} options={BUDS} onChange={(value) => setCharacter("buds", value)} />
            <ChipGroup legend="Roots" value={observation.roots} options={ROOTS} onChange={(value) => setCharacter("roots", value)} />
          </div>
          <div className="space-y-4">
            <h2 className="section-rule font-serif text-xl">Flowers, fruit and place</h2>
            <ChipGroup
              legend="Flowers or cones"
              emphasized={emphasis === "flower"}
              value={observation.reproductive}
              options={REPRODUCTIVE}
              onChange={(value) => setCharacter("reproductive", value)}
            />
            <ChipGroup legend="Fruit" value={observation.fruit} options={FRUITS} onChange={(value) => setCharacter("fruit", value)} />
            <ChipGroup
              legend="Leaf smell"
              hint="Smell a scrap you already crushed. Skip this if the plant might be poisonous."
              value={observation.scent}
              options={SCENTS}
              onChange={(value) => setCharacter("scent", value)}
            />
            <ChipGroup legend="Where it is growing" value={observation.site} options={SITES} onChange={(value) => setCharacter("site", value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="length">Lamina length (cm)</Label>
              <Input
                id="length"
                className="h-11"
                inputMode="decimal"
                value={lengthText}
                onChange={(event) => setLengthText(event.target.value)}
                placeholder="Optional"
                aria-invalid={length.error ? true : undefined}
              />
              {length.error ? <p className="text-sm text-destructive">{length.error}</p> : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="width">Lamina width (cm)</Label>
              <Input
                id="width"
                className="h-11"
                inputMode="decimal"
                value={widthText}
                onChange={(event) => setWidthText(event.target.value)}
                placeholder="Optional"
                aria-invalid={width.error ? true : undefined}
              />
              {width.error ? <p className="text-sm text-destructive">{width.error}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {step === "plate" ? (
        <PlateStep
          slots={slots}
          voucherUrl={photo}
          specifics={specifics}
          mode={plateMode}
          plateStatus={plateStatus}
          plateUrl={plateUrl}
          plateError={plateError}
          plateCaption={copy.caption}
          onFile={(slot, file) => void onSlotFile(slot, file)}
          onUseVoucher={onUseVoucher}
          onClear={onClearSlot}
          onSpecifics={updateSpecifics}
          onMode={(mode) => {
            setPlateMode(mode)
            setSavedId(null)
          }}
        />
      ) : null}

      {step === "result" ? (
        scoring ? (
          <p className="text-sm" aria-live="polite">
            Reading the sheet...
          </p>
        ) : (
          <ResultPanel
            observation={liveObservation}
            region={regionValue}
            locality={locality}
            identification={identification}
            habitat={habitat}
            notes={notes}
            onHabitat={setHabitat}
            onNotes={setNotes}
            onSplit={(value) => {
              if (!identification.split) return
              setCharacter(identification.split.key, value)
            }}
            onSave={save}
            saving={saving}
            saveError={saveError}
            savedId={savedId}
            photoDropped={photoDropped}
            plateDropped={plateDropped}
            plateStatus={plateStatus}
            plateUrl={plateUrl}
            plateError={plateError}
            plateCaption={copy.caption}
            onChosen={setChosenTaxonId}
            pointMissing={geoStatus === "error" && latitude === null}
          />
        )
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-foreground bg-background px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-4xl gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={stepIndex === 0}
            onClick={() => setStep(STEPS[stepIndex - 1].id)}
          >
            Back
          </Button>
          {step !== "result" ? (
            <Button type="button" className="h-11" onClick={() => go(STEPS[stepIndex + 1].id)}>
              {step === "photo" && quality && !quality.pass
                ? "Use this frame anyway"
                : step === "photo"
                  ? "Continue"
                  : "Next"}
            </Button>
          ) : (
            <Button type="button" variant="outline" className="h-11" onClick={() => setStep("characters")}>
              Change characters
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
