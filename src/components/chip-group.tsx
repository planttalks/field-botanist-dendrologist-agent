"use client"

import { cn } from "cn"

export function ChipGroup({
  legend,
  hint,
  value,
  options,
  onChange,
  emphasized = false,
}: {
  legend: string
  hint?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  emphasized?: boolean
}) {
  return (
    <fieldset
      className={cn(
        "space-y-2",
        emphasized && "border border-foreground bg-card p-3",
      )}
    >
      <legend className="text-sm font-medium">{legend}</legend>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "min-h-11 rounded-sm border px-3 py-2 text-left text-sm focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
