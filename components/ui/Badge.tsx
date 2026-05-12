import { getExpiryStatus, expiryLabel } from '@/lib/utils/expiry'

type BadgeVariant = 'active' | 'near_expiry' | 'expired' | 'scheduled' | 'completed' | 'cancelled' | 'open' | 'investigating' | 'resolved' | 'emergency' | 'high' | 'medium' | 'low'

const styles: Record<string, string> = {
  active: 'bg-[#F4ECF8] text-[#54206F]',
  scheduled: 'bg-[#dbeafe] text-[#1d4ed8]',
  near_expiry: 'bg-[#fef9c3] text-[#92400e]',
  expired: 'bg-[#fee2e2] text-[#991b1b]',
  completed: 'bg-[#F4ECF8] text-[#54206F]',
  cancelled: 'bg-[#f3f4f6] text-[#6b7280]',
  open: 'bg-[#fee2e2] text-[#991b1b]',
  investigating: 'bg-[#fef9c3] text-[#92400e]',
  resolved: 'bg-[#F4ECF8] text-[#54206F]',
  emergency: 'bg-[#fee2e2] text-[#991b1b]',
  high: 'bg-[#fee2e2] text-[#991b1b]',
  medium: 'bg-[#fef9c3] text-[#92400e]',
  low: 'bg-[#F4ECF8] text-[#54206F]',
}

export function Badge({ variant, label }: { variant: BadgeVariant; label?: string }) {
  const display = label ?? variant.replace('_', ' ')
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.12em] ${styles[variant] ?? styles.active}`}>
      {display}
    </span>
  )
}

export function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  const status = getExpiryStatus(expiryDate)
  const label = expiryLabel(expiryDate)
  if (status === 'none') return null
  return <Badge variant={status as BadgeVariant} label={label} />
}
