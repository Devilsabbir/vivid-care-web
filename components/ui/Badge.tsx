import { getExpiryStatus, expiryLabel } from '@/lib/utils/expiry'

type BadgeVariant = 'active' | 'near_expiry' | 'expired' | 'scheduled' | 'completed' | 'cancelled' | 'open' | 'investigating' | 'resolved' | 'emergency' | 'high' | 'medium' | 'low'

const styles: Record<string, string> = {
  active: 'bg-secondary-container/40 text-secondary',
  scheduled: 'bg-primary-fixed/60 text-primary',
  near_expiry: 'bg-tertiary-container/30 text-tertiary',
  expired: 'bg-error-container text-error',
  completed: 'bg-secondary-container/40 text-secondary',
  cancelled: 'bg-surface-container-highest text-outline',
  open: 'bg-error-container text-error',
  investigating: 'bg-tertiary-fixed/60 text-tertiary',
  resolved: 'bg-secondary-container/40 text-secondary',
  emergency: 'bg-error-container text-error',
  high: 'bg-error-container/70 text-on-error-container',
  medium: 'bg-tertiary-fixed/60 text-tertiary',
  low: 'bg-secondary-container/40 text-secondary',
}

export function Badge({ variant, label }: { variant: BadgeVariant; label?: string }) {
  const display = label ?? variant.replace('_', ' ')
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black font-label uppercase tracking-wide ${styles[variant] ?? styles.active}`}>
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
