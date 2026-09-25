import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Limits",
  description: "What Field Sheet will not do, and where the names come from.",
}

export default function LimitsPage() {
  return (
    <article className="max-w-2xl space-y-6">
      <header className="space-y-2 border-b border-foreground/35 pb-4">
        <p className="sheet-kicker">Scope of this worksheet</p>
        <h1 className="font-serif text-3xl leading-tight tracking-tight">Limits</h1>
        <p className="leading-relaxed">
          Field Sheet is a worksheet. It ranks a short worldwide list from characters you mark. It is not a flora, a herbarium or a permit.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="section-rule font-serif text-xl">Safety</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>Do not eat, brew or dose anything because a result named it.</li>
          <li>Yew, oleander, castor, bracken, lantana fruit, ginkgo seed and mango sap carry their own poison warnings when they sit near the top.</li>
          <li>Do not nick a healthy stem for sap, and do not crush a leaf that might be poisonous.</li>
          <li>Invasive notes are a warning not to spread the plant. They are not a legal finding.</li>
          <li>Do not dig a plant up to answer a question. Photograph what is already visible.</li>
          <li>The strongest label the sheet uses is a field hypothesis. It will not say new species or confirmed identification.</li>
          <li>A specialist queue means the characters are thin, the top names collide, or the place is a poor fit.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="section-rule font-serif text-xl">Coverage</h2>
        <p className="text-sm leading-relaxed">
          The list includes street trees, widespread weeds, a few tropical crops, conifers, palms and mangroves, plus a handful of woody plants from New Guinea highland forest and Taiwan wetlands. It will miss most local endemics. When nothing fits, save the record unidentified. A phone in western New Guinea is read as the Pacific islands, not as Southeast Asia. The boxes stay coarse.
        </p>
        <p className="text-sm leading-relaxed">
          Papua New Guinea and Taiwan are in the region list. They are not the full coverage of this worksheet. The same questions are used in those regions, in Lisbon and in Chicago.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="section-rule font-serif text-xl">Offline</h2>
        <p className="text-sm leading-relaxed">
          After the worksheet copy is stored on this phone, these parts work with no signal: the character key, the schematic plate, the ink plate from photos already on the phone, the journal, camera or file upload and a region you pick by hand. Records stay in this browser. The copy is not a record. If it fails, the footer says no record was written.
        </p>
        <p className="text-sm leading-relaxed">
          These parts do not work offline. The GBIF name check does not run, and the sheet name stays. The checklist comparison, the distribution map and the other name lines also do not run. The sheet then says that the check did not run, or that the distribution was not retrieved. The published illustration is not part of the offline copy. If the phone is offline, the sheet says that the illustration was not retrieved. A first visit with an empty copy cannot open pages that were never stored. Add to Home Screen uses that same copy.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="section-rule font-serif text-xl">Sources</h2>
        <p className="text-sm leading-relaxed">
          The names on the sheet are a local list, written to match binomials used by POWO and WFO. They will lag those sites. When a network exists, the top sheet name is checked on GBIF&apos;s public species API. No API key. The GBIF accepted name, rank and status sit beside the sheet name. The sheet name is not replaced. A hybrid or an aggregate is not rewritten into a species it is not. If the phone is offline or GBIF fails, the check says it did not run.
        </p>
        <p className="text-sm leading-relaxed">
          Two panels compare the same sheet name with published lists. The World Checklist of Vascular Plants (Kew), the names backbone of Plants of the World Online, and the World Flora Online Plant List are both read from ChecklistBank. No key is sent. The panel shows a classification of family, genus and species, plus an infraspecific rank when the list returns one. It is a classification, not a phylogeny. A geographic note is shown only when that checklist includes one. A GBIF occurrence map is shown when that call succeeds. If a call fails, the sheet says so. It does not draw a range and it does not declare a new species.
        </p>
        <p className="text-sm leading-relaxed">
          Five more lines sit under the sheet name: IPNI, Tropicos, USDA PLANTS, Tela Botanica and MNHN. IPNI, USDA PLANTS and Tela Botanica answer a public query with no key. Tropicos needs a token, so that check does not run. MNHN did not respond, so that check does not run. A line is still shown for each source. The sheet name is not replaced. A new species is not declared.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            <a className="underline underline-offset-4" href="https://www.ipni.org/">
              IPNI
            </a>{" "}
            for nomenclatural acts.
          </li>
          <li>
            <a className="underline underline-offset-4" href="https://powo.science.kew.org/">
              POWO
            </a>{" "}
            for accepted names and distributions.
          </li>
          <li>
            <a className="underline underline-offset-4" href="https://www.worldfloraonline.org/">
              World Flora Online
            </a>{" "}
            as a second name check.
          </li>
          <li>
            <a className="underline underline-offset-4" href="https://www.gbif.org/">
              GBIF
            </a>{" "}
            for the name check beside the sheet name, and for occurrence maps.
          </li>
          <li>
            <a className="underline underline-offset-4" href="https://www.checklistbank.org/dataset/2000">
              ChecklistBank dataset 2000
            </a>{" "}
            for the Kew checklist.
          </li>
          <li>
            <a className="underline underline-offset-4" href="https://www.checklistbank.org/dataset/2004">
              ChecklistBank dataset 2004
            </a>{" "}
            for the World Flora Online Plant List.
          </li>
          <li>
            <a className="underline underline-offset-4" href="https://commons.wikimedia.org/wiki/Category:Botanical_illustrations">
              Wikimedia Commons botanical illustrations
            </a>{" "}
            for a published illustration of the sheet name. The figure names that source when the file loads.
          </li>
          <li>
            Trefle needs a token. The Biodiversity Heritage Library needs a token. Those sources are not called.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="section-rule font-serif text-xl">Illustration plate</h2>
        <p className="text-sm leading-relaxed">
          The ink plate traces photographs you upload. It does not draw an organ that is missing, and it does not call an image model. Notes for pubescence, stigmas, chambers and scale are printed. They are not turned into extra drawing. The schematic plate draws only characters you marked. Leaf outlines follow standard shape terms. Each scored term is one black outline on white. The outlines are not a copied figure and they are not a generated image. No leaf is drawn when the shape was not scored. A missing vein pattern or needle count stays missing.
        </p>
        <p className="text-sm leading-relaxed">
          A published illustration of the sheet name may sit beside the schematic. The file is a botanical illustration from Wikimedia Commons. It is not a drawing of this specimen. The sheet name is not replaced. A new species is not declared. Trefle needs a token. The Biodiversity Heritage Library needs a token. Those sources are not called. If Commons has no illustration, the sheet says that the illustration was not retrieved. It does not generate a plant.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="section-rule font-serif text-xl">Your records</h2>
        <p className="text-sm leading-relaxed">
          Photos and notes stay in this browser. There is no account and no database. A CSV export is a field hypothesis. The date is when the sheet was saved. A blank locality stays blank. If the phone shares a point, the uncertainty in meters is left blank. If it does not, the point is missing. Nothing is invented.
        </p>
      </section>
    </article>
  )
}
