import Link from "next/link"

export default function NotFound() {
  return (
    <div className="space-y-3">
      <p className="sheet-kicker">Missing page</p>
      <h1 className="font-serif text-3xl leading-tight">This address is not a Field Sheet page</h1>
      <p className="text-sm">The address does not match a page in this worksheet.</p>
      <Link href="/" className="text-sm underline underline-offset-4">
        Return to the first page
      </Link>
    </div>
  )
}
