import type { Metadata } from "next"
import { JournalBrowser } from "@/components/journal-browser"

export const metadata: Metadata = {
  title: "Journal",
  description: "Specimen records stored in this browser.",
}

export default function JournalPage() {
  return <JournalBrowser />
}
