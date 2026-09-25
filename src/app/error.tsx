"use client"

import { Button } from "@/components/ui/button"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="space-y-3">
      <p className="sheet-kicker">Error</p>
      <h1 className="font-serif text-3xl leading-tight">This page did not render</h1>
      <p className="max-w-lg text-sm leading-relaxed">{error.message || "The page failed while rendering."}</p>
      <Button type="button" className="h-11" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
