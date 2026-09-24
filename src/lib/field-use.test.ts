import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { documentIsWorksheet, worksheetCopyMessage } from "./field-cache"
import { missingPointCopy } from "./geo"

describe("field copy", () => {
  it("does not describe a failed cache as a saved record", () => {
    const failed = worksheetCopyMessage("failed")
    assert.match(failed, /No record was written/)
    assert.equal(failed.toLowerCase().includes("saved"), false)
    const checking = worksheetCopyMessage("checking")
    assert.match(checking, /not a specimen/)
  })

  it("rejects the offline miss page as a worksheet document", () => {
    const miss = readFileSync(new URL("../../public/offline.html", import.meta.url), "utf8")
    assert.equal(documentIsWorksheet(miss, "text/html"), false)
    assert.equal(
      documentIsWorksheet("<html><body><h1>Field Sheet</h1></body></html>", "text/html"),
      true,
    )
    assert.equal(documentIsWorksheet("<html></html>", "application/json"), false)
  })

  it("keeps the dev debug replay out of the journal", () => {
    const script = readFileSync(new URL("../../public/dev-offline-hmr.js", import.meta.url), "utf8")
    assert.match(script, /cache-storage/)
    assert.match(script, /\/_next\/hmr/)
    assert.equal(script.includes("field-sheet.v1"), false)
    assert.match(script, /not a specimen/)
  })

  it("says the point is missing without coordinates or a meter error", () => {
    for (const code of [1, 2, 3]) {
      const copy = missingPointCopy(code)
      assert.equal(copy.title, "The point is missing")
      assert.equal(/\d/.test(copy.detail), false)
      assert.equal(copy.detail.toLowerCase().includes("meter"), false)
      assert.equal(copy.detail.includes("WGS"), false)
    }
    assert.match(missingPointCopy(1).detail, /denied/)
    assert.match(missingPointCopy(3).detail, /timed out/)
  })
})
