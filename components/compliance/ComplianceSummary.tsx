import { getExpiryStatus } from '@/lib/utils/expiry'
import MetricCard from '@/components/ui/MetricCard'

export default function ComplianceSummary({
  documents,
}: {
  documents: { expiry_date: string | null }[]
}) {
  const counts = documents.reduce(
    (acc, doc) => {
      const status = getExpiryStatus(doc.expiry_date)
      if (status === 'expired') acc.expired++
      else if (status === 'near_expiry') acc.expiring++
      else acc.valid++
      return acc
    },
    { valid: 0, expiring: 0, expired: 0 }
  )

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard label="Valid" value={counts.valid} sub="Documents current" />
      <MetricCard
        label="Expiring soon"
        value={counts.expiring}
        sub="Within 45 days"
        accent={counts.expiring > 0}
      />
      <MetricCard
        label="Expired"
        value={counts.expired}
        sub="Require renewal"
        accent={counts.expired > 0}
      />
    </div>
  )
}
