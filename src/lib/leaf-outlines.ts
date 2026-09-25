/**
 * Black identification-chart outlines for the scored leaf terms.
 * The paths are original. They are not traced from a published figure.
 */

export type ChartPoint = { x: number; y: number }

export type ChartOutline = {
  d: string
  points: ChartPoint[]
}

const BASE = 4
const APEX = -166

function round(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1)
}

function polyline(points: ChartPoint[], close = true): string {
  if (points.length === 0) return ""
  const [first, ...rest] = points
  const body = rest.map((point) => `L ${round(point.x)} ${round(point.y)}`).join(" ")
  return `M ${round(first.x)} ${round(first.y)} ${body}${close ? " Z" : ""}`
}

function fromHalfWidth(
  widthAt: (t: number) => number,
  samples = 64,
  y0 = BASE,
  y1 = APEX,
): ChartOutline {
  const right: ChartPoint[] = []
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples
    right.push({ x: widthAt(t), y: y0 + (y1 - y0) * t })
  }
  const left = right
    .slice(1, -1)
    .reverse()
    .map((point) => ({ x: -point.x, y: point.y }))
  const points = [...right, ...left]
  return { d: polyline(points), points }
}

function ovateWidth(t: number): number {
  return 50 * Math.sin(Math.PI * Math.pow(t, 0.55))
}

function lanceolateWidth(t: number): number {
  const peak = 0.3
  const rise = t < peak ? Math.sin((t / peak) * (Math.PI / 2)) : Math.cos(((t - peak) / (1 - peak)) * (Math.PI / 2))
  return 18 * rise
}

function linearWidth(t: number): number {
  const half = 6.5
  const tip = 0.07
  if (t < tip) return half * Math.sin((t / tip) * (Math.PI / 2))
  if (t > 1 - tip) return half * Math.sin(((1 - t) / tip) * (Math.PI / 2))
  return half
}

function ellipticWidth(t: number): number {
  return 42 * Math.sin(Math.PI * t)
}

function padWidth(t: number): number {
  return 52 * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.2)), 0.5)
}

function pinnatePairs(lobes: string | null): number {
  if (lobes === "three") return 1
  if (lobes === "many") return 4
  return 2
}

function palmateCount(lobes: string | null): 3 | 5 | 7 {
  if (lobes === "three") return 3
  if (lobes === "many") return 7
  return 5
}

function pinnateWidth(t: number, pairs: number): number {
  const maxW = 70
  const sinusW = 16
  const centers: number[] = []
  if (pairs === 1) centers.push(0.4)
  else {
    for (let index = 0; index < pairs; index += 1) {
      centers.push(0.14 + (0.58 * index) / (pairs - 1))
    }
  }
  const sigma = pairs >= 4 ? 0.048 : 0.062
  let signal = 0
  for (const center of centers) {
    signal = Math.max(signal, Math.exp(-(((t - center) / sigma) ** 2)))
  }
  const terminal = Math.exp(-(((t - 0.93) / 0.055) ** 2))
  signal = Math.max(signal, terminal * 0.9)
  const base = Math.min(1, t / 0.08)
  const tip = Math.min(1, (1 - t) / 0.04)
  const env = Math.sin((Math.PI / 2) * Math.min(base, tip))
  return (sinusW + (maxW - sinusW) * signal) * (0.25 + 0.75 * env)
}

function mirrorRight(right: ChartPoint[]): ChartOutline {
  const left = right
    .slice(1, -1)
    .reverse()
    .map((point) => ({ x: -point.x, y: point.y }))
  const points = [...right, ...left]
  return { d: polyline(points), points }
}

function cordateOutline(): ChartOutline {
  const right: ChartPoint[] = [
    { x: 0, y: 2 },
    { x: 16, y: 10 },
    { x: 36, y: 22 },
    { x: 58, y: 18 },
    { x: 66, y: 0 },
    { x: 58, y: -28 },
    { x: 44, y: -70 },
    { x: 26, y: -118 },
    { x: 10, y: -152 },
    { x: 0, y: -166 },
  ]
  return mirrorRight(smoothOpen(right, 7))
}

