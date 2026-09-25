"use client"

import { useId } from "react"
import {
  diagnosticPlateModel,
  type DiagnosticPlateModel,
  type DrawnBark,
  type DrawnBud,
  type DrawnExudate,
  type DrawnFlower,
  type DrawnFruit,
  type DrawnHabit,
  type DrawnRoots,
  type LeafKind,
  type PlateLeader,
} from "@/lib/diagnostic-plate"

const INK = "#141414"
const PAPER = "#ffffff"
const OUTLINE = 2.5
const STRUCT = 1.15
const VEIN = 0.62
const FINE = 0.45

const LEAF_ORIGIN = { x: 412, y: 232 }
const SPRIG = { x: 118, y: 396 }
const LEAF_LABEL_X = 268

function ink(weight: number, dashed = false) {
  return {
    fill: "none" as const,
    stroke: INK,
    strokeWidth: weight,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: dashed ? "6 4" : undefined,
    vectorEffect: "non-scaling-stroke" as const,
  }
}

function svgRotate(x: number, y: number, deg: number, ox: number, oy: number) {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: ox + x * cos - y * sin, y: oy + x * sin + y * cos }
}

function petioleSpan(model: DiagnosticPlateModel): number {
  switch (model.petiole) {
    case "short":
      return 18
    case "long":
      return 52
    case "flattened":
      return 22
    case "winged":
      return 28
    default:
      return model.arrangement ? 16 : 0
  }
}

function placeOnLeaf(
  localX: number,
  localY: number,
  origin: { x: number; y: number },
  turn: number,
  span: number,
) {
  return svgRotate(localX, localY - span, turn, origin.x, origin.y)
}

function Leader({
  x1,
  y1,
  x2,
  y2,
  text,
  anchor = "start",
  size = 16,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  text: string
  anchor?: "start" | "end"
  size?: number
}) {
  const gap = anchor === "end" ? -5 : 5
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={0.75} />
      <circle cx={x1} cy={y1} r={1.7} fill={INK} />
      <text
        x={x2 + gap}
        y={y2}
        fill={INK}
        fontSize={size}
        textAnchor={anchor}
        dominantBaseline="middle"
        className="font-serif"
      >
        {text}
      </text>
    </g>
  )
}

function LeftLeaders({
  leaders,
  touches,
  skip,
  labelX = LEAF_LABEL_X,
  anchor = "end",
}: {
  leaders: PlateLeader[]
  touches: Record<string, { x: number; y: number }>
  skip: Set<string>
  labelX?: number
  anchor?: "start" | "end"
}) {
  const rows = leaders
    .filter((leader) => !skip.has(leader.id) && touches[leader.id])
    .map((leader) => ({ leader, touch: touches[leader.id]! }))
    .sort((a, b) => a.touch.y - b.touch.y)
  let last = 36
  return (
    <g>
      {rows.map((row) => {
        const labelY = Math.max(row.touch.y, last + 24)
        last = labelY
        return (
          <Leader
            key={row.leader.id}
            x1={row.touch.x}
            y1={row.touch.y}
            x2={labelX}
            y2={labelY}
            text={row.leader.text}
            anchor={anchor}
            size={15}
          />
        )
      })}
    </g>
  )
}

const PINNATE_MANY =
  "M 0 2 C -8 -4 -10 -12 -12 -16 C -30 -18 -50 -22 -48 -32 C -46 -42 -20 -40 -14 -50 C -32 -54 -66 -58 -60 -70 C -54 -82 -22 -78 -16 -90 C -34 -96 -62 -102 -54 -114 C -46 -126 -18 -122 -10 -134 C -16 -148 -4 -162 2 -168 C 10 -160 18 -146 14 -134 C 24 -122 48 -128 56 -114 C 64 -100 24 -96 18 -86 C 36 -78 68 -72 62 -58 C 56 -44 22 -48 16 -36 C 28 -28 52 -24 46 -16 C 40 -8 16 -6 0 2 Z"

const PINNATE_FIVE =
  "M 0 2 C -18 -10 -36 -4 -24 -36 C -52 -48 -58 -16 -36 -64 C -58 -92 -40 -100 -16 -132 C -6 -156 8 -150 18 -128 C 42 -108 58 -96 36 -68 C 56 -40 48 -16 26 -32 C 34 -8 14 -12 0 2 Z"

const PINNATE_THREE =
  "M 0 2 C -16 -16 -48 -20 -28 -70 C -46 -108 -16 -140 0 -162 C 16 -140 46 -108 28 -70 C 48 -20 16 -16 0 2 Z"

const PALMATE_FIVE =
  "M 0 8 C -8 -20 -36 -28 -24 -78 C -40 -120 -8 -132 0 -158 C 8 -132 40 -120 24 -78 C 36 -28 8 -20 0 8 C 18 4 54 -8 70 16 C 48 28 16 18 0 24 C -16 18 -48 28 -70 16 C -54 -8 -18 4 0 8 Z"

const PALMATE_THREE =
  "M 0 6 C -12 -16 -34 -24 -18 -86 C -8 -130 8 -130 18 -86 C 34 -24 12 -16 0 6 C 16 16 48 28 36 52 C 12 40 -12 40 -36 52 C -48 28 -16 16 0 6 Z"

const SIMPLE: Record<string, string> = {
  ovate: "M 0 2 C -34 -16 -46 -78 -16 -140 C -6 -158 8 -158 18 -140 C 48 -78 36 -16 0 2 Z",
  elliptic: "M 0 2 C -32 -28 -36 -100 0 -158 C 36 -100 32 -28 0 2 Z",
  obovate: "M 0 2 C -20 -8 -18 -48 -28 -78 C -40 -120 -16 -150 0 -158 C 16 -150 40 -120 28 -78 C 18 -48 20 -8 0 2 Z",
  lanceolate: "M 0 2 C -16 -20 -18 -80 -8 -140 C -4 -158 4 -158 8 -140 C 18 -80 16 -20 0 2 Z",
  linear: "M 0 2 C -7 -8 -8 -80 0 -162 C 8 -80 7 -8 0 2 Z",
  cordate: "M 0 -18 C -28 -62 -62 -28 -36 8 C -18 36 0 52 0 52 C 0 52 18 36 36 8 C 62 -28 28 -62 0 -18 Z",
  fan: "M 0 28 C -18 28 -70 -8 -78 -46 C -36 -78 -12 -40 0 -58 C 12 -40 36 -78 78 -46 C 70 -8 18 28 0 28 Z",
  pad: "M 0 -8 C 28 -8 34 24 22 62 C 12 86 0 92 0 92 C 0 92 -12 86 -22 62 C -34 24 -28 -8 0 -8 Z",
}

