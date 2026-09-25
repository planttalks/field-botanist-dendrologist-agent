import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  interpretIpni,
  interpretMnhn,
  interpretTela,
  interpretTelaDetail,
  interpretTropicos,
  interpretUsda,
  lineText,
  lookupNameSources,
  SOURCE_KEYS,
} from "./name-sources"

const ipniOak = {
  results: [
    {
      name: "Quercus robur",
      authors: "Pall.",
      rank: "spec.",
      hybrid: false,
      inPowo: false,
      reference: "Fl. Ross. (Pallas) 1(2): 3. 1789",
      url: "/n/296689-1",
    },
    {
      name: "Quercus robur",
      authors: "L.",
      rank: "spec.",
      hybrid: false,
      inPowo: true,
      reference: "Sp. Pl. 2: 996. 1753 [1 May 1753]",
      url: "/n/304293-2",
    },
    {
      name: "Quercus robur var. acutiloba",
      authors: "Lasch",
      rank: "var.",
      hybrid: false,
      inPowo: true,
      reference: "Bot. Zeitung (Berlin) 15: 415. 1857",
      url: "/n/77290343-1",
    },
  ],
}

describe("name source lines", () => {
  it("keeps one IPNI species citation when several binomials match", () => {
    const line = interpretIpni("Quercus robur", "species", ipniOak)
    assert.equal(line.state, "shown")
    assert.equal(line.citation, "Quercus robur L., Sp. Pl. 2: 996. 1753 [1 May 1753]")
    assert.equal(line.href, "https://www.ipni.org/n/304293-2")
    assert.match(lineText(line), /^IPNI\. Citation /)
    assert.match(lineText(line), /Plants of the World Online/)
    assert.equal(lineText(line).includes("Pall."), false)
    assert.equal(lineText(line).includes("acutiloba"), false)
  })

  it("does not turn an unmarked IPNI hit into the sheet hybrid", () => {
    const line = interpretIpni("Platanus × hispanica", "hybrid", {
      results: [
        {
          name: "Platanus hispanica",
          authors: "Ten.",
          rank: "spec.",
          hybrid: false,
          inPowo: true,
          reference: "Cat. Ort. Nap. (1845) 91.",
          url: "/n/1",
        },
      ],
    })
    assert.equal(line.state, "none")
    assert.match(lineText(line), /IPNI\. No hybrid citation/)
    assert.equal(lineText(line).includes("Platanus hispanica Ten"), false)
  })

  it("does not choose when IPNI returns two linked species citations", () => {
    const second = {
      ...ipniOak.results[1],
      url: "/n/9",
      reference: "Sp. Pl. ed. 2",
    }
    const line = interpretIpni("Quercus robur", "species", { results: [...ipniOak.results, second] })
    assert.equal(line.state, "none")
    assert.match(lineText(line), /None was chosen/)
  })

  it("reads a Tropicos refusal as a missing token", () => {
    const line = interpretTropicos("Quercus robur", [{ Error: "You are not allowed to make this request" }], 200)
    assert.equal(line.state, "skipped")
    assert.equal(lineText(line), "Tropicos. The check did not run. Token required.")
  })

  it("shows one USDA species and drops the form", () => {
    const line = interpretUsda("Quercus robur", "species", [
      {
        Plant: {
          Symbol: "QURO2",
          ScientificName: "<i>Quercus robur</i> L.",
          Rank: "Species",
          AcceptedScientificName: null,
        },
      },
      {
        Plant: {
          Symbol: "QUROF",
          ScientificName: "<i>Quercus robur</i> L. f. <i>fastigiata</i> (Lam.) O. Schwarz",
          Rank: "Form",
          AcceptedScientificName: null,
        },
      },
    ])
    assert.equal(line.state, "shown")
    assert.equal(line.citation, "Quercus robur L.")
    assert.equal(line.href, "https://plants.sc.egov.usda.gov/home/plantProfile?symbol=QURO2")
    assert.equal(lineText(line), "USDA PLANTS. Matching name Quercus robur L.")
    assert.equal(lineText(line).includes("fastigiata"), false)
  })

  it("shows the retained Tela Botanica name and citation", () => {
    const line = interpretTela("Quercus robur", {
      entete: { total: "1" },
      resultat: {
        "75316": {
          nom_sci: "Quercus robur",
          nom_sci_complet: "Quercus robur L. [1753, Sp. Pl., 2 : 996]",
          href: "https://api.tela-botanica.org/service:eflore:0.1/bdtfx/noms/75316",
          retenu: "true",
        },
      },
    })
    assert.equal("state" in line && line.state, "shown")
    if (!("citation" in line)) return
    assert.equal(line.acceptedName, "Quercus robur")
    assert.equal(line.citation, "Quercus robur L. [1753, Sp. Pl., 2 : 996]")
    assert.match(lineText(line), /^Tela Botanica\. Accepted name Quercus robur\. Citation /)
  })

  it("asks for the retained Tela name when the only hit is not retained", () => {
    const line = interpretTela("Taraxacum officinale", {
      entete: { total: "1" },
      resultat: {
        "66979": {
          nom_sci: "Taraxacum officinale",
          nom_sci_complet: "Taraxacum officinale Weber [1780, in F.H.Wigg., Prim. Fl. Holsat., 36]",
          href: "https://api.tela-botanica.org/service:eflore:0.1/bdtfx/noms/66979",
          retenu: "false",
        },
      },
    })
    assert.equal(line.state, "detail")
    if (line.state !== "detail") return
    assert.equal(line.href, "https://api.tela-botanica.org/service:eflore:0.1/bdtfx/noms/66979")
    const detail = interpretTelaDetail({
      "nom_retenu.libelle": "Taraxacum officinale",
      nom_retenu_complet: "Taraxacum officinale F.H.Wigg. [1780, Prim. Fl. Holsat., 56]",
      "nom_retenu.href": "https://api.tela-botanica.org/service:eflore:0.1/bdtfx/noms/119412",
    })
    assert.equal(detail.acceptedName, "Taraxacum officinale")
    assert.match(lineText(detail), /F\.H\.Wigg\./)
  })

  it("shows an MNHN reference name and does not invent one from a blocked host", () => {
    const shown = interpretMnhn(
      "Quercus robur",
      "species",
      {
        _embedded: {
          taxa: [
            {
              id: 116759,
              referenceId: 116759,
              scientificName: "Quercus robur",
              fullName: "Quercus robur L., 1753",
              referenceName: "Quercus robur",
              rankId: "ES",
            },
          ],
        },
      },
      200,
    )
    assert.equal(shown.state, "shown")
    assert.equal(shown.acceptedName, "Quercus robur")
    assert.equal(shown.citation, "Quercus robur L., 1753")
    assert.equal(shown.href, "https://inpn.mnhn.fr/espece/cd_nom/116759")
    const blocked = interpretMnhn("Quercus robur", "species", null, 403)
    assert.equal(lineText(blocked), "MNHN. The check did not run. No response.")
  })

  it("keeps every source on the list when the phone is offline", async () => {
    let calls = 0
    const report = await lookupNameSources("Quercus robur", "species", async () => {
      calls += 1
      return new Response("no")
    }, false)
    assert.equal(calls, 0)
    assert.deepEqual(
      report.lines.map((line) => line.source),
      [...SOURCE_KEYS],
    )
    assert.equal(report.lines.every((line) => line.state === "skipped" && line.reason === "no-response"), true)
    assert.match(report.note, /sheet name stays/i)
    assert.match(report.note, /not a new species/i)
  })

  it("routes each source and still prints a line when one host fails", async () => {
    const report = await lookupNameSources("Quercus robur", "species", async (input) => {
      const url = String(input)
      if (url.includes("ipni.org")) return Response.json(ipniOak)
      if (url.includes("tropicos.org")) return Response.json([{ Error: "You are not allowed to make this request" }])
      if (url.includes("usda.gov")) {
        return Response.json([
          { Plant: { Symbol: "QURO2", ScientificName: "<i>Quercus robur</i> L.", Rank: "Species", AcceptedScientificName: null } },
        ])
      }
      if (url.includes("tela-botanica.org")) {
        return Response.json({
          entete: { total: "1" },
          resultat: {
            "75316": {
              nom_sci: "Quercus robur",
              nom_sci_complet: "Quercus robur L. [1753, Sp. Pl., 2 : 996]",
              retenu: "true",
              href: "https://api.tela-botanica.org/service:eflore:0.1/bdtfx/noms/75316",
            },
          },
        })
      }
      return new Response("blocked", { status: 403 })
    }, true)
    assert.equal(report.lines.length, 5)
    assert.equal(report.lines[0]?.state, "shown")
    assert.equal(report.lines[1]?.reason, "token")
    assert.equal(report.lines[2]?.state, "shown")
    assert.equal(report.lines[3]?.state, "shown")
    assert.equal(report.lines[4]?.reason, "no-response")
    assert.equal(report.lines.map((line) => lineText(line)).some((text) => text.length === 0), false)
  })
})
