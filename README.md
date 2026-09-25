# Field Sheet

Field Sheet is a worksheet for botanists and dendrologists. The observer scores the organs of the plant. The sheet ranks a short worldwide list. It draws a plate from the supplied photographs. It writes a Darwin Core file for a herbarium or a manuscript.

The result is a field hypothesis. It is not a determination. The sheet will not declare a new species.

## Users

Use the sheet while at the plant. Use it before a name is prepared for publication. The list is short. It is not a flora. Woody plants of Papua New Guinea and Taiwan are examples. They are not the whole flora.

Confirm any name intended for publication in [POWO](https://powo.science.kew.org/) or [World Flora Online](https://www.worldfloraonline.org/). The sheet lags those sources. When a network is available, the top name is also checked on the [GBIF](https://www.gbif.org/) species API. The same name is compared with the Kew checklist and the World Flora Online Plant List. The sheet name is not replaced. A hybrid is not rewritten as a species. An aggregate is not rewritten as a species.

## Record contents

- The region may come from the phone, or it may be selected by hand. If place is omitted, no geographic flag is set. A missing GPS point stays missing. Uncertainty in meters is not invented.
- A photograph may be attached. A warning is shown if the frame is soft, dark or overexposed. The frame may still be kept.
- Only observed characters are scored. Unknown is not scored as a clash. Score the margin of the lobe, not the sinus.
- The schematic plate draws only the characters that were marked.
- The pen-and-ink plate is traced from the uploaded views (habit, leaf, flower or fruit, close detail). An empty view stays empty and keeps its label. Measurements and notes are printed as text. They are not drawn.
- The record stores a ranked name. It stores the traits that fit and the traits that do not fit. A review line is added when a specialist should examine the plant.
- Poison warnings are given for yew, oleander, castor, bracken, lantana fruit, ginkgo seed and mango sap. The sheet does not state that a plant is edible.
- Export is Darwin Core JSON and CSV. `locality` contains only the words that were typed. The coarse region is stored in remarks. Verification status is unverified. `eventDate` is the time the sheet was saved.

Records remain in this browser. There is no account. There is no server database.

## Limits

- The sheet does not declare a new species, a type or a confirmed identification.
- It does not invent an organ that was not photographed.
- It does not invent a vein that was not scored.
- It does not request a cut or a crushed sample from a healthy plant.
- It does not call an image detector or a training set. There is no Pl@ntNet call. There is no iNaturalist vision call. When a network is available it does read two published name lists and a GBIF occurrence map. See the backbone section below.
- It does not attach author citations. An incorrect author is omitted.

## Local use

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43117](http://127.0.0.1:43117).

```bash
npm test
npm run lint
npm run build
```

`npm start` serves a production build on the same port.

After the worksheet copy is stored on the phone, the character key, both plates and the journal open without a network. The GBIF check, the backbone comparison and the distribution map do not. A failed copy is not a saved record.

## Backbone check and map

After the character key returns a name, two panels compare that name with published lists. The panels sit under the name on the result screen and on a saved record. The sheet name is not replaced. A new species is not declared.

The first list is the World Checklist of Vascular Plants (Kew). That checklist is the names backbone of Plants of the World Online. The second list is the World Flora Online Plant List. Both are read from the public ChecklistBank API (datasets 2000 and 2004). No key is sent. The POWO website is not called. That site did not return the checklist to a plain request, so the published ChecklistBank copy is used instead.

The classification shows family, genus and species. An infraspecific rank is added when the list returns one. The tree is a classification. It is not a phylogeny.

A geographic note is printed only when the World Checklist record includes one. The map is a GBIF occurrence image, with country counts from the same service. If a call fails, or the phone is offline, the sheet says that the check did not run or that the distribution was not retrieved. The sheet does not draw a range of its own.

The taxon list is in `src/lib/taxa.ts`. The GBIF name line is in `src/lib/gbif.ts`. The backbone comparison is in `src/lib/backbone.ts`. The distribution call is in `src/lib/distribution.ts`.
