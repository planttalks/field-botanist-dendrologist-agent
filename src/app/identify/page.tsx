import type { Metadata } from "next"
import { IdentifyFlow } from "@/components/identify-flow"

export const metadata: Metadata = {
  title: "Identify",
  description: "Walk a plant from place and photo to a field name.",
}

export default function IdentifyPage() {
  return <IdentifyFlow />
}
