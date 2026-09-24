import { readFileSync } from "node:fs"
import path from "node:path"
import type { Metadata, Viewport } from "next"
import { Figtree, Fraunces } from "next/font/google"
import Script from "next/script"
import { FieldCacheStatus } from "@/components/field-cache-status"
import { SiteHeader } from "@/components/site-header"
import "./globals.css"

const devOfflineHmr =
  process.env.NODE_ENV === "development"
    ? readFileSync(path.join(process.cwd(), "public/dev-offline-hmr.js"), "utf8")
    : ""

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
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
  themeColor: "#234237",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {devOfflineHmr ? (
          <Script id="field-dev-offline-hmr" strategy="beforeInteractive">
            {devOfflineHmr}
          </Script>
        ) : null}
        <SiteHeader />
        <main id="content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-5xl px-4 pt-4 pb-24 text-sm text-muted-foreground">
          <FieldCacheStatus />
          Field hypotheses only. Check a name against POWO or WFO before you publish it.
        </footer>
      </body>
    </html>
  )
}