function lobePairs(lobes: string | null): 1 | 2 | 4 {
  if (lobes === "three") return 1
  if (lobes === "many") return 4
  return 2
}

function lobedMode(model: DiagnosticPlateModel): "pinnate" | "palmate" | null {
  if (model.shape === "lobed-pinnate") return "pinnate"
  if (model.shape === "lobed-palmate") return "palmate"
  if (model.lobes === "three" || model.lobes === "five" || model.lobes === "many") {
    if (model.venation === "palmate") return "palmate"
    if (model.shape && model.shape !== "pad") return "pinnate"
  }
  return null
}

function bladePath(model: DiagnosticPlateModel): string {
  const mode = lobedMode(model)
  if (mode === "pinnate") {
    const pairs = lobePairs(model.lobes)
    if (pairs === 4) return PINNATE_MANY
    if (pairs === 1) return PINNATE_THREE
    return PINNATE_FIVE
  }
  if (mode === "palmate") {
    if (model.lobes === "three") return PALMATE_THREE
    return PALMATE_FIVE
  }
  if (model.shape && SIMPLE[model.shape]) return SIMPLE[model.shape]
  return "M -34 -8 H 34 V -148 H -34 Z"
}

function marginPoints(model: DiagnosticPlateModel): Array<[number, number]> {
  const mode = lobedMode(model)
  if (mode === "pinnate" && lobePairs(model.lobes) === 4) {
    return [
      [-48, -32],
      [-60, -70],
      [-54, -114],
      [-10, -134],
      [2, -168],
      [14, -134],
      [56, -114],
      [62, -58],
      [46, -16],
    ]
  }
  if (mode === "pinnate") {
    return [
      [26, -32],
      [36, -68],
      [18, -128],
      [-16, -132],
      [-36, -64],
      [-24, -36],
    ]
  }
  if (mode === "palmate") {
    return [
      [0, -158],
      [24, -78],
      [70, 16],
      [0, 24],
      [-70, 16],
      [-24, -78],
    ]
  }
  return [
    [20, -40],
    [28, -90],
    [8, -140],
    [-20, -100],
    [-24, -40],
  ]
}

function VeinWork({ model, clipId }: { model: DiagnosticPlateModel; clipId: string }) {
  if (!model.showVeins || !model.venation) return null
  const lobed = lobedMode(model) === "pinnate" && model.venation === "pinnate"
  return (
    <g clipPath={`url(#${clipId})`} {...ink(VEIN)}>
      {lobed ? (
        <g>
          <path d="M 1 0 C 0 -40 2 -96 8 -154" {...ink(STRUCT)} />
          <path d="M 0 -26 C 12 -30 28 -28 40 -36" />
          <path d="M 0 -26 C -12 -30 -28 -26 -40 -34" />
          <path d="M 0 -58 C 16 -64 32 -60 46 -70" />
          <path d="M 0 -58 C -14 -66 -32 -60 -46 -72" />
          <path d="M 0 -92 C 12 -100 26 -102 36 -112" />
          <path d="M 0 -92 C -12 -100 -24 -104 -34 -116" />
          <path d="M 0 -122 C 8 -130 12 -136 14 -146" />
          <path d="M 0 -122 C -6 -132 -8 -140 -8 -150" />
        </g>
      ) : null}
      {!lobed && model.venation === "pinnate" ? (
        <g>
          <path d="M 0 -4 C 0 -40 0 -100 0 -148" {...ink(STRUCT)} />
          <path d="M 0 -28 C -16 -36 -24 -32 -30 -26" />
          <path d="M 0 -28 C 16 -36 24 -32 30 -26" />
          <path d="M 0 -62 C -14 -74 -20 -70 -24 -60" />
          <path d="M 0 -62 C 14 -74 20 -70 24 -60" />
          <path d="M 0 -98 C -10 -110 -14 -106 -16 -96" />
          <path d="M 0 -98 C 10 -110 14 -106 16 -96" />
        </g>
      ) : null}
      {!lobed && model.venation === "palmate" ? (
        <g {...ink(STRUCT)}>
          <path d="M 0 0 L 0 -140" {...ink(VEIN)} />
          <path d="M 0 -8 L -36 -78" />
          <path d="M 0 -8 L 36 -78" />
          <path d="M 0 4 L -62 10" />
          <path d="M 0 4 L 62 10" />
        </g>
      ) : null}
      {model.venation === "parallel" ? (
        <g>
          <path d="M -12 -20 L -8 -140" />
          <path d="M 0 -8 L 0 -150" />
          <path d="M 12 -20 L 8 -140" />
        </g>
      ) : null}
      {model.venation === "dichotomous" ? (
        <g>
          <path d="M 0 0 L 0 -40" />
          <path d="M 0 -40 L -22 -90" />
          <path d="M 0 -40 L 22 -90" />
          <path d="M -22 -90 L -36 -130" />
          <path d="M -22 -90 L -8 -128" />
          <path d="M 22 -90 L 8 -128" />
          <path d="M 22 -90 L 36 -130" />
        </g>
      ) : null}
    </g>
  )
}

function MarginWork({ model }: { model: DiagnosticPlateModel }) {
  const points = marginPoints(model)
  if (model.marginTexture === "none") return null
  if (model.marginTexture === "rolled-under") {
    return (
      <g transform="translate(0 -78) scale(0.9) translate(0 86)">
        <path d={bladePath(model)} {...ink(0.7)} />
      </g>
    )
  }
  const length = model.marginTexture === "spiny" ? 9 : model.marginTexture === "wavy" ? 4 : 5
  return (
    <g {...ink(model.marginTexture === "spiny" ? 1.05 : FINE)}>
      {points.map(([x, y], index) => {
        const span = Math.hypot(x, y) || 1
        const ox = (x / span) * length
        const oy = (y / span) * length
        if (model.marginTexture === "wavy") {
          return <path key={index} d={`M ${x - oy} ${y + ox} Q ${x + ox} ${y + oy} ${x + oy} ${y - ox}`} />
        }
        return <line key={index} x1={x} y1={y} x2={x + ox} y2={y + oy} />
      })}
    </g>
  )
}

function HairWork({ model }: { model: DiagnosticPlateModel }) {
  if (!model.showHairs) return null
  const points = marginPoints(model).filter((_, index) => index % 2 === 0)
  return (
    <g {...ink(FINE)}>
      {points.map(([x, y], index) => {
        const span = Math.hypot(x, y) || 1
        const ox = (x / span) * 8
        const oy = (y / span) * 8
        return (
          <g key={index}>
            <line x1={x} y1={y} x2={x + ox} y2={y + oy} />
            <line x1={x + 1.5} y1={y + 1} x2={x + ox * 0.8} y2={y + oy * 0.7} />
          </g>
        )
      })}
    </g>
  )
}

