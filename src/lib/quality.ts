export interface QualityReport {
  blurScore: number
  brightness: number
  contrast: number
  warnings: string[]
  pass: boolean
}

export interface PhotoRead {
  dataUrl: string
  quality: QualityReport
}

type Decoded = {
  width: number
  height: number
  source: CanvasImageSource
  close: () => void
}

function luminance(data: Uint8ClampedArray, index: number): number {
  return 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]
}

function measure(source: CanvasImageSource, width: number, height: number): QualityReport {
  const maxEdge = 200
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  const w = Math.max(8, Math.round(width * scale))
  const h = Math.max(8, Math.round(height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) {
    return {
      blurScore: 0,
      brightness: 0,
      contrast: 0,
      warnings: ["This browser could not inspect the photo."],
      pass: false,
    }
  }
  context.drawImage(source, 0, 0, w, h)
  const pixels = context.getImageData(0, 0, w, h).data
  let brightSum = 0
  let brightSq = 0
  let lapSum = 0
  let lapSq = 0
  let count = 0
  const brightCount = w * h

  for (let i = 0; i < pixels.length; i += 4) {
    const y = luminance(pixels, i)
    brightSum += y
    brightSq += y * y
  }

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const center = luminance(pixels, (y * w + x) * 4)
      const up = luminance(pixels, ((y - 1) * w + x) * 4)
      const down = luminance(pixels, ((y + 1) * w + x) * 4)
      const left = luminance(pixels, (y * w + x - 1) * 4)
      const right = luminance(pixels, (y * w + x + 1) * 4)
      const lap = up + down + left + right - 4 * center
      lapSum += lap
      lapSq += lap * lap
      count += 1
    }
  }

  const brightness = brightSum / brightCount
  const contrast = Math.sqrt(Math.max(0, brightSq / brightCount - brightness * brightness))
  const meanLap = count ? lapSum / count : 0
  const blurScore = count ? lapSq / count - meanLap * meanLap : 0
  const warnings: string[] = []

  if (blurScore < 18) {
    warnings.push("This frame looks soft. Take another if the edges are fuzzy.")
  }
  if (brightness < 40) {
    warnings.push("This frame is very dark. Turn toward the light or wait for shade to lift.")
  }
  if (brightness > 225) {
    warnings.push("This frame is blown out. Step so the leaf is not in full glare.")
  }
  if (contrast < 15) {
    warnings.push("This frame looks flat. The subject may be out of view or blocked.")
  }

  return {
    blurScore,
    brightness,
    contrast,
    warnings,
    pass: warnings.length === 0,
  }
}

function paint(source: CanvasImageSource, width: number, height: number, maxEdge: number, quality: number): string {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext("2d")
  if (!context) return ""
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL("image/jpeg", quality)
}

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        close: () => bitmap.close(),
      }
    } catch {
      // Fall through to an HTML image. HEIC and some RAW files fail both paths.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error("format"))
      element.src = url
    })
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      source: image,
      close: () => undefined,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function readPhoto(file: File): Promise<PhotoRead> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Use a JPEG, PNG or WebP photo.")
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("That file is over 15 MB. Choose a smaller photo.")
  }

  let decoded: Decoded
  try {
    decoded = await decode(file)
  } catch {
    throw new Error("This photo format did not open. Use a JPEG or PNG.")
  }

  try {
    if (decoded.width < 32 || decoded.height < 32) {
      throw new Error("That image is too small to judge.")
    }
    const quality = measure(decoded.source, decoded.width, decoded.height)
    let dataUrl = paint(decoded.source, decoded.width, decoded.height, 1280, 0.72)
    if (dataUrl.length > 450_000) {
      dataUrl = paint(decoded.source, decoded.width, decoded.height, 960, 0.6)
    }
    if (dataUrl.length > 450_000) {
      dataUrl = paint(decoded.source, decoded.width, decoded.height, 720, 0.5)
    }
    if (!dataUrl) throw new Error("The photo could not be saved in the browser.")
    return { dataUrl, quality }
  } finally {
    decoded.close()
  }
}
