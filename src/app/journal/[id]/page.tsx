import type { Metadata } from "next"
import { RecordView } from "@/components/record-view"

export const metadata: Metadata = {
  title: "Record",
}

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RecordView id={id} />
}