function StippleWork({ model, clipId }: { model: DiagnosticPlateModel; clipId: string }) {
  if (!model.showStipple) return null
  const dots: Array<[number, number]> = [
    [-10, -30],
    [8, -24],
    [14, -48],
    [-6, -60],
    [4, -78],
    [-16, -90],
    [10, -104],
    [0, -40],
    [18, -70],
    [-8, -120],
  ]
  return (
    <g clipPath={`url(#${clipId})`} fill={INK}>
      {dots.map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r={0.75} />
      ))}
    </g>
  )
}

function Petiole({ model }: { model: DiagnosticPlateModel }) {
  if (model.leafKind === "needle" || model.leafKind === "scale" || model.leafKind === "frond") return null
  if (!model.petiole) {
    if (!model.arrangement) return null
    return <path d="M 0 0 L 0 16" {...ink(1.5, true)} />
  }
  switch (model.petiole) {
    case "short":
      return <path d="M 0 0 C -0.4 7 0.6 13 0 18" {...ink(2.15)} />
    case "long":
      return <path d="M 0 0 C 1 16 -1 34 0 52" {...ink(2.15)} />
    case "flattened":
      return (
        <g {...ink(1.45)}>
          <path d="M -3.2 0 L -3.2 22" />
          <path d="M 3.2 0 L 3.2 22" />
        </g>
      )
    case "winged":
      return (
        <g>
          <path d="M 0 0 L 0 28" {...ink(1.7)} />
          <path d="M -8 6 C -2 12 -2 20 -7 28 L 7 28 C 2 20 2 12 8 6 Z" fill={PAPER} stroke={INK} strokeWidth={1.2} />
        </g>
      )
    default:
      return null
  }
}

function bladeIsDashed(model: DiagnosticPlateModel): boolean {
  if (model.placeholder) return true
  if (model.shape) return false
  return model.leafKind === "simple" || model.leafKind === "pinnate" || model.leafKind === "bipinnate" || model.leafKind === "palmate"
}

function BroadBlade({ model, clipId }: { model: DiagnosticPlateModel; clipId: string }) {
  const dashed = bladeIsDashed(model)
  const d = dashed ? "M -34 -8 H 34 V -148 H -34 Z" : bladePath(model)
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={PAPER} stroke="none" />
      <VeinWork model={model} clipId={clipId} />
      <StippleWork model={model} clipId={clipId} />
      <path d={d} {...ink(dashed ? 1.6 : OUTLINE, dashed)} />
      {dashed ? null : <MarginWork model={model} />}
      <HairWork model={model} />
    </g>
  )
}

function Needles({ model }: { model: DiagnosticPlateModel }) {
  const known = model.bundleKnown
  if (!known) {
    return (
      <g {...ink(1.6, true)}>
        <path d="M 0 8 L -10 -120" />
        <path d="M 0 8 L 10 -120" />
      </g>
    )
  }
  if (model.fascicle === "flat-spray") {
    return (
      <g {...ink(1.35)}>
        {[-40, -20, 0, 20, 40].map((y) => (
          <path key={y} d={`M 0 ${y} L ${y < 0 ? -70 : 70} ${y - 8}`} />
        ))}
      </g>
    )
  }
  const count = model.fascicle === "three" ? 3 : 2
  return (
    <g>
      <path d="M -4 12 H 4 V 2 H -4 Z" fill={PAPER} stroke={INK} strokeWidth={1.3} />
      <g {...ink(1.7)}>
        {Array.from({ length: count }, (_, index) => {
          const spread = (index - (count - 1) / 2) * 16
          return <path key={index} d={`M 0 4 L ${spread} -130`} />
        })}
      </g>
    </g>
  )
}

function Scales() {
  return (
    <g fill={PAPER} stroke={INK} strokeWidth={1.5}>
      <path d="M 0 24 L 0 -130" fill="none" strokeWidth={2.2} />
      {[-100, -70, -40, -10, 20].map((y) => (
        <path key={y} d={`M 0 ${y} L 16 ${y - 14} L 0 ${y - 6} L -16 ${y - 14} Z`} />
      ))}
    </g>
  )
}

function Frond({ model }: { model: DiagnosticPlateModel }) {
  return (
    <g>
      <path d="M 0 20 C 2 -20 0 -80 0 -140" {...ink(2.2)} />
      {[-20, -55, -90, -120].map((y) => (
        <path
          key={y}
          d={`M 0 ${y} C 18 ${y - 8} 42 ${y - 6} 48 ${y - 18} C 30 ${y - 8} 12 ${y - 4} 0 ${y + 6} C -12 ${y - 4} -30 ${y - 8} -48 ${y - 18} C -42 ${y - 6} -18 ${y - 8} 0 ${y} Z`}
          fill={PAPER}
          stroke={INK}
          strokeWidth={1.7}
          strokeLinejoin="round"
        />
      ))}
      {model.showVeins ? <path d="M 0 16 L 0 -132" {...ink(VEIN)} /> : null}
    </g>
  )
}

function Compound({ model, clipPrefix }: { model: DiagnosticPlateModel; clipPrefix: string }) {
  const pairs = model.leafKind === "bipinnate" ? [-30, 10, 50] : [-78, -36, 6, 48]
  return (
    <g>
      <path d="M 0 78 L 0 -120" {...ink(2.2)} />
      {pairs.map((y, index) => (
        <g key={y}>
          {model.leafKind === "bipinnate" ? <path d={`M 0 ${y} L 34 ${y - 18}`} {...ink(1.5)} /> : null}
          <g transform={`translate(${model.leafKind === "palmate" ? 40 : 46} ${y}) scale(0.34)`}>
            <BroadBlade model={model} clipId={`${clipPrefix}-r-${index}`} />
          </g>
          <g transform={`translate(${model.leafKind === "palmate" ? -40 : -46} ${y}) scale(0.34)`}>
            <BroadBlade model={{ ...model, shape: model.shape }} clipId={`${clipPrefix}-l-${index}`} />
          </g>
        </g>
      ))}
      {model.leafKind === "pinnate" || model.leafKind === "bipinnate" ? (
        <g transform="translate(0 -132) scale(0.36)">
          <BroadBlade model={model} clipId={`${clipPrefix}-tip`} />
        </g>
      ) : null}
    </g>
  )
}

