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

  const journalLine =
    count === null
      ? "Reading the journal on this browser."
      : error
        ? "The journal cannot be read."
        : count === 0
          ? "No records on this browser."
          : `${count} records saved on this browser.`

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
      <div className="space-y-5">
        <p className="sheet-kicker">Place, organs, plate, name</p>
        <h1 className="max-w-md font-serif text-3xl leading-[1.08] tracking-tight sm:text-4xl">
          The specimen in view.
        </h1>
        <p className="max-w-lg text-base leading-relaxed">
          Record the locality. Mark only organs that are visible. The plate traces the photographs provided. The name is a field hypothesis.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/identify" className={cn(buttonVariants({ size: "lg" }), "h-11 px-4")}>
            Begin a sheet
          </Link>
          <Link href="/journal" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-4")}>
            Journal
          </Link>
        </div>
        <p className="max-w-lg border-t border-foreground/35 pt-3 text-sm leading-relaxed">
          Do not eat a plant on the basis of this name. The sheet will not declare a new species.
        </p>
      </div>
      <Card className="label-sheet rounded-none border-foreground shadow-none ring-0">
        <CardHeader className="border-b border-foreground/30 pb-3">
          <CardTitle className="sheet-kicker font-sans font-bold tracking-[0.16em]">Field Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <div>
              <dt className="sheet-kicker">Locality</dt>
              <dd className="mt-1">The collection locality.</dd>
            </div>
            <div>
              <dt className="sheet-kicker">Determination</dt>
              <dd className="mt-1">A field hypothesis. Confirm the binomial in POWO or WFO.</dd>
            </div>
            <div>
              <dt className="sheet-kicker">Journal</dt>
              <dd className="mt-1">{journalLine}</dd>
            </div>
          </dl>
          {error ? <p className="mt-3 text-destructive">{error}</p> : null}
          <p className="mt-4">
            <Link href="/limits" className="underline underline-offset-4">
              Read the limits
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
