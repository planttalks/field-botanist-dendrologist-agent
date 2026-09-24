"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

const LINKS = [
  { href: "/identify", label: "Identify" },
  { href: "/journal", label: "Journal" },
  { href: "/limits", label: "Limits" },
]

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-card/80">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="font-serif text-xl tracking-tight text-foreground">
          Field Sheet
        </Link>
        <nav className="flex flex-wrap gap-1" aria-label="Main">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(buttonVariants({ variant: active ? "secondary" : "ghost", size: "lg" }), "h-11 px-3")}
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