function OneLeaf({ model, clipId }: { model: DiagnosticPlateModel; clipId: string }) {
  if (!model.leafKind) return null
  switch (model.leafKind) {
    case "placeholder":
    case "simple":
    case "pad":
      return (
        <g>
          <Petiole model={model} />
          <BroadBlade model={model} clipId={clipId} />
        </g>
      )
    case "needle":
      return <Needles model={model} />
    case "scale":
      return <Scales />
    case "frond":
      return <Frond model={model} />
    case "pinnate":
    case "bipinnate":
    case "palmate":
      return <Compound model={model} clipPrefix={clipId} />
    default: {
      const exhaustive: never = model.leafKind
      return exhaustive
    }
  }
}

function leafFrame(model: DiagnosticPlateModel): { origin: { x: number; y: number }; turn: number; span: number } {
  return { origin: LEAF_ORIGIN, turn: 0, span: petioleSpan(model) }
}

function leafTouches(model: DiagnosticPlateModel): Record<string, { x: number; y: number }> {
  const frame = leafFrame(model)
  const at = (x: number, y: number) => placeOnLeaf(x, y, frame.origin, frame.turn, frame.span)
  const sprigBuds = { x: SPRIG.x + 7, y: SPRIG.y - 78 }
  const sprigNode =
    model.arrangement === "basal"
      ? { x: SPRIG.x + 20, y: SPRIG.y + 36 }
      : model.arrangement === "alternate"
        ? { x: SPRIG.x, y: SPRIG.y + 28 }
        : { x: SPRIG.x, y: SPRIG.y }
  const exudate = { x: frame.origin.x + 14, y: frame.origin.y + 4 }
  const roots = { x: frame.origin.x - 10, y: frame.origin.y + 36 }
  const kind: LeafKind | null = model.leafKind
  const budTouch = model.arrangement ? sprigBuds : { x: frame.origin.x - 18, y: frame.origin.y + 6 }
  if (kind === "needle" || kind === "scale" || kind === "frond" || kind === "pinnate" || kind === "bipinnate" || kind === "palmate") {
    return {
      shape: { x: frame.origin.x + 28, y: frame.origin.y - 70 },
      lobes: { x: frame.origin.x - 36, y: frame.origin.y - 40 },
      margin: { x: frame.origin.x - 40, y: frame.origin.y - 10 },
      veins: { x: frame.origin.x, y: frame.origin.y - 48 },
      surface: { x: frame.origin.x + 12, y: frame.origin.y - 24 },
      petiole: at(0, Math.max(4, frame.span * 0.55)),
      fascicle: { x: frame.origin.x + 10, y: frame.origin.y - 80 },
      arrangement: sprigNode,
      buds: budTouch,
      exudate,
      roots,
    }
  }
  const deep = lobedMode(model) === "pinnate" && lobePairs(model.lobes) === 4
  return {
    shape: deep ? at(-48, -32) : at(-28, -36),
    lobes: deep ? at(-60, -70) : at(-36, -64),
    margin: deep ? at(-54, -114) : at(-24, -100),
    veins: at(0, -96),
    surface: at(16, -72),
    petiole: at(0, Math.max(4, frame.span * 0.55)),
    fascicle: at(8, -40),
    arrangement: sprigNode,
    buds: budTouch,
    exudate,
    roots,
  }
}

function leafTransform(origin: { x: number; y: number }, turn: number, span: number, scale = 1): string {
  return `translate(${origin.x} ${origin.y}) rotate(${turn}) scale(${scale}) translate(0 ${-span})`
}

function Shoot({ model, uid }: { model: DiagnosticPlateModel; uid: string }) {
  const frame = leafFrame(model)
  return (
    <g>
      <g transform={leafTransform(frame.origin, 0, frame.span)}>
        <OneLeaf model={model} clipId={`${uid}-main`} />
      </g>
      {model.arrangement ? <ArrangementSprig model={model} uid={uid} /> : null}
      {model.buds && !model.arrangement ? (
        <g transform={`translate(${frame.origin.x - 18} ${frame.origin.y + 6})`}>
          <BudInk kind={model.buds} />
        </g>
      ) : null}
      {model.exudate ? (
        <g transform={`translate(${frame.origin.x + 14} ${frame.origin.y + 2})`}>
          <ExudateInk kind={model.exudate} />
        </g>
      ) : null}
      {model.roots ? (
        <g transform={`translate(${frame.origin.x - 8} ${frame.origin.y + 28})`}>
          <RootInk kind={model.roots} />
        </g>
      ) : null}
    </g>
  )
}

function ArrangementSprig({ model, uid }: { model: DiagnosticPlateModel; uid: string }) {
  const span = petioleSpan(model)
  const turns =
    model.arrangement === "opposite"
      ? [48, -48]
      : model.arrangement === "whorled"
        ? [55, -55, 180]
        : model.arrangement === "basal"
          ? [-24, 0, 26]
          : [58, -64]
  const nodes =
    model.arrangement === "alternate"
      ? [SPRIG.y - 28, SPRIG.y + 28]
      : model.arrangement === "basal"
        ? [SPRIG.y + 36, SPRIG.y + 36, SPRIG.y + 36]
        : turns.map(() => SPRIG.y)
  return (
    <g>
      {model.arrangement !== "basal" ? (
        <path d={`M ${SPRIG.x} ${SPRIG.y + 62} L ${SPRIG.x} ${SPRIG.y - 64}`} {...ink(2.2)} />
      ) : null}
      {model.buds ? (
        <g transform={`translate(${SPRIG.x} ${SPRIG.y - 78})`}>
          <BudInk kind={model.buds} />
        </g>
      ) : null}
      {turns.map((turn, index) => (
        <g key={`${turn}-${index}`} transform={leafTransform({ x: SPRIG.x, y: nodes[index] ?? SPRIG.y }, turn, span, 0.3)}>
          <OneLeaf model={model} clipId={`${uid}-sprig-${index}`} />
        </g>
      ))}
    </g>
  )
}

