export const ORGANS = [
  { value: "whole", label: "Whole plant" },
  { value: "leaf", label: "Leaf" },
  { value: "flower", label: "Flower" },
  { value: "fruit", label: "Fruit or cone" },
  { value: "bark", label: "Bark" },
  { value: "bud", label: "Bud or shoot" },
  { value: "roots", label: "Roots" },
] as const

export type Organ = (typeof ORGANS)[number]["value"]

export interface Choice {
  value: string
  label: string
  phrase: string
}

export const HABITS: Choice[] = [
  { value: "tree", label: "Tree", phrase: "tree" },
  { value: "shrub", label: "Shrub", phrase: "shrub" },
  { value: "herb", label: "Herb, not woody", phrase: "a non-woody herb" },
  { value: "vine", label: "Vine", phrase: "vine" },
  { value: "palm", label: "Palm", phrase: "palm" },
  { value: "fern", label: "Fern", phrase: "fern" },
  { value: "grass", label: "Grass or bamboo", phrase: "grass or bamboo" },
  { value: "succulent", label: "Succulent", phrase: "succulent" },
  { value: "not-seen", label: "Not sure", phrase: "habit not set" },
]

export const ARRANGEMENTS: Choice[] = [
  { value: "alternate", label: "Alternate", phrase: "alternate leaves" },
  { value: "opposite", label: "Opposite", phrase: "opposite leaves" },
  { value: "whorled", label: "Whorled", phrase: "whorled leaves" },
  { value: "basal", label: "Basal rosette", phrase: "a basal rosette" },
  { value: "not-seen", label: "Not seen", phrase: "arrangement not seen" },
]

export const LEAF_TYPES: Choice[] = [
  { value: "simple", label: "Simple", phrase: "simple leaves" },
  { value: "pinnate", label: "Pinnate", phrase: "pinnate leaves" },
  { value: "bipinnate", label: "Bipinnate", phrase: "bipinnate leaves" },
  { value: "palmate-compound", label: "Palmate compound", phrase: "palmate compound leaves" },
  { value: "needle", label: "Needles", phrase: "needles" },
  { value: "scale-like", label: "Scales or branchlets", phrase: "scale-like leaves or branchlets" },
  { value: "frond", label: "Fern frond", phrase: "a fern frond" },
  { value: "not-seen", label: "Not seen", phrase: "leaf type not seen" },
]

export const SHAPES: Choice[] = [
  { value: "ovate", label: "Ovate", phrase: "ovate blades" },
  { value: "elliptic", label: "Elliptic", phrase: "elliptic blades" },
  { value: "obovate", label: "Obovate", phrase: "obovate blades" },
  { value: "lanceolate", label: "Lanceolate", phrase: "lanceolate blades" },
  { value: "linear", label: "Linear", phrase: "linear blades" },
  { value: "cordate", label: "Heart-shaped", phrase: "heart-shaped blades" },
  { value: "fan", label: "Fan", phrase: "fan-shaped blades" },
  { value: "lobed-pinnate", label: "Pinnately lobed", phrase: "pinnately lobed blades" },
  { value: "lobed-palmate", label: "Palmately lobed", phrase: "palmately lobed blades" },
  { value: "pad", label: "Flat pad", phrase: "flat pads" },
  { value: "not-seen", label: "Not seen", phrase: "shape not seen" },
]

export const MARGINS: Choice[] = [
  { value: "entire", label: "Smooth edge", phrase: "a smooth margin" },
  { value: "toothed", label: "Toothed", phrase: "a toothed margin" },
  { value: "wavy", label: "Wavy", phrase: "a wavy margin" },
  { value: "spiny", label: "Spiny", phrase: "a spiny margin" },
  { value: "rolled-under", label: "Rolled under", phrase: "a margin rolled under" },
  { value: "not-seen", label: "Not seen", phrase: "margin not seen" },
]

export const VENATIONS: Choice[] = [
  { value: "pinnate", label: "Pinnate", phrase: "pinnate veins" },
  { value: "palmate", label: "Palmate or 3 main veins", phrase: "palmate veins" },
  { value: "parallel", label: "Parallel", phrase: "parallel veins" },
  { value: "dichotomous", label: "Forking", phrase: "forking veins" },
  { value: "not-seen", label: "Not seen", phrase: "veins not seen" },
]

export const TEXTURES: Choice[] = [
  { value: "smooth", label: "Smooth", phrase: "a smooth surface" },
  { value: "glossy", label: "Glossy", phrase: "a glossy surface" },
  { value: "rough", label: "Rough or sandpapery", phrase: "a rough surface" },
  { value: "hairy", label: "Hairy", phrase: "a hairy surface" },
  { value: "not-seen", label: "Not seen", phrase: "surface not seen" },
]

export const PETIOLES: Choice[] = [
  { value: "short", label: "Short", phrase: "a short petiole" },
  { value: "long", label: "Long", phrase: "a long petiole" },
  { value: "flattened", label: "Flattened", phrase: "a flattened petiole" },
  { value: "winged", label: "Winged or inflated", phrase: "a winged or inflated petiole" },
  { value: "not-seen", label: "Not seen", phrase: "petiole not seen" },
]

