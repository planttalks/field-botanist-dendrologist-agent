import type { Region } from "./regions"
import { blankObservation, type Observation } from "./types"

export interface SampleWalk {
  id: string
  title: string
  detail: string
  locality: string
  region: Region
  observation: Observation
}

function walk(partial: Partial<Observation>): Observation {
  return { ...blankObservation(), ...partial }
}

export const SAMPLES: SampleWalk[] = [
  {
    id: "park-oak",
    title: "Park oak",
    detail: "Europe. Lobed leaves, short stalks, acorns.",
    locality: "Park lawn edge",
    region: "europe",
    observation: walk({
      organ: "leaf",
      habit: "tree",
      arrangement: "alternate",
      leafType: "simple",
      shape: "lobed-pinnate",
      margin: "entire",
      venation: "pinnate",
      texture: "smooth",
      petiole: "short",
      lobes: "many",
      bark: "fissured",
      exudate: "none",
      buds: "clustered",
      reproductive: "catkin",
      fruit: "acorn",
      scent: "none",
      site: "open",
    }),
  },
  {
    id: "beach-coconut",
    title: "Beach coconut",
    detail: "A coastal palm with a large hard fruit.",
    locality: "Sandy beach",
    region: "pacific-islands",
    observation: walk({
      organ: "whole",
      habit: "palm",
      leafType: "pinnate",
      shape: "linear",
      margin: "entire",
      venation: "parallel",
      reproductive: "spadix",
      fruit: "large-nut",
      site: "coast",
    }),
  },
  {
    id: "lawn-dandelion",
    title: "Lawn dandelion",
    detail: "A rosette with white latex and a fluffy seed head.",
    locality: "Mown lawn",
    region: "north-america",
    observation: walk({
      organ: "whole",
      habit: "herb",
      arrangement: "basal",
      leafType: "simple",
      shape: "lobed-pinnate",
      margin: "toothed",
      lobes: "many",
      exudate: "white-latex",
      reproductive: "flower-head",
      fruit: "pappus",
      site: "lawn",
    }),
  },
]
