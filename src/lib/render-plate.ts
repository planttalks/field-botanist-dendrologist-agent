import { traceInk } from "@/lib/ink"
import { PLATE_SLOTS, type PlateMode, type PlateSlotId } from "@/lib/plate"

const WIDTH = 880
const MARGIN = 32
const CELL_H = 340
const GAP = 16
const GRID_TOP = 36

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("A photo on this plate could not be read."))
    image.src = url
  })
}

function fit(srcW: number, srcH: number, maxW: number, maxH: number): { width: number; height: number } {
  const scale = Math.min(maxW / srcW, maxH / srcH)
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  }
}

function tracedView(image: HTMLImageElement, maxW: number, maxH: number): { photo: HTMLCanvasElement; ink: HTMLCanvasElement } {
  const size = fit(image.naturalWidth, image.naturalHeight, maxW, maxH)
  const photo = document.createElement("canvas")
  photo.width = size.width
  photo.height = size.height
  const photoContext = photo.getContext("2d", { willReadFrequently: true })
  if (!photoContext) throw new Error("This browser could not trace that photo.")
  photoContext.drawImage(image, 0, 0, size.width, size.height)
  const pixels = photoContext.getImageData(0, 0, size.width, size.height)
  const traced = traceInk(pixels.data, size.width, size.height)
  const inkPixels = new Uint8ClampedArray(traced.length)
  inkPixels.set(traced)
  const ink = document.createElement("canvas")
  ink.width = size.width
  ink.height = size.height
  const inkContext = ink.getContext("2d")
  if (!inkContext) throw new Error("This browser could not trace that photo.")
  inkContext.putImageData(new ImageData(inkPixels, size.width, size.height), 0, 0)
  return { photo, ink }
}

function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function paintView(
  context: CanvasRenderingContext2D,
  mode: PlateMode,
  photo: HTMLCanvasElement,
  ink: HTMLCanvasElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
) {
  const drawContained = (source: CanvasImageSource, x: number, y: number, w: number, h: number, alpha: number) => {
    const srcW = source instanceof HTMLCanvasElement ? source.width : w
    const srcH = source instanceof HTMLCanvasElement ? source.height : h
    const size = fit(srcW, srcH, w, h)
    const dx = x + (w - size.width) / 2
    const dy = y + (h - size.height) / 2
    context.save()
    context.globalAlpha = alpha
    context.drawImage(source, dx, dy, size.width, size.height)
    context.restore()
  }

  switch (mode) {
    case "line":
      drawContained(ink, boxX, boxY, boxW, boxH, 1)
      break
    case "tint":
      drawContained(photo, boxX, boxY, boxW, boxH, 0.38)
      drawContained(ink, boxX, boxY, boxW, boxH, 1)
      break
    case "beside": {
      const half = (boxW - 8) / 2
      drawContained(ink, boxX, boxY, half, boxH, 1)
      drawContained(photo, boxX + half + 8, boxY, half, boxH, 1)
      break
    }
    default: {
      const exhaustive: never = mode
      throw new Error(`Unknown plate mode: ${String(exhaustive)}`)
    }
  }
}

export async function renderPlate(input: {
  photos: Record<PlateSlotId, string | null>
  mode: PlateMode
  nameLine: string
  binomial?: string | null
  lines: string[]
}): Promise<string> {
  const loaded = new Map<PlateSlotId, { photo: HTMLCanvasElement; ink: HTMLCanvasElement }>()
  const cellW = (WIDTH - MARGIN * 2 - GAP) / 2
  const contentW = cellW - 16
  const contentH = CELL_H - 56
  for (const slot of PLATE_SLOTS) {
    const url = input.photos[slot.id]
    if (!url) continue
    const image = await loadImage(url)
    const maxW = input.mode === "beside" ? (contentW - 8) / 2 : contentW
    loaded.set(slot.id, tracedView(image, maxW, contentH))
  }

  const measure = document.createElement("canvas").getContext("2d")
  if (!measure) throw new Error("This browser could not draw the plate.")
  measure.font = "20px Georgia, 'Times New Roman', serif"
  const textWidth = WIDTH - MARGIN * 2
  const binomial = input.binomial && input.nameLine.startsWith(input.binomial) ? input.binomial : null
  measure.font = "italic 24px Georgia, 'Times New Roman', serif"
  const nameFits =
    binomial !== null && measure.measureText(input.nameLine).width <= textWidth
  const nameLines = nameFits ? [input.nameLine] : wrap(measure, input.nameLine, textWidth)
  measure.font = "20px Georgia, 'Times New Roman', serif"
  const body = input.lines.flatMap((line) => wrap(measure, line, textWidth))
  const captionHeight = 28 + nameLines.length * 28 + body.length * 26 + 24
  const height = GRID_TOP + CELL_H * 2 + GAP + captionHeight

  const canvas = document.createElement("canvas")
  canvas.width = WIDTH
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("This browser could not draw the plate.")
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, WIDTH, height)
  context.fillStyle = "#444444"
  context.font = "14px Georgia, 'Times New Roman', serif"
  context.fillText("Traced from photographs. Empty views were not drawn.", MARGIN, 22)

  PLATE_SLOTS.forEach((slot, index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = MARGIN + column * (cellW + GAP)
    const y = GRID_TOP + row * (CELL_H + GAP)
    context.strokeStyle = "#d4d4d4"
    context.lineWidth = 1
    context.strokeRect(x + 0.5, y + 0.5, cellW - 1, CELL_H - 1)
    context.fillStyle = "#111111"
    context.font = "22px Georgia, 'Times New Roman', serif"
    context.fillText(`${slot.letter}. ${slot.label}`, x + 10, y + 28)
    const view = loaded.get(slot.id)
    if (!view) {
      context.fillStyle = "#666666"
      context.font = "16px Georgia, 'Times New Roman', serif"
      context.fillText("Not photographed", x + 10, y + 56)
      return
    }
    paintView(context, input.mode, view.photo, view.ink, x + 8, y + 40, contentW, contentH)
  })

  let textY = GRID_TOP + CELL_H * 2 + GAP + 28
  context.fillStyle = "#111111"
  if (nameFits && binomial) {
    context.font = "italic 24px Georgia, 'Times New Roman', serif"
    context.fillText(binomial, MARGIN, textY)
    const binomialWidth = context.measureText(binomial).width
    context.font = "24px Georgia, 'Times New Roman', serif"
    context.fillText(input.nameLine.slice(binomial.length), MARGIN + binomialWidth, textY)
    textY += 28
  } else {
    context.font = "24px Georgia, 'Times New Roman', serif"
    for (const line of nameLines) {
      context.fillText(line, MARGIN, textY)
      textY += 28
    }
  }
  context.font = "20px Georgia, 'Times New Roman', serif"
  for (const line of body) {
    context.fillText(line, MARGIN, textY)
    textY += 26
  }

  let url = canvas.toDataURL("image/png")
  if (url.length > 480_000) url = canvas.toDataURL("image/jpeg", 0.86)
  if (url.length > 480_000) url = canvas.toDataURL("image/jpeg", 0.72)
  if (!url) throw new Error("The plate could not be saved in the browser.")
  return url
}
