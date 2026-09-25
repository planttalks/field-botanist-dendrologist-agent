import {
  isSkipped,
  phraseFor,
  type CharacterKey,
  type Observation,
} from "@/lib/types"

type SubjectKind =
  | "pad"
  | "frond"
  | "scale"
  | "needle"
  | "pinnate"
  | "bipinnate"
  | "palmate"
  | "simple"
  | "none"

function bladePath(shape: string): string {
  switch (shape) {
    case "lanceolate":
      return "M0,-70 C16,-48 18,-8 10,48 C6,62 0,70 0,70 C0,70 -6,62 -10,48 C-18,-8 -16,-48 0,-70 Z"
    case "linear":
      return "M0,-74 C5,-70 6,66 0,70 C-6,66 -5,-70 0,-74 Z"
    case "ovate":
      return "M0,-62 C28,-40 32,0 18,48 C8,64 0,68 0,68 C0,68 -8,64 -18,48 C-32,0 -28,-40 0,-62 Z"
    case "obovate":
      return "M0,-66 C18,-62 30,-36 24,-8 C16,28 8,58 0,64 C-8,58 -16,28 -24,-8 C-30,-36 -18,-62 0,-66 Z"
    case "cordate":
      return "M0,-18 C-26,-56 -50,-18 -28,22 C-14,48 0,62 0,62 C0,62 14,48 28,22 C50,-18 26,-56 0,-18 Z"
    case "fan":
      return "M0,34 C-10,34 -48,6 -54,-20 C-30,-50 -8,-26 0,-36 C8,-26 30,-50 54,-20 C48,6 10,34 0,34 Z"
    case "lobed-pinnate":
      return "M0,-68 L12,-50 L4,-38 L20,-24 L6,-12 L22,4 L6,18 L16,34 L2,40 L0,62 L-2,40 L-16,34 L-6,18 L-22,4 L-6,-12 L-20,-24 L-4,-38 L-12,-50 Z"
    case "lobed-palmate":
      return "M0,-66 L14,-38 L36,-56 L26,-22 L54,-16 L28,-2 L38,30 L14,16 L6,50 L0,24 L-6,50 L-14,16 L-38,30 L-28,-2 L-54,-16 L-26,-22 L-36,-56 L-14,-38 Z"
    case "pad":
      return "M0,-42 C24,-42 30,-8 22,30 C14,50 0,54 0,54 C0,54 -14,50 -22,30 C-30,-8 -24,-42 0,-42 Z"
    case "elliptic":
      return "M0,-64 C26,-40 28,8 16,46 C8,62 0,66 0,66 C0,66 -8,62 -16,46 C-28,8 -26,-40 0,-64 Z"
    default:
      return "M0,-64 C26,-40 28,8 16,46 C8,62 0,66 0,66 C0,66 -8,62 -16,46 C-28,8 -26,-40 0,-64 Z"
  }
}

function veins(venation: string) {
  switch (venation) {
    case "parallel":
      return (
        <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.7">
          <path d="M0,-48 L0,48" />
          <path d="M-8,-40 L-6,40" />
          <path d="M8,-40 L6,40" />
        </g>
      )
    case "dichotomous":
      return (
        <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.75">
          <path d="M0,20 L0,-8" />
          <path d="M0,-8 L-16,-28" />
          <path d="M0,-8 L16,-28" />
          <path d="M-16,-28 L-28,-40" />
          <path d="M-16,-28 L-8,-36" />
          <path d="M16,-28 L8,-36" />
          <path d="M16,-28 L28,-40" />
        </g>
      )
    case "palmate":
      return (
        <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.75">
          <path d="M0,40 L0,-40" />
          <path d="M0,10 L-28,-28" />
          <path d="M0,10 L28,-28" />
          <path d="M0,20 L-18,8" />
          <path d="M0,20 L18,8" />
        </g>
      )
    case "pinnate":
      return (
        <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.75">
          <path d="M0,48 L0,-48" />
          <path d="M0,20 L-16,4" />
          <path d="M0,20 L16,4" />
          <path d="M0,-4 L-14,-16" />
          <path d="M0,-4 L14,-16" />
          <path d="M0,-24 L-10,-34" />
          <path d="M0,-24 L10,-34" />
        </g>
      )
    default:
      return null
  }
}

