"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { loadJournal } from "@/lib/journal"
import { cn } from "cn"

export function HomeScreen() {
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      try {
        setCount(loadJournal().length)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The journal could not be read.")
        setCount(0)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
      <div className="space-y-5">
        <p className="text-sm tracking-wide text-muted-foreground uppercase">Field worksheet</p>
        <h1 className="max-w-xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Name the plant in front of you.
        </h1>
        <p className="max-w-xl text-base leading-relaxed">
          A pocket sheet for leaves, bark, flowers and fruit. It works in a city park, a mangrove and a highland forest. It does not only cover Papua New Guinea or Taiwan.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/identify" className={cn(buttonVariants({ size: "lg" }), "h-11 px-4")}>
            Start a sheet
          </Link>
          <Link href="/journal" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-4")}>
            Open the journal
          </Link>
        </div>
        <ul className="max-w-xl space-y-2 text-sm">
          <li>Photograph it, or skip the photo and use the key.</li>
          <li>Mark only the characters you can actually see.</li>
          <li>A plate can trace habit, leaf, flower and a detail. It will not draw a view you did not photograph.</li>
          <li>Save a Darwin Core style record on this device.</li>
          <li>Once the worksheet is stored on this phone, the key, both plates and the journal work with no signal. The GBIF name check does not.</li>
        </ul>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Specimen label</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Locality: wherever you are standing.</p>
          <p>Name: a hypothesis, until someone checks it.</p>
          <p>
            Journal on this browser:{" "}
            {count === null ? "checking..." : error ? "unavailable" : count === 0 ? "empty" : `${count} saved`}
          </p>
          {error ? <p className="text-destructive">{error}</p> : null}
          <p>Do not eat a plant because this sheet named it. The sheet will not call a new species.</p>
          <Link href="/limits" className="underline underline-offset-4">
            Read the limits
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
