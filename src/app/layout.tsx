import { readFileSync } from "node:fs"
import path from "node:path"
import type { Metadata, Viewport } from "next"
import { Atkinson_Hyperlegible, Source_Serif_4 } from "next/font/google"
import Script from "next/script"
import { FieldCacheStatus } from "@/components/field-cache-status"
import { SiteHeader } from "@/components/site-header"
import "./globals.css"

const devOfflineHmr =
  process.env.NODE_ENV === "development"
    ? readFileSync(path.join(process.cwd(), "public/dev-offline-hmr.js"), "utf8")
    : ""

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-atkinson",
})

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
})

export const metadata: Metadata = {
  title: {
    default: "Field Sheet",
    template: "%s | Field Sheet",
  },
  description: "A pocket worksheet for identifying plants and trees anywhere.",
  applicationName: "Field Sheet",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Field Sheet",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  themeColor: "#efe6d2",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {devOfflineHmr ? (
          <Script id="field-dev-offline-hmr" strategy="beforeInteractive">
            {devOfflineHmr}
          </Script>
        ) : null}
        <SiteHeader />
        <main id="content" className="relative mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-[7px] w-px bg-foreground/25 sm:left-4"
          />
          {children}
        </main>
        <footer className="mx-auto w-full max-w-4xl border-t border-foreground/40 px-4 pt-4 pb-28 text-sm leading-relaxed sm:px-8">
          <FieldCacheStatus />
          Field hypotheses only. Check a name against POWO or WFO before you publish it.
        </footer>
      </body>
    </html>
  )
}