function Leaf({
  shape,
  venation,
  x,
  y,
  rotate,
  placeholder,
}: {
  shape: string
  venation: string
  x: number
  y: number
  rotate: number
  placeholder: boolean
}) {
  const id = `leaf-${x}-${y}-${rotate}`.replaceAll(".", "")
  const drawn = placeholder ? "elliptic" : shape
  const showVeins = !isSkipped(venation)
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path d="M0,52 L0,78" stroke="currentColor" strokeWidth="2" strokeDasharray={placeholder ? "3 3" : undefined} />
      <clipPath id={id}>
        <path d={bladePath(drawn)} />
      </clipPath>
      <path
        d={bladePath(drawn)}
        fill={placeholder ? "none" : "var(--muted)"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray={placeholder ? "4 3" : undefined}
      />
      {showVeins ? <g clipPath={`url(#${id})`}>{veins(venation)}</g> : null}
    </g>
  )
}

function SimpleSprig({ observation }: { observation: Observation }) {
  const placeholder = isSkipped(observation.shape)
  const shape = placeholder ? "elliptic" : observation.shape
  const venation = observation.venation
  if (observation.arrangement === "opposite") {
    return (
      <g>
        <path d="M150,210 L150,70" stroke="currentColor" strokeWidth="2" fill="none" />
        <Leaf shape={shape} venation={venation} x={118} y={110} rotate={-28} placeholder={placeholder} />
        <Leaf shape={shape} venation={venation} x={182} y={110} rotate={28} placeholder={placeholder} />
      </g>
    )
  }
  if (observation.arrangement === "whorled") {
    return (
      <g>
        <path d="M150,220 L150,80" stroke="currentColor" strokeWidth="2" fill="none" />
        <Leaf shape={shape} venation={venation} x={150} y={100} rotate={0} placeholder={placeholder} />
        <Leaf shape={shape} venation={venation} x={108} y={130} rotate={-50} placeholder={placeholder} />
        <Leaf shape={shape} venation={venation} x={192} y={130} rotate={50} placeholder={placeholder} />
      </g>
    )
  }
  if (observation.arrangement === "basal") {
    return (
      <g>
        <Leaf shape={shape} venation={venation} x={150} y={150} rotate={0} placeholder={placeholder} />
        <Leaf shape={shape} venation={venation} x={96} y={168} rotate={-36} placeholder={placeholder} />
        <Leaf shape={shape} venation={venation} x={204} y={168} rotate={36} placeholder={placeholder} />
      </g>
    )
  }
  if (observation.arrangement === "alternate") {
    return (
      <g>
        <path d="M150,230 L150,60" stroke="currentColor" strokeWidth="2" fill="none" />
        <Leaf shape={shape} venation={venation} x={116} y={100} rotate={-24} placeholder={placeholder} />
        <Leaf shape={shape} venation={venation} x={186} y={155} rotate={22} placeholder={placeholder} />
      </g>
    )
  }
  return <Leaf shape={shape} venation={venation} x={150} y={130} rotate={0} placeholder={placeholder} />
}

