import type { Metadata } from "next"
import { HomeScreen } from "@/components/home-screen"

export const metadata: Metadata = {
  title: "Field Sheet",
  description: "A pocket worksheet for identifying plants and trees anywhere.",
}

export default function HomePage() {
  return <HomeScreen />
}
