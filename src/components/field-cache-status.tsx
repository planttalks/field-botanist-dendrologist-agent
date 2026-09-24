"use client"

import { useEffect, useState } from "react"
import { prepareWorksheetCopy, worksheetCopyMessage, type WorksheetCopyState } from "@/lib/field-cache"

export function FieldCacheStatus() {
  const [state, setState] = useState<WorksheetCopyState>("checking")

  useEffect(() => {
    let cancelled = false
    void prepareWorksheetCopy().then((stored) => {
      if (!cancelled) setState(stored ? "stored" : "failed")
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <p id="field-cache-status" className="mb-2" role="status">
      {worksheetCopyMessage(state)}
    </p>
  )
}