export const LOBES: Choice[] = [
  { value: "none", label: "Not lobed", phrase: "an unlobed blade" },
  { value: "three", label: "About 3 lobes", phrase: "about three lobes" },
  { value: "five", label: "About 5 lobes", phrase: "about five lobes" },
  { value: "many", label: "Many lobes", phrase: "many lobes" },
  { value: "not-seen", label: "Not seen", phrase: "lobes not seen" },
]

export const FASCICLES: Choice[] = [
  { value: "two", label: "Needles in twos", phrase: "needles in twos" },
  { value: "three", label: "Needles in threes", phrase: "needles in threes" },
  { value: "flat-spray", label: "Flat spray of needles", phrase: "a flat spray of needles" },
  { value: "not-a-conifer", label: "Not a needle leaf", phrase: "leaves that are not needles" },
  { value: "not-seen", label: "Not seen", phrase: "needle arrangement not seen" },
]

export const BARKS: Choice[] = [
  { value: "smooth", label: "Smooth", phrase: "smooth bark" },
  { value: "fissured", label: "Fissured", phrase: "fissured bark" },
  { value: "scaly", label: "Scaly or flaky", phrase: "scaly bark" },
  { value: "peeling", label: "Peeling in patches", phrase: "peeling bark" },
  { value: "corky", label: "Corky", phrase: "corky bark" },
  { value: "not-seen", label: "Not seen", phrase: "bark not seen" },
]

export const EXUDATES: Choice[] = [
  { value: "none", label: "No sap worth noting", phrase: "no notable sap" },
  { value: "white-latex", label: "White latex", phrase: "white latex" },
  { value: "resin", label: "Resin or gum", phrase: "resin or gum" },
  { value: "not-seen", label: "Not checked", phrase: "sap not checked" },
]

export const BUDS: Choice[] = [
  { value: "small-dry", label: "Small and dry", phrase: "small dry buds" },
  { value: "long-pointed", label: "Long and pointed", phrase: "long pointed buds" },
  { value: "resinous", label: "Sticky or resinous", phrase: "resinous buds" },
  { value: "clustered", label: "Clustered at the tip", phrase: "buds clustered at the tip" },
  { value: "not-seen", label: "Not seen", phrase: "buds not seen" },
]

export const ROOTS: Choice[] = [
  { value: "prop", label: "Prop roots", phrase: "prop roots" },
  { value: "exposed", label: "Exposed, not props", phrase: "exposed roots" },
  { value: "none", label: "Nothing unusual", phrase: "no unusual roots" },
  { value: "not-seen", label: "Not seen", phrase: "roots not seen" },
]

export const REPRODUCTIVE: Choice[] = [
  { value: "catkin", label: "Catkin", phrase: "catkins" },
  { value: "cone", label: "Cone", phrase: "cones" },
  { value: "showy", label: "Showy flowers", phrase: "showy flowers" },
  { value: "flower-head", label: "Flower head", phrase: "flower heads" },
  { value: "fig", label: "Fig (hidden flowers)", phrase: "figs" },
  { value: "spadix", label: "Spike or spadix", phrase: "a spike or spadix" },
  { value: "tiny", label: "Tiny or inconspicuous", phrase: "tiny flowers" },
  { value: "not-seen", label: "Not seen", phrase: "flowers not seen" },
]

export const FRUITS: Choice[] = [
  { value: "acorn", label: "Acorn", phrase: "acorns" },
  { value: "nut-in-husk", label: "Nut in a husk", phrase: "nuts in a husk" },
  { value: "samara", label: "Winged key", phrase: "winged keys" },
  { value: "round-ball", label: "Round ball on a stalk", phrase: "round fruit balls" },
  { value: "spiky-ball", label: "Spiky ball", phrase: "spiky fruit balls" },
  { value: "cone", label: "Woody cone", phrase: "woody cones" },
  { value: "cone-like", label: "Small cone-like fruit", phrase: "cone-like fruits" },
  { value: "red-cup", label: "Red cup around a seed", phrase: "a red fleshy cup" },
  { value: "woody-capsule", label: "Woody capsule", phrase: "woody capsules" },
  { value: "pod", label: "Pod", phrase: "pods" },
  { value: "drupe", label: "Fleshy fruit, one stone", phrase: "a drupe" },
  { value: "fig", label: "Fig", phrase: "figs" },
  { value: "berry", label: "Berry", phrase: "berries" },
  { value: "large-nut", label: "Large hard fruit", phrase: "a large hard fruit" },
  { value: "date", label: "Date", phrase: "dates" },
  { value: "banana", label: "Banana-like hand", phrase: "a banana-like hand" },
  { value: "pappus", label: "Fluffy seed head", phrase: "fluffy seed heads" },
  { value: "spiny-capsule", label: "Spiny capsule", phrase: "spiny capsules" },
  { value: "small-winged", label: "Tiny winged seeds", phrase: "tiny winged seeds" },
  { value: "fleshy-seed", label: "Fleshy seed", phrase: "a fleshy seed" },
  { value: "fluff-capsule", label: "Capsule with fluff", phrase: "fluffy capsules" },
  { value: "propagule", label: "Hanging green seedling", phrase: "viviparous seedlings" },
  { value: "capsule", label: "Small dry capsule", phrase: "small capsules" },
  { value: "tuna", label: "Fleshy cactus fruit", phrase: "fleshy cactus fruits" },
  { value: "not-seen", label: "Not seen", phrase: "fruit not seen" },
]