function BudInk({ kind }: { kind: DrawnBud }) {
  switch (kind) {
    case "clustered":
      return (
        <g fill={PAPER} stroke={INK} strokeWidth={1.55}>
          <ellipse cx={-7} cy={3} rx={5} ry={8} />
          <ellipse cx={7} cy={2} rx={5.2} ry={9} />
          <ellipse cx={0} cy={-7} rx={5} ry={8.5} />
        </g>
      )
    case "long-pointed":
      return <path d="M 0 8 C 5 0 4 -18 0 -32 C -4 -18 -5 0 0 8 Z" fill={PAPER} stroke={INK} strokeWidth={1.6} />
    case "resinous":
      return (
        <g>
          <ellipse cx={0} cy={0} rx={6} ry={9} fill={PAPER} stroke={INK} strokeWidth={1.6} />
          <circle cx={-1} cy={-2} r={0.7} fill={INK} />
          <circle cx={2} cy={1} r={0.6} fill={INK} />
          <circle cx={0} cy={3} r={0.55} fill={INK} />
        </g>
      )
    case "small-dry":
      return <ellipse cx={0} cy={0} rx={5} ry={8} fill={PAPER} stroke={INK} strokeWidth={1.6} />
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function ExudateInk({ kind }: { kind: DrawnExudate }) {
  switch (kind) {
    case "white-latex":
      return <path d="M 0 0 C 5 4 6 12 0 16 C -6 12 -5 4 0 0 Z" fill={PAPER} stroke={INK} strokeWidth={1.3} />
    case "resin":
      return (
        <g>
          <path d="M 0 2 C 7 4 8 12 0 14 C -8 12 -7 4 0 2 Z" fill={PAPER} stroke={INK} strokeWidth={1.3} />
          <circle cx={-1} cy={8} r={0.6} fill={INK} />
        </g>
      )
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function RootInk({ kind }: { kind: DrawnRoots }) {
  switch (kind) {
    case "prop":
      return (
        <g {...ink(1.8)}>
          <path d="M -16 0 C -20 16 -8 28 0 22" />
          <path d="M 0 4 C 6 16 4 30 14 34" />
          <path d="M 12 0 C 22 12 18 26 28 24" />
        </g>
      )
    case "exposed":
      return (
        <g {...ink(1.8)}>
          <path d="M -20 8 C -8 0 8 0 22 10" />
          <path d="M -8 16 C 4 10 16 14 28 20" />
        </g>
      )
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function LeafFigure({ model, uid }: { model: DiagnosticPlateModel; uid: string }) {
  const touches = leafTouches(model)
  const skip = new Set<string>(["arrangement", "buds"])
  if (model.main !== "flower") skip.add("flower")
  if (model.main !== "fruit") skip.add("fruit")
  if (model.main !== "bark") skip.add("bark")
  const sprigOnly = new Set(model.leaders.map((leader) => leader.id).filter((id) => id !== "arrangement" && id !== "buds"))
  return (
    <g>
      <Shoot model={model} uid={uid} />
      <LeftLeaders leaders={model.leaders} touches={touches} skip={skip} />
      <LeftLeaders
        leaders={model.leaders}
        touches={touches}
        skip={sprigOnly}
        labelX={SPRIG.x + 78}
        anchor="start"
      />
    </g>
  )
}

function HabitInk({ habit }: { habit: DrawnHabit }) {
  switch (habit) {
    case "tree":
      return (
        <g {...ink(OUTLINE)}>
          <path d="M 0 120 C -2 60 4 20 0 -10" {...ink(2.8)} />
          <path d="M 0 -10 C -20 -28 -48 -20 -70 -48" />
          <path d="M 0 -10 C 16 -30 40 -18 62 -46" />
          <path d="M -8 -24 C -4 -48 6 -52 2 -78" />
        </g>
      )
    case "shrub":
      return (
        <g {...ink(2.2)}>
          <path d="M 0 70 L -8 10" />
          <path d="M -8 10 L -46 -20" />
          <path d="M -8 10 L -10 -48" />
          <path d="M -8 10 L 28 -16" />
          <path d="M 6 60 L 16 8 L 48 -24" />
        </g>
      )
    case "herb":
      return <path d="M 0 80 C 4 40 -2 10 0 -40" {...ink(2)} />
    case "vine":
      return <path d="M -20 80 C 10 50 -16 20 8 -10 C 28 -36 -4 -60 16 -90" {...ink(2.1)} />
    case "palm":
      return (
        <g {...ink(2.2)}>
          <path d="M -8 90 L -4 -20 L 6 90" />
          <path d="M -4 -20 L -4 -36" />
        </g>
      )
    case "fern":
      return <path d="M 0 70 C 4 30 8 -10 0 -30 C -16 -48 -8 -20 2 -8" {...ink(2)} />
    case "grass":
      return (
        <g {...ink(1.5)}>
          <path d="M 0 70 C -2 20 4 -20 0 -50" />
          <path d="M -8 64 C -16 20 -10 -10 -20 -40" />
          <path d="M 10 66 C 18 24 12 -8 22 -36" />
        </g>
      )
    case "succulent":
      return <path d="M 0 40 C 16 36 22 10 14 -20 C 8 -40 0 -44 0 -44 C 0 -44 -8 -40 -14 -20 C -22 10 -16 36 0 40 Z" fill={PAPER} stroke={INK} strokeWidth={2} />
    default: {
      const exhaustive: never = habit
      return exhaustive
    }
  }
}

function HabitFigure({ model }: { model: DiagnosticPlateModel }) {
  if (!model.habit) return null
  const origin = { x: 390, y: 250 }
  const touches: Record<string, { x: number; y: number }> = {
    habit: { x: origin.x, y: origin.y + 20 },
    buds: { x: origin.x + 2, y: origin.y - 78 },
    roots: { x: origin.x, y: origin.y + 120 },
    exudate: { x: origin.x + 16, y: origin.y + 40 },
  }
  const skip = new Set(["flower", "fruit", "bark", "shape", "lobes", "margin", "veins", "surface", "petiole", "arrangement", "fascicle"])
  return (
    <g>
      <g transform={`translate(${origin.x} ${origin.y})`}>
        <HabitInk habit={model.habit} />
        {model.buds ? (
          <g transform="translate(0 -78)">
            <BudInk kind={model.buds} />
          </g>
        ) : null}
        {model.roots ? (
          <g transform="translate(0 120)">
            <RootInk kind={model.roots} />
          </g>
        ) : null}
        {model.exudate ? (
          <g transform="translate(18 36)">
            <ExudateInk kind={model.exudate} />
          </g>
        ) : null}
      </g>
      <LeftLeaders leaders={model.leaders} touches={touches} skip={skip} />
    </g>
  )
}

function FlowerInk({ kind }: { kind: DrawnFlower }) {
  switch (kind) {
    case "catkin":
      return (
        <g fill={PAPER} stroke={INK}>
          <path d="M 0 -46 C 1 -38 0 -34 0 -28" fill="none" strokeWidth={1.3} />
          {[-22, -8, 6, 20, 34].map((y) => (
            <ellipse key={y} cx={0} cy={y} rx={12} ry={8} strokeWidth={1.55} transform={`rotate(-16 0 ${y})`} />
          ))}
        </g>
      )
    case "cone":
      return (
        <g fill={PAPER} stroke={INK} strokeWidth={1.4}>
          <path d="M 0 34 C 16 28 18 -28 0 -40 C -18 -28 -16 28 0 34 Z" strokeWidth={1.8} />
          {[-24, -8, 8, 22].map((y) => (
            <path key={y} d={`M -12 ${y} Q 0 ${y - 7} 12 ${y}`} fill="none" />
          ))}
        </g>
      )
    case "showy":
      return (
        <g>
          <path d="M 0 36 L 0 10" {...ink(STRUCT)} />
          <path d="M 0 10 C -30 10 -34 -18 -10 -30 C -2 -12 2 -12 10 -30 C 34 -18 30 10 0 10 Z" fill={PAPER} stroke={INK} strokeWidth={OUTLINE} />
        </g>
      )
    case "flower-head":
      return (
        <g {...ink(1.35)}>
          <circle cx={0} cy={0} r={16} fill={PAPER} stroke={INK} strokeWidth={1.8} />
          {Array.from({ length: 14 }, (_, index) => {
            const angle = (index / 14) * Math.PI * 2
            const x1 = Math.cos(angle) * 16
            const y1 = Math.sin(angle) * 16
            const x2 = Math.cos(angle) * 28
            const y2 = Math.sin(angle) * 28
            return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} />
          })}
        </g>
      )
    case "fig":
      return <path d="M 0 -28 C 16 -28 22 -8 18 16 C 14 30 0 34 0 34 C 0 34 -14 30 -18 16 C -22 -8 -16 -28 0 -28 Z" fill={PAPER} stroke={INK} strokeWidth={OUTLINE} />
    case "spadix":
      return (
        <g>
          <path d="M 0 32 L 0 -28" {...ink(STRUCT)} />
          <path d="M 0 -22 C 8 -18 8 18 0 24 C -8 18 -8 -18 0 -22 Z" fill={PAPER} stroke={INK} strokeWidth={1.6} />
        </g>
      )
    case "tiny":
      return (
        <g fill={PAPER} stroke={INK} strokeWidth={1.2}>
          <path d="M 0 30 L 0 -8" {...ink(1.2)} />
          <path d="M 0 -8 L -14 -24" {...ink(1.1)} />
          <path d="M 0 -8 L 12 -26" {...ink(1.1)} />
          <circle cx={-14} cy={-24} r={3.2} />
          <circle cx={12} cy={-26} r={3} />
          <circle cx={0} cy={-8} r={2.6} />
        </g>
      )
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function FruitInk({ kind }: { kind: DrawnFruit }) {
  switch (kind) {
    case "acorn":
      return (
        <g fill={PAPER} stroke={INK}>
          <path d="M 0 -4 C 16 -4 18 -30 0 -38 C -18 -30 -16 -4 0 -4 Z" strokeWidth={OUTLINE} />
          <path d="M 0 -38 L 0 -44" fill="none" strokeWidth={1.2} />
          <path d="M -24 -4 C -26 16 -14 28 0 28 C 14 28 26 16 24 -4 Z" strokeWidth={OUTLINE} />
          <path d="M -24 -4 C -10 2 10 2 24 -4" fill="none" strokeWidth={1.1} />
          <path d="M -14 8 C -4 12 4 12 14 8" fill="none" strokeWidth={0.7} />
          <path d="M -10 16 C -2 19 2 19 10 16" fill="none" strokeWidth={0.7} />
        </g>
      )
    case "nut-in-husk":
      return (
        <g fill={PAPER} stroke={INK} strokeWidth={1.7}>
          <path d="M -18 8 C -8 -20 8 -20 18 8 L 8 24 L -8 24 Z" />
          <path d="M 0 -16 L 0 24" fill="none" />
          <circle cx={0} cy={6} r={7} />
        </g>
      )
    case "samara":
      return (
        <g fill={PAPER} stroke={INK} strokeWidth={1.6}>
          <path d="M 0 28 C 8 10 10 -20 0 -36 C -6 -16 -4 12 0 28 Z" />
          <circle cx={0} cy={18} r={5} />
          <path d="M 0 12 L 0 -28" fill="none" strokeWidth={0.6} />
        </g>
      )
    case "round-ball":
      return (
        <g>
          <path d="M 0 -30 L 0 -18" {...ink(1.4)} />
          <circle cx={0} cy={4} r={20} fill={PAPER} stroke={INK} strokeWidth={OUTLINE} />
        </g>
      )
    case "spiky-ball":
      return (
        <g {...ink(1.2)}>
          <circle cx={0} cy={2} r={14} fill={PAPER} strokeWidth={1.8} />
          {Array.from({ length: 10 }, (_, index) => {
            const angle = (index / 10) * Math.PI * 2
            return (
              <line
                key={index}
                x1={Math.cos(angle) * 14}
                y1={2 + Math.sin(angle) * 14}
                x2={Math.cos(angle) * 24}
                y2={2 + Math.sin(angle) * 24}
              />
            )
          })}
        </g>
      )
    case "cone":
      return <FlowerInk kind="cone" />
    case "cone-like":
      return (
        <path d="M 0 22 C 10 16 12 -16 0 -26 C -12 -16 -10 16 0 22 Z" fill={PAPER} stroke={INK} strokeWidth={1.7} />
      )
    case "red-cup":
      return (
        <g fill={PAPER} stroke={INK} strokeWidth={1.6}>
          <path d="M -16 8 C -8 22 8 22 16 8 L 10 -2 L -10 -2 Z" />
          <circle cx={0} cy={-8} r={6} />
        </g>
      )
    case "woody-capsule":
      return (
        <g fill={PAPER} stroke={INK} strokeWidth={1.6}>
          <path d="M -14 16 C -16 -8 -8 -24 0 -24 C 8 -24 16 -8 14 16 Z" />
          <path d="M 0 -24 L 0 16" fill="none" />
          <path d="M -10 16 L 0 8 L 10 16" fill="none" />
        </g>
      )
    case "pod":
      return <path d="M -8 28 C -16 8 -12 -20 0 -32 C 12 -20 16 8 8 28 Z" fill={PAPER} stroke={INK} strokeWidth={OUTLINE} />
    case "drupe":
      return (
        <g fill={PAPER} stroke={INK}>
          <ellipse cx={0} cy={0} rx={16} ry={20} strokeWidth={OUTLINE} />
          <ellipse cx={0} cy={2} rx={5} ry={7} strokeWidth={0.8} />
        </g>
      )
    case "fig":
      return <FlowerInk kind="fig" />
    case "berry":
      return (
        <g fill={PAPER} stroke={INK}>
          <circle cx={0} cy={2} r={16} strokeWidth={OUTLINE} />
          <path d="M -4 -12 L 0 -20 L 4 -12" strokeWidth={1.2} />
        </g>
      )
    case "large-nut":
      return <ellipse cx={0} cy={4} rx={22} ry={28} fill={PAPER} stroke={INK} strokeWidth={OUTLINE} />
    case "date":
      return <ellipse cx={0} cy={0} rx={10} ry={24} fill={PAPER} stroke={INK} strokeWidth={OUTLINE} />
    case "banana":
      return <path d="M -16 20 C -8 8 0 -12 14 -28 C 8 -8 2 10 8 26 C 0 18 -10 22 -16 20 Z" fill={PAPER} stroke={INK} strokeWidth={1.8} />
    case "pappus":
      return (
        <g {...ink(0.7)}>
          <ellipse cx={0} cy={18} rx={4} ry={7} fill={PAPER} strokeWidth={1.3} />
          {[-14, -7, 0, 7, 14].map((x) => (
            <path key={x} d={`M 0 12 C ${x / 2} -4 ${x} -16 ${x} -30`} />
          ))}
        </g>
      )
    case "spiny-capsule":
      return (
        <g {...ink(1.2)}>
          <ellipse cx={0} cy={2} rx={12} ry={16} fill={PAPER} strokeWidth={1.6} />
          {[-8, 0, 8].map((x) => (
            <line key={x} x1={x} y1={-8} x2={x + (x < 0 ? -6 : 6)} y2={-20} />
          ))}
        </g>
      )
    case "small-winged":
      return (
        <g fill={PAPER} stroke={INK} strokeWidth={1.3}>
          <ellipse cx={0} cy={8} rx={4} ry={5} />
          <path d="M 0 4 C 8 -6 10 -20 0 -28 C -4 -12 -2 0 0 4 Z" />
        </g>
      )
    case "fleshy-seed":
      return <ellipse cx={0} cy={0} rx={12} ry={18} fill={PAPER} stroke={INK} strokeWidth={OUTLINE} />
    case "fluff-capsule":
      return (
        <g {...ink(0.7)}>
          <path d="M -10 10 L 0 -4 L 10 10 Z" fill={PAPER} strokeWidth={1.4} />
          {[-8, -3, 2, 7].map((x) => (
            <path key={x} d={`M ${x} -2 L ${x * 1.4} -22`} />
          ))}
        </g>
      )
    case "propagule":
      return (
        <g {...ink(1.5)}>
          <path d="M 0 -30 L 0 8" />
          <path d="M 0 8 C 10 14 12 28 0 34 C -12 28 -10 14 0 8 Z" fill={PAPER} />
        </g>
      )
    case "capsule":
      return <path d="M -10 14 C -12 -4 -6 -18 0 -18 C 6 -18 12 -4 10 14 Z" fill={PAPER} stroke={INK} strokeWidth={1.6} />
    case "tuna":
      return (
        <g fill={PAPER} stroke={INK} strokeWidth={1.6}>
          <ellipse cx={0} cy={2} rx={14} ry={20} />
          <circle cx={-4} cy={-2} r={1.1} fill={INK} />
          <circle cx={4} cy={6} r={1.1} fill={INK} />
        </g>
      )
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function BarkInk({ kind }: { kind: DrawnBark }) {
  const plate = (
    <rect x={-28} y={-46} width={56} height={96} fill={PAPER} stroke={INK} strokeWidth={OUTLINE} />
  )
  switch (kind) {
    case "smooth":
      return <g>{plate}</g>
    case "fissured":
      return (
        <g>
          {plate}
          <g {...ink(1.05)}>
            {[-16, -4, 8, 18].map((x) => (
              <path key={x} d={`M ${x} -40 C ${x + 3} -16 ${x - 2} 12 ${x + 1} 42`} />
            ))}
          </g>
          <g {...ink(FINE)}>
            {[-10, 2, 14].map((x) => (
              <g key={x}>
                <path d={`M ${x} -24 L ${x + 5} -18`} />
                <path d={`M ${x} -2 L ${x + 5} 4`} />
                <path d={`M ${x} 18 L ${x + 5} 24`} />
              </g>
            ))}
          </g>
        </g>
      )
    case "corky":
      return (
        <g>
          {plate}
          <g {...ink(1.15)}>
            {[-18, -8, 2, 12, 20].map((x) => (
              <path key={x} d={`M ${x} -40 C ${x + 2} -10 ${x - 3} 16 ${x} 42`} />
            ))}
          </g>
          <g {...ink(FINE)}>
            {[-14, -2, 10].map((x) => (
              <g key={x}>
                <path d={`M ${x} -20 L ${x + 6} -14`} />
                <path d={`M ${x} 0 L ${x + 6} 6`} />
                <path d={`M ${x} 20 L ${x + 6} 26`} />
              </g>
            ))}
          </g>
        </g>
      )
    case "scaly":
      return (
        <g fill={PAPER} stroke={INK} strokeWidth={1.15}>
          {plate}
          {[
            [-16, -28],
            [4, -24],
            [-8, -6],
            [12, -2],
            [-18, 16],
            [2, 20],
          ].map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M ${x} ${y} Q ${x + 12} ${y - 8} ${x + 22} ${y + 2} Q ${x + 10} ${y + 8} ${x} ${y} Z`} />
          ))}
        </g>
      )
    case "peeling":
      return (
        <g fill={PAPER} stroke={INK} strokeWidth={1.3}>
          {plate}
          <path d="M -16 -20 C -4 -28 10 -18 8 -4 C -2 -8 -14 -8 -16 -20 Z" />
          <path d="M -6 8 C 8 2 16 14 6 26 C -4 18 -12 16 -6 8 Z" />
        </g>
      )
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function flowerTouch(kind: DrawnFlower): { x: number; y: number } {
  switch (kind) {
    case "catkin":
      return { x: 11.5, y: 2.7 }
    case "cone":
      return { x: 14, y: 0 }
    case "showy":
      return { x: 20, y: -4 }
    case "flower-head":
      return { x: 16, y: 0 }
    case "fig":
      return { x: 16, y: 6 }
    case "spadix":
      return { x: 7, y: 2 }
    case "tiny":
      return { x: 12, y: -26 }
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function fruitTouch(kind: DrawnFruit): { x: number; y: number } {
  switch (kind) {
    case "acorn":
      return { x: 12, y: -14 }
    case "nut-in-husk":
      return { x: 7, y: 6 }
    case "samara":
      return { x: 6, y: -8 }
    case "round-ball":
      return { x: 20, y: 4 }
    case "spiky-ball":
      return { x: 14, y: 2 }
    case "cone":
      return { x: 14, y: 0 }
    case "cone-like":
      return { x: 10, y: 0 }
    case "red-cup":
      return { x: 12, y: 8 }
    case "woody-capsule":
      return { x: 12, y: 0 }
    case "pod":
      return { x: 10, y: 4 }
    case "drupe":
      return { x: 16, y: 0 }
    case "fig":
      return { x: 16, y: 6 }
    case "berry":
      return { x: 16, y: 2 }
    case "large-nut":
      return { x: 22, y: 4 }
    case "date":
      return { x: 10, y: 0 }
    case "banana":
      return { x: 8, y: 8 }
    case "pappus":
      return { x: 0, y: 18 }
    case "spiny-capsule":
      return { x: 12, y: 2 }
    case "small-winged":
      return { x: 6, y: -8 }
    case "fleshy-seed":
      return { x: 12, y: 0 }
    case "fluff-capsule":
      return { x: 8, y: 6 }
    case "propagule":
      return { x: 8, y: 18 }
    case "capsule":
      return { x: 8, y: 2 }
    case "tuna":
      return { x: 14, y: 2 }
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function sideTouch(organ: "flower" | "fruit" | "bark", model: DiagnosticPlateModel): { x: number; y: number } {
  switch (organ) {
    case "flower":
      return model.flower ? flowerTouch(model.flower) : { x: 0, y: 0 }
    case "fruit":
      return model.fruit ? fruitTouch(model.fruit) : { x: 0, y: 0 }
    case "bark":
      return { x: 28, y: 8 }
    default: {
      const exhaustive: never = organ
      return exhaustive
    }
  }
}

function SideViews({ model }: { model: DiagnosticPlateModel }) {
  const sides = model.views.filter((view) => view.letter !== "A")
  return (
    <g>
      {sides.map((view, index) => {
        const organ = view.organ === "flower" || view.organ === "fruit" || view.organ === "bark" ? view.organ : null
        if (!organ) return null
        const touch = sideTouch(organ, model)
        const leader = model.leaders.find((item) => item.id === organ)
        return (
          <g key={view.letter} transform={`translate(548 ${28 + index * 150})`}>
            <text x="4" y="18" fill={INK} fontSize="20" fontStyle="italic" className="font-serif">
              {view.letter}
            </text>
            <g transform="translate(78 62)">
              {organ === "flower" && model.flower ? <FlowerInk kind={model.flower} /> : null}
              {organ === "fruit" && model.fruit ? <FruitInk kind={model.fruit} /> : null}
              {organ === "bark" && model.bark ? <BarkInk kind={model.bark} /> : null}
              {leader ? (
                <g>
                  <line x1={touch.x} y1={touch.y} x2={0} y2={72} stroke={INK} strokeWidth={0.75} />
                  <circle cx={touch.x} cy={touch.y} r={1.7} fill={INK} />
                </g>
              ) : null}
            </g>
            {leader ? (
              <text x="78" y="136" fill={INK} fontSize="14" textAnchor="middle" className="font-serif">
                {leader.text}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

function MainMark({ model, uid }: { model: DiagnosticPlateModel; uid: string }) {
  switch (model.main) {
    case "none":
      return (
        <text x="380" y="250" fill={INK} fontSize="18" textAnchor="middle" className="font-serif">
          No characters scored. Nothing is drawn.
        </text>
      )
    case "leaf":
      return <LeafFigure model={model} uid={uid} />
    case "habit":
      return <HabitFigure model={model} />
    case "flower":
      return model.flower ? (
        <g>
          <g transform="translate(400 250) scale(1.7)">
            <FlowerInk kind={model.flower} />
          </g>
          <LeftLeaders
            leaders={model.leaders}
            touches={{ flower: { x: 430, y: 230 } }}
            skip={new Set(["fruit", "bark"])}
          />
        </g>
      ) : null
    case "fruit":
      return model.fruit ? (
        <g>
          <g transform="translate(400 250) scale(1.6)">
            <FruitInk kind={model.fruit} />
          </g>
          <LeftLeaders
            leaders={model.leaders}
            touches={{ fruit: { x: 430, y: 230 } }}
            skip={new Set(["flower", "bark"])}
          />
        </g>
      ) : null
    case "bark":
      return model.bark ? (
        <g>
          <g transform="translate(400 250) scale(1.5)">
            <BarkInk kind={model.bark} />
          </g>
          <LeftLeaders
            leaders={model.leaders}
            touches={{ bark: { x: 442, y: 250 } }}
            skip={new Set(["flower", "fruit"])}
          />
        </g>
      ) : null
    case "buds":
      return model.buds ? (
        <g>
          <g transform="translate(400 250) scale(1.8)">
            <BudInk kind={model.buds} />
          </g>
          <LeftLeaders leaders={model.leaders} touches={{ buds: { x: 420, y: 240 } }} skip={new Set()} />
        </g>
      ) : null
    case "roots":
      return model.roots ? (
        <g>
          <g transform="translate(400 260) scale(1.6)">
            <RootInk kind={model.roots} />
          </g>
          <LeftLeaders leaders={model.leaders} touches={{ roots: { x: 430, y: 250 } }} skip={new Set()} />
        </g>
      ) : null
    default: {
      const exhaustive: never = model.main
      return exhaustive
    }
  }
}

export function DiagnosticPlate({ observation }: { observation: Parameters<typeof diagnosticPlateModel>[0] }) {
  const model = diagnosticPlateModel(observation)
  const captionId = useId()
  const uid = captionId.replace(/:/g, "")
  return (
    <figure className="border border-[#141414] bg-white p-3 text-[#141414]">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[#141414]/30 pb-2">
        <span className="font-serif text-lg">Diagnostic plate</span>
        <span className="text-xs">Ink plate of scored characters.</span>
      </figcaption>
      <svg viewBox="0 0 760 540" role="img" aria-labelledby={captionId} className="h-auto w-full bg-white">
        <rect width="760" height="540" fill={PAPER} />
        <rect x="8" y="8" width="744" height="524" fill="none" stroke={INK} strokeWidth="1" />
        {model.main === "none" ? null : (
          <text x="28" y="40" fill={INK} fontSize="22" fontStyle="italic" className="font-serif">
            A
          </text>
        )}
        <MainMark model={model} uid={uid} />
        <SideViews model={model} />
        <line x1="24" y1="500" x2="736" y2="500" stroke={INK} strokeWidth="0.6" />
        <text x="380" y="522" fill={INK} fontSize="15" textAnchor="middle" className="font-serif">
          {model.scaleNote}
        </text>
      </svg>
      <p id={captionId} className="mt-2 text-sm leading-relaxed">
        {model.caption}
      </p>
    </figure>
  )
}
