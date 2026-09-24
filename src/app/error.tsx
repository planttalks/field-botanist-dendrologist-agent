"use client"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-3xl">The sheet hit a snag</h1>
      <p className="max-w-lg text-sm">{error.message || "Something failed while rendering this page."}</p>
      <button
        type="button"
        onClick={reset}
        className="h-11 rounded-lg bg-primary px-4 text-sm text-primary-foreground"
      >
        Try again
      </button>
    </div>
  )
}