function Compound({ kind }: { kind: string }) {
  const pairs = kind === "bipinnate" ? [-40, -10, 20] : [-48, -16, 16, 48]
  return (
    <g transform="translate(150 140)">
      <path d="M0,70 L0,-78" stroke="currentColor" strokeWidth="2" />
      {pairs.map((dy) => (
        <g key={dy}>
          {kind === "bipinnate" ? (
            <path d={`M0,${dy} L34,${dy - 16}`} stroke="currentColor" strokeWidth="1.4" />
          ) : null}
          <ellipse cx={kind === "palmate-compound" ? 28 : 36} cy={kind === "palmate-compound" ? dy - 20 : dy} rx="16" ry="7" transform={kind === "palmate-compound" ? `rotate(-30 28 ${dy - 20})` : `rotate(-18 36 ${dy})`} fill="var(--muted)" stroke="currentColor" />
          <ellipse cx={kind === "palmate-compound" ? -28 : -36} cy={kind === "palmate-compound" ? dy - 20 : dy} rx="16" ry="7" transform={kind === "palmate-compound" ? `rotate(30 -28 ${dy - 20})` : `rotate(18 -36 ${dy})`} fill="var(--muted)" stroke="currentColor" />
        </g>
      ))}
      {kind === "palmate-compound" ? (
        <ellipse cx="0" cy="-62" rx="16" ry="7" fill="var(--muted)" stroke="currentColor" />
      ) : null}
    </g>
  )
}

function Needles({ mode }: { mode: string }) {
  if (mode === "unset") {
    return (
      <text x="70" y="150" className="fill-current text-[14px]">
        Needles. Bundle not marked.
      </text>
    )
  }
  const count = mode === "three" ? 3 : mode === "flat-spray" ? 8 : 2
  if (mode === "flat-spray") {
    return (
      <g transform="translate(150 150)" stroke="currentColor" fill="none" strokeWidth="1.4">
        {Array.from({ length: count }, (_, index) => (
          <path key={index} d={`M0,${index * 8 - 24} L${index % 2 === 0 ? -46 : 46},${index * 6 - 30}`} />
        ))}
      </g>
    )
  }
  return (
    <g transform="translate(150 160)" stroke="currentColor" strokeWidth="1.6">
      {Array.from({ length: count }, (_, index) => {
        const spread = (index - (count - 1) / 2) * 14
        return <path key={index} d={`M0,20 L${spread},-70`} />
      })}
    </g>
  )
}

function Scales() {
  return (
    <g transform="translate(150 150)" fill="var(--muted)" stroke="currentColor">
      <path d="M0,80 L0,-80" strokeWidth="3" />
      {[-60, -30, 0, 30, 60].map((y) => (
        <path key={y} d={`M0,${y} L18,${y - 12} L0,${y - 4} L-18,${y - 12} Z`} />
      ))}
    </g>
  )
}

function Frond() {
  return (
    <g transform="translate(150 150)" stroke="currentColor" fill="var(--muted)">
      <path d="M0,70 L0,-80" strokeWidth="2" fill="none" />
      {[-50, -20, 10, 40].map((y) => (
        <path key={y} d={`M0,${y} L40,${y - 18} L0,${y - 6} L-40,${y - 18} Z`} />
      ))}
    </g>
  )
}

function Pads() {
  return (
    <g transform="translate(150 150)" fill="var(--muted)" stroke="currentColor" strokeWidth="1.6">
      <ellipse cx="0" cy="30" rx="34" ry="48" />
      <ellipse cx="0" cy="-40" rx="28" ry="40" />
    </g>
  )
}

function subjectKind(observation: Observation): SubjectKind {
  if (observation.shape === "pad") return "pad"
  if (observation.leafType === "frond") return "frond"
  if (observation.leafType === "scale-like") return "scale"
  if (
    observation.leafType === "needle" ||
    observation.fascicle === "two" ||
    observation.fascicle === "three" ||
    observation.fascicle === "flat-spray"
  ) {
    return "needle"
  }
  if (observation.leafType === "pinnate") return "pinnate"
  if (observation.leafType === "bipinnate") return "bipinnate"
  if (observation.leafType === "palmate-compound") return "palmate"
  if (observation.habit === "fern" && isSkipped(observation.leafType)) return "frond"
  const leafMarked =
    !isSkipped(observation.shape) ||
    !isSkipped(observation.arrangement) ||
    !isSkipped(observation.venation) ||
    !isSkipped(observation.margin) ||
    !isSkipped(observation.petiole) ||
    !isSkipped(observation.lobes)
  if (leafMarked) return "simple"
  return "none"
}

