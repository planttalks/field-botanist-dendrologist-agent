# Field Sheet

Field Sheet is a worksheet for botanists and dendrologists. The observer scores the organs of the plant. The sheet ranks a short worldwide list. It draws a plate from the supplied photographs. It writes a Darwin Core file for a herbarium or a manuscript.

The result is a field hypothesis. It is not a determination. The sheet will not declare a new species.

## Users

Use the sheet while at the plant. Use it before a name is prepared for publication. The list is short. It is not a flora. Woody plants of Papua New Guinea and Taiwan are examples. They are not the whole flora.

Confirm any name intended for publication in [POWO](https://powo.science.kew.org/) or [World Flora Online](https://www.worldfloraonline.org/). The sheet lags those sources. When a network is available, the top name is also checked on the [GBIF](https://www.gbif.org/) species API. The same name is compared with the Kew checklist and the World Flora Online Plant List. A short list under the name asks IPNI, Tropicos, USDA PLANTS, Tela Botanica and the Muséum national d'Histoire naturelle. The sheet name is not replaced. A hybrid is not rewritten as a species. An aggregate is not rewritten as a species.

## Record contents

- The region may come from the phone, or it may be selected by hand. If place is omitted, no geographic flag is set. A missing GPS point stays missing. Uncertainty in meters is not invented.
- A photograph may be attached. A warning is shown if the frame is soft, dark or overexposed. The frame may still be kept.
- Only observed characters are scored. Unknown is not scored as a clash. Score the margin of the lobe, not the sinus.
- The diagnostic schematic is an ink plate of the characters that were scored. It is not a drawing of the specimen. It is not a copy of a published plate. A published illustration of the sheet name may sit beside it. The two figures stay separate.
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
- It does not call an image detector or a training set. There is no Pl@ntNet call. There is no iNaturalist vision call. It does not generate a plant. When a network is available it reads two published name lists, a GBIF occurrence map and the name sources that answer without a key. It may also show a published illustration of the sheet name. See the sections below.
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

After the worksheet copy is stored on the phone, the character key, the schematic, the ink plate and the journal open without a network. The GBIF check, the backbone comparison, the distribution map, the other name lines and the published illustration do not. If the phone is offline, the sheet says that the illustration was not retrieved. A failed copy is not a saved record.

## Backbone check and map

After the character key returns a name, two panels compare that name with published lists. The panels sit under the name on the result screen and on a saved record. The sheet name is not replaced. A new species is not declared.

The first list is the World Checklist of Vascular Plants (Kew). That checklist is the names backbone of Plants of the World Online. The second list is the World Flora Online Plant List. Both are read from the public ChecklistBank API (datasets 2000 and 2004). No key is sent. The POWO website is not called. That site did not return the checklist to a plain request, so the published ChecklistBank copy is used instead.

The classification shows family, genus and species. An infraspecific rank is added when the list returns one. The tree is a classification. It is not a phylogeny.

A geographic note is printed only when the World Checklist record includes one. The map is a GBIF occurrence image, with country counts from the same service. If a call fails, or the phone is offline, the sheet says that the check did not run or that the distribution was not retrieved. The sheet does not draw a range of its own.

The taxon list is in `src/lib/taxa.ts`. The GBIF name line is in `src/lib/gbif.ts`. The backbone comparison is in `src/lib/backbone.ts`. The distribution call is in `src/lib/distribution.ts`. The other name lines are in `src/lib/name-sources.ts`.

## Other name lines

Under the sheet name, five more sources are listed. Each line is labeled with the source. A returned accepted name or citation is printed. The sheet name is not replaced. A new species is not declared. If a source needs a token, or the host does not answer, that line says the check did not run. The source stays on the screen.

These calls were made for *Quercus robur* with no API key.

- IPNI answers. `GET https://www.ipni.org/api/1/search` with the genus, the species epithet and rank `spec.` returns HTTP 200. No key is sent. When several species citations share the binomial, the line keeps the one record that IPNI links to Plants of the World Online. It does not merge the others into a new name.
- Tropicos does not answer a public name search. `GET https://services.tropicos.org/Name/Search` returns HTTP 200 and the message that the request is not allowed. A key is required. The line says the check did not run. Token required.
- USDA PLANTS answers. `GET https://plantsservices.sc.egov.usda.gov/api/PlantSearch` returns HTTP 200. No key is sent. The line shows the matching scientific name for the species rank.
- Tela Botanica answers. `GET https://api.tela-botanica.org/service:eflore:0.1/bdtfx/noms` returns HTTP 200. No key is sent. The line shows the retained name and its citation.
- Muséum national d'Histoire naturelle does not answer here. `GET https://taxref.mnhn.fr/api/taxa/search` returns HTTP 403. The line says the check did not run. No response.

## Published illustration

The schematic stays. It draws only the characters that were marked. When the sheet has a name, a second figure may show a published illustration of that name. The figure sits beside the schematic on the result and on a saved record. It is not a drawing of this specimen. The sheet name is not replaced. A new species is not declared.

The preferred source is Wikimedia Commons, in the manner of the category [Botanical illustrations](https://commons.wikimedia.org/wiki/Category:Botanical_illustrations). The sheet searches `Category:{name} - botanical illustrations`. It keeps a file whose title contains the sheet name. The figure shows that image, the file title, the artist when the file records one and a link to the Commons page. The label says it is a published illustration of this name, not a drawing of this specimen. The source line says Wikimedia Commons.

Trefle is used only when that search returns no illustration and the Trefle response contains an image file. The documented search is `GET https://trefle.io/api/v1/plants`. It requires an access token. This sheet does not hold a token. A request without a token returns HTTP 401. That response is not an illustration.

The Biodiversity Heritage Library API is `https://www.biodiversitylibrary.org/api3`, operation `GetNameMetadata`. A request without a key returns HTTP 401. That response is not an illustration. The sheet does not send a key. A BHL page is shown only when a keyless response contains an illustration file.

If Commons has no illustration, and Trefle and BHL do not return an image file, the sheet says that the illustration was not retrieved. The same sentence is used when the phone is offline. The sheet does not generate a plant and it does not draw a hypothetical one.

A returned image address can be stored with the record. It is a published file for the sheet name. It is not a photograph of this plant. The reader is in `src/lib/name-image.ts`.
