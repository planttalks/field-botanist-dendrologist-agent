# Field Sheet

A pocket worksheet for identifying plants and trees. You mark the characters you can see. The sheet ranks a short worldwide list and stores a Darwin Core style record in the browser.

It is a field hypothesis, not a determination. It does not cover only Papua New Guinea or Taiwan. It will not tell you a plant is edible, and it will not call a new species.

No account, no database and no API key. Identification runs in the browser from the list in `src/lib/taxa.ts`.

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

## What you can do

1. Set a place, or skip it. The phone can suggest a coarse region.
2. Take or upload a photo. A soft, dark or blown frame asks you to try again. You can keep it anyway.
3. Mark habit, leaves, bark, flowers and fruit. Unknown stays unknown.
4. Add habit, leaf, flower or fruit, and a close detail if you have them. The plate traces those photos. Empty views stay blank. Notes print. They do not invent a drawing.
5. Read the ranked names, the diagnostic plate and the review note.
6. Save the name or save the record unidentified. Export JSON or CSV from the journal. The JSON includes the illustration plate.

Photos and notes stay in `localStorage` on this device. Clearing site data clears the journal.

Names should be checked against [POWO](https://powo.science.kew.org/) or [World Flora Online](https://www.worldfloraonline.org/) before you publish them. The in-app list will lag those sources.