export const SCENTS: Choice[] = [
  { value: "aromatic", label: "Aromatic", phrase: "an aromatic crush" },
  { value: "foul", label: "Foul when crushed", phrase: "a foul smell" },
  { value: "none", label: "Little smell", phrase: "little smell" },
  { value: "not-checked", label: "Not checked", phrase: "scent not checked" },
]

export const SITES: Choice[] = [
  { value: "forest", label: "Forest", phrase: "a forest site" },
  { value: "open", label: "Open ground", phrase: "open ground" },
  { value: "wetland", label: "Wetland or river", phrase: "a wet site" },
  { value: "coast", label: "Coast", phrase: "a coastal site" },
  { value: "street", label: "Street or garden", phrase: "a street or garden" },
  { value: "lawn", label: "Lawn", phrase: "a lawn" },
  { value: "indoor", label: "Indoors", phrase: "an indoor plant" },
  { value: "unknown", label: "Not sure", phrase: "site not set" },
]

export const CHARACTER_FIELDS = {
  habit: HABITS,
  arrangement: ARRANGEMENTS,
  leafType: LEAF_TYPES,
  shape: SHAPES,
  margin: MARGINS,
  venation: VENATIONS,
  texture: TEXTURES,
  petiole: PETIOLES,
  lobes: LOBES,
  fascicle: FASCICLES,
  bark: BARKS,
  exudate: EXUDATES,
  buds: BUDS,
  roots: ROOTS,
  reproductive: REPRODUCTIVE,
  fruit: FRUITS,
  scent: SCENTS,
  site: SITES,
} as const

export type CharacterKey = keyof typeof CHARACTER_FIELDS

export const CHARACTER_PROMPTS: Record<CharacterKey, string> = {
  habit: "What is the growth form?",
  arrangement: "How are the leaves arranged on the twig?",
  leafType: "Is the leaf simple, compound, a needle or a frond?",
  shape: "What is the blade shape?",
  margin: "What is the edge of the blade like? On a lobed leaf, look at the edge of one lobe, not the gap between lobes.",
  venation: "How do the veins run?",
  texture: "How does the surface feel?",
  petiole: "How is the leaf stalk?",
  lobes: "How many lobes, if any?",
  fascicle: "If there are needles, how are they bundled?",
  bark: "What is the bark like?",
  exudate: "If a twig is already broken, what is coming out? Do not cut a healthy stem.",
  buds: "What do the buds look like?",
  roots: "Anything unusual at the base?",
  reproductive: "What flowers, catkins or cones are present?",
  fruit: "What fruit is present?",
  scent: "If a scrap is already crushed, what does it smell like? Skip this if the plant might be poisonous.",
  site: "Where is it growing?",
}

const SKIP = new Set(["not-seen", "not-checked", "unknown"])

export function isSkipped(value: string): boolean {
  return SKIP.has(value)
}

export function phraseFor(key: CharacterKey, value: string): string {
  const found = CHARACTER_FIELDS[key].find((choice) => choice.value === value)
  return found?.phrase ?? value
}

export function labelFor(key: CharacterKey, value: string): string {
  const found = CHARACTER_FIELDS[key].find((choice) => choice.value === value)
  return found?.label ?? value
}

export interface Observation {
  organ: Organ
  habit: string
  arrangement: string
  leafType: string
  shape: string
  margin: string
  venation: string
  texture: string
  petiole: string
  lobes: string
  fascicle: string
  bark: string
  exudate: string
  buds: string
  roots: string
  reproductive: string
  fruit: string
  scent: string
  site: string
  lengthCm: number | null
  widthCm: number | null
}

export function blankObservation(): Observation {
  return {
    organ: "whole",
    habit: "not-seen",
    arrangement: "not-seen",
    leafType: "not-seen",
    shape: "not-seen",
    margin: "not-seen",
    venation: "not-seen",
    texture: "not-seen",
    petiole: "not-seen",
    lobes: "not-seen",
    fascicle: "not-seen",
    bark: "not-seen",
    exudate: "not-seen",
    buds: "not-seen",
    roots: "not-seen",
    reproductive: "not-seen",
    fruit: "not-seen",
    scent: "not-checked",
    site: "unknown",
    lengthCm: null,
    widthCm: null,
  }
}

export function observationValue(observation: Observation, key: CharacterKey): string {
  return observation[key]
}