function fanOutline(): ChartOutline {
  const points: ChartPoint[] = [{ x: 0, y: 6 }]
  const spread = 1.05
  const radius = 148
  const steps = 48
  for (let index = 0; index <= steps; index += 1) {
    const angle = spread - (2 * spread * index) / steps
    const notch = Math.exp(-((angle / 0.2) ** 2)) * 16
    const reach = radius - notch
    points.push({
      x: Math.sin(angle) * reach * 0.58,
      y: 6 - Math.cos(angle) * reach,
    })
  }
  return { d: polyline(points), points }
}

function smoothOpen(anchors: ChartPoint[], samplesPer: number): ChartPoint[] {
  if (anchors.length < 2) return anchors
  const out: ChartPoint[] = []
  for (let index = 0; index < anchors.length - 1; index += 1) {
    const p0 = anchors[Math.max(0, index - 1)]
    const p1 = anchors[index]
    const p2 = anchors[index + 1]
    const p3 = anchors[Math.min(anchors.length - 1, index + 2)]
    for (let step = 0; step < samplesPer; step += 1) {
      const t = step / samplesPer
      const t2 = t * t
      const t3 = t2 * t
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      })
    }
  }
  out.push(anchors[anchors.length - 1])
  return out
}

function polar(angle: number, length: number): ChartPoint {
  return { x: Math.sin(angle) * length, y: -Math.cos(angle) * length }
}

function palmateOutline(count: 3 | 5 | 7): ChartOutline {
  const lobes = count
  const max = count === 3 ? 1.05 : count === 7 ? 1.5 : 1.28
  const tipAngles: number[] = []
  for (let index = 0; index < lobes; index += 1) {
    const t = lobes === 1 ? 0 : index / (lobes - 1)
    tipAngles.push((t * 2 - 1) * max)
  }
  const gap = (2 * max) / Math.max(lobes - 1, 1)
  const sinus = 28
  const points: ChartPoint[] = []
  const steps = 120
  const spread = max + 0.22
  for (let index = 0; index <= steps; index += 1) {
    const angle = spread - (2 * spread * index) / steps
    let reach = sinus
    for (const tip of tipAngles) {
      const distance = Math.abs(angle - tip)
      const width = gap * 0.46
      const unit = Math.max(0, 1 - distance / width)
      const peak = Math.sin((unit * Math.PI) / 2) ** 0.55
      const tipLength = Math.abs(tip) < 0.02 ? 162 : 118 + (1 - Math.abs(tip) / max) * 22
      reach = Math.max(reach, sinus + (tipLength - sinus) * peak)
    }
    const shoulder = (Math.abs(angle) - max) / 0.22
    if (shoulder > 0) reach = reach * (1 - shoulder) + 10 * shoulder
    points.push(polar(angle, Math.max(10, reach)))
  }
  points.push({ x: 0, y: 12 })
  return { d: polyline(points), points }
}

function needleWidth(t: number): number {
  if (t > 0.9) return 3.1 * ((1 - t) / 0.1)
  if (t < 0.08) return 3.1 * (t / 0.08)
  return 3.1
}

export function needleOutline(): ChartOutline {
  return fromHalfWidth(needleWidth, 28, 6, -152)
}

export type TurnedOutline = { d: string; rotate: number; pivotY: number }

export function needleParts(mode: "one" | "two" | "three" | "spray"): { sheath: string | null; blades: TurnedOutline[] } {
  if (mode === "spray") {
    const blade = fromHalfWidth((t) => (t > 0.88 ? 2.6 * ((1 - t) / 0.12) : 2.6), 16, 0, -84)
    return {
      sheath: null,
      blades: [-52, -18, 18, 52].map((rotate) => ({ d: blade.d, rotate, pivotY: 0 })),
    }
  }
  const blade = needleOutline()
  if (mode === "one") return { sheath: null, blades: [{ d: blade.d, rotate: 0, pivotY: 6 }] }
  const count = mode === "three" ? 3 : 2
  return {
    sheath: "M -5 16 H 5 V 4 H -5 Z",
    blades: Array.from({ length: count }, (_, index) => ({
      d: blade.d,
      rotate: (index - (count - 1) / 2) * 12,
      pivotY: 6,
    })),
  }
}

