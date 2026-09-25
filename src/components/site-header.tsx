"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

const LINKS = [
  { href: "/identify", label: "Identify" },
  { href: "/journal", label: "Journal" },
  { href: "/limits", label: "Limits" },
]

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="border-b-[3px] border-double border-foreground bg-background">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-4xl flex-wrap items-end justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-8">
        <Link href="/" className="font-serif text-[1.65rem] leading-none tracking-tight text-foreground">
          Field Sheet
        </Link>
        <nav className="flex flex-wrap" aria-label="Main">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center px-2.5 text-sm underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active ? "font-medium underline decoration-2 decoration-foreground" : "hover:underline",
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
