/** Line work from real pixels. Flat areas stay blank. */

export function toGray(rgba: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height)
  const count = width * height
  for (let i = 0, p = 0; i < count * 4; i += 4, p += 1) {
    gray[p] = 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]
  }
  return gray
}

export function sobel(
  gray: Float32Array,
  width: number,
  height: number,
): { magnitude: Float32Array; gx: Float32Array; gy: Float32Array } {
  const magnitude = new Float32Array(width * height)
  const gx = new Float32Array(width * height)
  const gy = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x
      const left = gray[i - 1]
      const right = gray[i + 1]
      const up = gray[i - width]
      const down = gray[i + width]
      const upLeft = gray[i - width - 1]
      const upRight = gray[i - width + 1]
      const downLeft = gray[i + width - 1]
      const downRight = gray[i + width + 1]
      const gxValue = -upLeft + upRight - 2 * left + 2 * right - downLeft + downRight
      const gyValue = -upLeft - 2 * up - upRight + downLeft + 2 * down + downRight
      gx[i] = gxValue
      gy[i] = gyValue
      magnitude[i] = Math.hypot(gxValue, gyValue)
    }
  }
  return { magnitude, gx, gy }
}

function ridgeAt(
  magnitude: Float32Array,
  gx: Float32Array,
  gy: Float32Array,
  width: number,
  index: number,
): boolean {
  const strength = magnitude[index]
  if (strength <= 0) return false
  const ax = Math.abs(gx[index])
  const ay = Math.abs(gy[index])
  let behind = 0
  let ahead = 0
  if (ay > ax * 2) {
    behind = magnitude[index - width]
    ahead = magnitude[index + width]
  } else if (ax > ay * 2) {
    behind = magnitude[index - 1]
    ahead = magnitude[index + 1]
  } else if (gx[index] * gy[index] > 0) {
    behind = magnitude[index - width - 1]
    ahead = magnitude[index + width + 1]
  } else {
    behind = magnitude[index - width + 1]
    ahead = magnitude[index + width - 1]
  }
  return strength >= behind && strength >= ahead
}

export function traceInk(rgba: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length)
  if (width < 3 || height < 3) return out
  const gray = toGray(rgba, width, height)
  const { magnitude, gx, gy } = sobel(gray, width, height)
  let max = 0
  for (let i = 0; i < magnitude.length; i += 1) {
    if (magnitude[i] > max) max = magnitude[i]
  }
  if (max < 12) return out
  const cutoff = Math.max(12, max * 0.16)
  const mask = new Uint8Array(width * height)
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x
      if (magnitude[i] >= cutoff && ridgeAt(magnitude, gx, gy, width, i)) mask[i] = 1
    }
  }
  const thick = new Uint8Array(mask)
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x
      if (!mask[i]) continue
      thick[i - 1] = 1
      thick[i + 1] = 1
      thick[i - width] = 1
      thick[i + width] = 1
    }
  }
  for (let i = 0; i < thick.length; i += 1) {
    if (!thick[i]) continue
    const offset = i * 4
    out[offset] = 17
    out[offset + 1] = 17
    out[offset + 2] = 17
    out[offset + 3] = 255
  }
  return out
}