function scaleBlade(y: number, side: number): string {
  const reach = 18 * side
  const mid = 10 * side
  return `M 0 ${round(y)} C ${round(mid)} ${round(y - 2)} ${round(reach)} ${round(y - 12)} ${round(reach * 0.72)} ${round(y - 22)} C ${round(mid)} ${round(y - 14)} ${round(side * 2)} ${round(y - 8)} 0 ${round(y - 6)} Z`
}

export function scaleOutlines(): string[] {
  const stem = "M 0 32 L 0 -126"
  const scales = [-100, -70, -40, -10, 20].flatMap((y) => [scaleBlade(y, 1), scaleBlade(y, -1)])
  return [stem, ...scales]
}

export function frondParts(): { rachis: string; pinnae: Array<{ d: string; y: number; side: number }> } {
  const pinna = fromHalfWidth((t) => 15 * Math.sin(Math.PI * t), 16, 0, -32)
  const pinnae = [-22, -56, -90, -122].flatMap((y) => [
    { d: pinna.d, y, side: 1 },
    { d: pinna.d, y, side: -1 },
  ])
  return { rachis: "M 0 18 L 0 -138", pinnae }
}

export function bladeOutline(shape: string | null, lobes: string | null): ChartOutline | null {
  switch (shape) {
    case "ovate":
      return fromHalfWidth(ovateWidth)
    case "elliptic":
      return fromHalfWidth(ellipticWidth)
    case "obovate":
      return fromHalfWidth((t) => ovateWidth(1 - t))
    case "lanceolate":
      return fromHalfWidth(lanceolateWidth)
    case "linear":
      return fromHalfWidth(linearWidth)
    case "cordate":
      return cordateOutline()
    case "fan":
      return fanOutline()
    case "pad":
      return fromHalfWidth(padWidth, 48, 4, -128)
    case "lobed-pinnate":
      return fromHalfWidth((t) => pinnateWidth(t, pinnatePairs(lobes)), 96)
    case "lobed-palmate":
      return palmateOutline(palmateCount(lobes))
    default:
      return null
  }
}

function centroid(points: ChartPoint[]): ChartPoint {
  const count = points.length || 1
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / count,
    y: points.reduce((sum, point) => sum + point.y, 0) / count,
  }
}

export function outwardMarks(
  points: ChartPoint[],
  texture: "toothed" | "wavy" | "spiny",
): string[] {
  if (points.length < 8) return []
  const center = centroid(points)
  const usable = points.filter((point) => !(point.y > -4 && Math.abs(point.x) < 12))
  const count = texture === "spiny" ? 8 : 12
  const step = Math.max(1, Math.floor(usable.length / count))
  const length = texture === "spiny" ? 11 : texture === "wavy" ? 5 : 6
  const marks: string[] = []
  for (let index = 0; index < usable.length; index += step) {
    const point = usable[index]
    const vx = point.x - center.x
    const vy = point.y - center.y
    const span = Math.hypot(vx, vy) || 1
    const ox = (vx / span) * length
    const oy = (vy / span) * length
    if (texture === "wavy") {
      marks.push(
        `M ${round(point.x - oy)} ${round(point.y + ox)} Q ${round(point.x + ox)} ${round(point.y + oy)} ${round(point.x + oy)} ${round(point.y - ox)}`,
      )
    } else {
      const tipY = point.y + oy - length * 0.28
      marks.push(`M ${round(point.x)} ${round(point.y)} L ${round(point.x + ox)} ${round(tipY)}`)
    }
  }
  return marks
}

export function insetOutline(points: ChartPoint[], scale: number): string {
  const center = centroid(points)
  const mapped = points.map((point) => ({
    x: center.x + (point.x - center.x) * scale,
    y: center.y + (point.y - center.y) * scale,
  }))
  return polyline(mapped)
}

function yBounds(points: ChartPoint[]): { top: number; bottom: number } {
  const ys = points.map((point) => point.y)
  return { top: Math.min(...ys), bottom: Math.max(...ys) }
}

function halfAt(points: ChartPoint[], y: number): number {
  const band = points.filter((point) => Math.abs(point.y - y) < 10)
  const pool = band.length > 0 ? band : points
  return Math.max(...pool.map((point) => Math.abs(point.x)))
}

