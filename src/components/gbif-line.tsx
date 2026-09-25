"use client"

import { useEffect, useState } from "react"
import { lookupGbifName, type GbifOutcome } from "@/lib/gbif"
import type { NameKind } from "@/lib/taxa"

type View = GbifOutcome | { state: "loading" }

export function GbifLine({ name, nameKind }: { name: string; nameKind?: NameKind }) {
  const [view, setView] = useState<View>({ state: "loading" })

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    void lookupGbifName(name, nameKind, fetch, navigator.onLine, controller.signal).then((outcome) => {
      if (!cancelled) setView(outcome)
    })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [name, nameKind])

  switch (view.state) {
    case "loading":
      return <p className="text-sm text-muted-foreground">Checking this name on GBIF...</p>
    case "skipped":
      return <p className="text-sm">The name check did not run. The sheet name stays.</p>
    case "none":
      return <p className="text-sm">GBIF returned no match for this sheet name. The sheet name stays.</p>
    case "kept":
      return <p className="text-sm">{view.detail}</p>
    case "shown":
      return (
        <div className="space-y-1 text-sm">
          <p>
            GBIF accepted name <em lang="la" className="font-serif">{view.acceptedName}</em>
            {". "}
            Rank {view.rankLabel}. Status {view.statusLabel}.{" "}
            <a className="underline underline-offset-4" href={view.url}>
              Open the GBIF record
            </a>
            .
          </p>
          <p className="text-muted-foreground">{view.note}</p>
        </div>
      )
    default: {
      const exhaustive: never = view
      return exhaustive
    }
  }
}
