import Link from "next/link"

export default function NotFound() {
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-3xl">That page is not on the sheet</h1>
      <p className="text-sm">The address does not match a screen in this app.</p>
      <Link href="/" className="text-sm underline underline-offset-4">
        Back to the start
      </Link>
    </div>
  )
}
