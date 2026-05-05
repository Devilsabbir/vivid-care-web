import { getExpiryStatus } from '@/lib/utils/expiry'
import StatusBadge from '@/components/ui/StatusBadge'

type ReadinessLevel = 'ready' | 'at_risk' | 'blocked'

export default function ReadinessBadge({
  documents,
}: {
  documents: { expiry_date: string | null }[]
}) {
  const level = getReadinessLevel(documents)

  return <StatusBadge status={level} label={readinessLabel(level)} />
}

export function getReadinessLevel(
  documents: { expiry_date: string | null }[]
): ReadinessLevel {
  const hasExpired = documents.some(doc => getExpiryStatus(doc.expiry_date) === 'expired')
  if (hasExpired) return 'blocked'

  const hasExpiring = documents.some(doc => getExpiryStatus(doc.expiry_date) === 'near_expiry')
  if (hasExpiring) return 'at_risk'

  return 'ready'
}

function readinessLabel(level: ReadinessLevel): string {
  switch (level) {
    case 'blocked': return 'Blocked'
    case 'at_risk': return 'At risk'
    case 'ready': return 'Ready'
  }
}
