# Field Sheet

A field worksheet for botanists and dendrologists who need a record they can defend later. You score the organs in front of you. The sheet ranks a short worldwide list, draws a plate from the photographs you supply, and writes a Darwin Core file you can hand to a herbarium or a manuscript.

The result is a field hypothesis. It is not a determination, and it will not call a plant a new species.

## Who it is for

Use it when you are standing at the plant and you will write the name up later. The list is small on purpose. A thin global key is more honest than a flora of two countries dressed up as worldwide coverage. Papua New Guinea and Taiwan woody plants are in the list as examples, not as the whole flora.

Check any name you intend to publish against [POWO](https://powo.science.kew.org/) or [World Flora Online](https://www.worldfloraonline.org/). The sheet will lag those sources. When the phone has a network, the top name is also looked up on the [GBIF](https://www.gbif.org/) species API. The sheet name is not replaced. A hybrid or an aggregate is not rewritten into a species it is not.

## What a record contains

- A coarse region from the phone, or one you pick. Skipping place leaves no geographic flag. A missing GPS point stays missing. No uncertainty in meters is invented.
- A photograph, with a warning if the frame is soft, dark or blown. You can keep the frame anyway.
- Characters you actually saw. Unknown is not scored as a clash. The margin prompt tells you to score the lobe edge, not the sinus.
- A schematic plate that draws only the characters you marked.
- A pen-and-ink plate traced from the views you upload (habit, leaf, flower or fruit, close detail). An empty view stays empty and labeled. Measurements and notes print as text. They do not become a drawing.
- A ranked name, the traits that fit and the traits that do not, and a review line when the record should go to a specialist.
- Poison lines for plants people put in a mouth or a paddock, including yew, oleander, castor, bracken, lantana fruit, ginkgo seed and mango sap. The sheet does not say a plant is edible.
- Darwin Core JSON and CSV. `locality` is only the words you typed. The coarse region sits in remarks. Verification status is unverified. `eventDate` is the time you saved the sheet.

Records stay in this browser. There is no account and no server database.

## What it will not do

- Declare a new species, a type, or a confirmed identification.
- Invent an organ you did not photograph, or a vein you did not score.
- Ask you to nick or crush a healthy plant.
- Pretend a detector, a flora database, or a training set ran. There is no Pl@ntNet call and no iNaturalist vision call.
- Attach author citations. A wrong author is worse than none.

## Run it

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

After the worksheet copy is stored on the phone, the character key, both plates and the journal open with no signal. The GBIF check does not. A failed copy is not a saved record.

The taxon list lives in `src/lib/taxa.ts`. The name check lives in `src/lib/gbif.ts`.