function insideOutline(points: ChartPoint[], x: number, y: number): boolean {
  let hit = false
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const current = points[index]
    const prior = points[previous]
    if (!current || !prior) continue
    const crosses = current.y > y !== prior.y > y
    const xCross = ((prior.x - current.x) * (y - current.y)) / (prior.y - current.y || 0.00001) + current.x
    if (crosses && x < xCross) hit = !hit
  }
  return hit
}

function rayStop(points: ChartPoint[], angle: number): ChartPoint {
  let last = { x: 0, y: 4 }
  for (let step = 8; step <= 190; step += 4) {
    const next = { x: Math.sin(angle) * step, y: 4 - Math.cos(angle) * step }
    if (!insideOutline(points, next.x, next.y)) {
      return { x: last.x * 0.82, y: 4 + (last.y - 4) * 0.82 }
    }
    last = next
  }
  return { x: last.x * 0.82, y: 4 + (last.y - 4) * 0.82 }
}

export function veinMarks(
  venation: string,
  points: ChartPoint[],
  shape: string | null,
): { midrib: string | null; lines: string[] } {
  if (points.length < 4) return { midrib: null, lines: [] }
  const { top, bottom } = yBounds(points)
  if (venation === "parallel") {
    const lines = [-0.62, -0.3, 0, 0.3, 0.62].map((fraction) => {
      const y1 = Math.min(bottom - 6, 0)
      const y2 = top + 12
      const x1 = halfAt(points, y1) * fraction
      const x2 = halfAt(points, y2) * fraction * 0.35
      return `M ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)}`
    })
    return { midrib: lines[2] ?? null, lines: lines.filter((_, index) => index !== 2) }
  }
  if (venation === "dichotomous") {
    const yFork = top * 0.32
    const yMid = top * 0.62
    const yTip = top * 0.9
    const span = Math.max(18, halfAt(points, yMid) * 0.72)
    return {
      midrib: `M 0 4 L 0 ${round(yFork)}`,
      lines: [
        `M 0 ${round(yFork)} L ${round(-span * 0.42)} ${round(yMid)}`,
        `M 0 ${round(yFork)} L ${round(span * 0.42)} ${round(yMid)}`,
        `M ${round(-span * 0.42)} ${round(yMid)} L ${round(-span)} ${round(yTip)}`,
        `M ${round(-span * 0.42)} ${round(yMid)} L ${round(-span * 0.12)} ${round(yTip)}`,
        `M ${round(span * 0.42)} ${round(yMid)} L ${round(span * 0.12)} ${round(yTip)}`,
        `M ${round(span * 0.42)} ${round(yMid)} L ${round(span)} ${round(yTip)}`,
      ],
    }
  }
  if (venation === "palmate") {
    const angles = shape === "lobed-palmate" || shape === "cordate" ? [-1.05, -0.52, 0, 0.52, 1.05] : [-0.6, 0, 0.6]
    const lines = angles.map((angle) => {
      const end = rayStop(points, angle)
      return `M 0 6 L ${round(end.x)} ${round(end.y)}`
    })
    const middle = Math.floor(lines.length / 2)
    return { midrib: lines[middle] ?? null, lines: lines.filter((_, index) => index !== middle) }
  }
  const midrib = `M 0 ${round(Math.min(bottom, 4))} L 0 ${round(top + 8)}`
  const lines: string[] = []
  for (const t of [0.24, 0.42, 0.6, 0.76]) {
    const y = bottom + (top - bottom) * t
    const reach = halfAt(points, y) * 0.7
    const yEnd = y + (top - y) * 0.22
    lines.push(`M 0 ${round(y)} L ${round(-reach)} ${round(yEnd)}`)
    lines.push(`M 0 ${round(y)} L ${round(reach)} ${round(yEnd)}`)
  }
  return { midrib, lines }
}

export const CHART_SHAPES = [
  "ovate",
  "elliptic",
  "obovate",
  "lanceolate",
  "linear",
  "cordate",
  "fan",
  "pad",
  "lobed-pinnate",
  "lobed-palmate",
] as const
