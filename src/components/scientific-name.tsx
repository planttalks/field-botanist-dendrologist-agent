import { taxonById } from "@/lib/taxa"

export function ScientificName({
  name,
  taxonId,
  className,
}: {
  name: string | null
  taxonId?: string | null
  className?: string
}) {
  if (!name) return <span className={className}>Unidentified</span>
  const taxon = taxonId ? taxonById(taxonId) : undefined
  const binomial = taxon?.scientificName ?? name
  const aggregate = taxon?.nameKind === "aggregate"
  return (
    <span className={className}>
      <em lang="la">{binomial}</em>
      {aggregate ? " agg." : null}
    </span>
  )
}