function Subject({ observation }: { observation: Observation }) {
  const kind = subjectKind(observation)
  switch (kind) {
    case "pad":
      return <Pads />
    case "frond":
      return <Frond />
    case "scale":
      return <Scales />
    case "needle": {
      const bundle =
        observation.fascicle === "two" || observation.fascicle === "three" || observation.fascicle === "flat-spray"
          ? observation.fascicle
          : "unset"
      return <Needles mode={bundle} />
    }
    case "pinnate":
      return <Compound kind="pinnate" />
    case "bipinnate":
      return <Compound kind="bipinnate" />
    case "palmate":
      return <Compound kind="palmate-compound" />
    case "simple":
      return <SimpleSprig observation={observation} />
    case "none":
      if (!isSkipped(observation.bark)) return null
      return (
        <text x="36" y="150" className="fill-current text-[14px]">
          No leaf or bark characters marked. Nothing is drawn.
        </text>
      )
    default: {
      const exhaustive: never = kind
      throw new Error(`Unknown plate subject: ${String(exhaustive)}`)
    }
  }
}

function BarkStrip({ bark }: { bark: string }) {
  if (isSkipped(bark)) return null
  return (
    <g transform="translate(36 248)">
      <rect width="120" height="28" rx="4" fill="var(--muted)" stroke="currentColor" />
      {bark === "fissured" || bark === "corky"
        ? [18, 36, 54, 72, 90].map((x) => <path key={x} d={`M${x},4 L${x + 4},24`} stroke="currentColor" fill="none" />)
        : null}
      {bark === "peeling"
        ? [8, 46, 78].map((x) => <rect key={x} x={x} y="6" width="28" height="14" fill="var(--card)" stroke="currentColor" />)
        : null}
      {bark === "scaly"
        ? [10, 34, 58, 82].map((x) => <rect key={x} x={x} y="8" width="16" height="12" fill="none" stroke="currentColor" />)
        : null}
      {bark === "smooth" ? <circle cx="40" cy="14" r="1.5" /> : null}
      <text x="128" y="18" className="fill-current text-[11px]">
        Bark
      </text>
    </g>
  )
}

function plateSentence(observation: Observation): string {
  const bits: string[] = []
  const keys: CharacterKey[] = ["habit", "arrangement", "leafType", "shape", "margin", "venation", "bark", "fruit"]
  for (const key of keys) {
    const value = observation[key]
    if (!isSkipped(value)) bits.push(phraseFor(key, value))
  }
  const kind = subjectKind(observation)
  if (kind === "simple" && isSkipped(observation.shape)) {
    bits.push("dashed outline because the shape was not marked")
  }
  if (kind === "needle" && observation.fascicle !== "two" && observation.fascicle !== "three" && observation.fascicle !== "flat-spray") {
    bits.push("needle bundle not marked")
  }
  if (observation.lengthCm && observation.widthCm) {
    bits.push(`lamina ${observation.lengthCm} by ${observation.widthCm} cm`)
  } else if (observation.lengthCm) {
    bits.push(`lamina length ${observation.lengthCm} cm`)
  }
  if (bits.length === 0) return "No characters marked yet. Nothing is drawn."
  return `Marked characters: ${bits.join(", ")}.`
}

export function DiagnosticPlate({ observation }: { observation: Observation }) {
  const sentence = plateSentence(observation)
  return (
    <figure className="ink-frame p-3 text-foreground">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-foreground/25 pb-2">
        <span className="font-serif text-lg">Diagnostic plate</span>
        <span className="text-xs">Schematic. Unmarked parts are not drawn.</span>
      </figcaption>
      <svg viewBox="0 0 420 290" role="img" aria-label={sentence} className="h-auto w-full">
        <Subject observation={observation} />
        <BarkStrip bark={observation.bark} />
      </svg>
      <p className="mt-2 text-sm leading-relaxed">{sentence}</p>
    </figure>
  )
}
