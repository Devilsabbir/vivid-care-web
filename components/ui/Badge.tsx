import { getExpiryStatus, expiryLabel } from '@/lib/utils/expiry'

type BadgeVariant =
  | 'active'
  | 'near_expiry'
  | 'expired'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'open'
  | 'investigating'
  | 'resolved'
  | 'emergency'
  | 'high'
  | 'medium'
  | 'low'

// Mirrors StatusBadge token map so the two pill systems stay visually
// in sync. Brand 6-tone palette: green / blue / amber / danger / purple / slate.
const styles: Record<string, string> = {
  active:        'bg-[#F1F9E1] text-[#5E8D1F]',
  completed:     'bg-[#F1F9E1] text-[#5E8D1F]',
  resolved:      'bg-[#F4ECF8] text-[#54206F]',
  scheduled:     'bg-[#E6F5FC] text-[#1380AB]',
  near_expiry:   'bg-[#FEF3D6] text-[#5C3A06]',
  investigating: 'bg-[#FEF3D6] text-[#5C3A06]',
  medium:        'bg-[#FEF3D6] text-[#5C3A06]',
  expired:       'bg-[#FCE7E7] text-[#DC2626]',
  open:          'bg-[#FCE7E7] text-[#DC2626]',
  emergency:     'bg-[#FCE7E7] text-[#DC2626]',
  high:          'bg-[#FCE7E7] text-[#DC2626]',
  cancelled:     'bg-[#F1EEF4] text-[#3F3548]',
  low:           'bg-[#F1EEF4] text-[#3F3548]',
}

export function Badge({ variant, label }: { variant: BadgeVariant; label?: string }) {
  const display = label ?? variant.replace('_', ' ')
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-semibold uppercase ${styles[variant] ?? styles.active}`}
      style={{ letterSpacing: '0.04em' }}
    >
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
