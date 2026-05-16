type StatusVariant =
  | 'active' | 'scheduled' | 'completed' | 'cancelled' | 'missed' | 'in_progress' | 'unassigned'
  | 'open' | 'investigating' | 'under_review' | 'resolved' | 'closed'
  | 'emergency' | 'high' | 'medium' | 'low'
  | 'expired' | 'near_expiry' | 'verified' | 'pending'
  | 'draft' | 'sent' | 'signed'
  | 'paid' | 'overdue' | 'failed'
  | 'blocked' | 'at_risk' | 'ready'
  | 'inactive'

/**
 * Status pill tokens ported from the design handoff (.pill.* in admin-styles).
 * Tones:
 *  - green   (vc-green-50 / vc-green-700) for healthy / done states
 *  - blue    (vc-blue-50 / vc-blue-700) for in-flight or routed states
 *  - amber   (warning-bg / 5C3A06) for review-needed states
 *  - danger  (danger-bg / danger) for blocking / overdue states
 *  - purple  (vc-purple-50 / vc-purple-700) for branded "done" emphasis
 *  - slate   (slate-100 / slate-700) for neutral / closed states
 */
const variantStyles: Record<string, string> = {
  // ── Done / healthy ──
  active:    'bg-[#F1F9E1] text-[#5E8D1F]',
  completed: 'bg-[#F1F9E1] text-[#5E8D1F]',
  signed:    'bg-[#F1F9E1] text-[#5E8D1F]',
  verified:  'bg-[#F1F9E1] text-[#5E8D1F]',
  paid:      'bg-[#F1F9E1] text-[#5E8D1F]',
  ready:     'bg-[#F1F9E1] text-[#5E8D1F]',
  resolved:  'bg-[#F4ECF8] text-[#54206F]',

  // ── In-flight / routed ──
  scheduled:   'bg-[#E6F5FC] text-[#1380AB]',
  sent:        'bg-[#E6F5FC] text-[#1380AB]',
  in_progress: 'bg-[#F1F9E1] text-[#5E8D1F]',

  // ── Review needed ──
  investigating: 'bg-[#FEF3D6] text-[#5C3A06]',
  under_review:  'bg-[#FEF3D6] text-[#5C3A06]',
  near_expiry:   'bg-[#FEF3D6] text-[#5C3A06]',
  pending:       'bg-[#FEF3D6] text-[#5C3A06]',
  at_risk:       'bg-[#FEF3D6] text-[#5C3A06]',
  unassigned:    'bg-[#FEF3D6] text-[#5C3A06]',
  medium:        'bg-[#FEF3D6] text-[#5C3A06]',

  // ── Blocking / overdue ──
  missed:    'bg-[#FCE7E7] text-[#DC2626]',
  open:      'bg-[#FCE7E7] text-[#DC2626]',
  expired:   'bg-[#FCE7E7] text-[#DC2626]',
  high:      'bg-[#FCE7E7] text-[#DC2626]',
  emergency: 'bg-[#FCE7E7] text-[#DC2626]',
  overdue:   'bg-[#FCE7E7] text-[#DC2626]',
  failed:    'bg-[#FCE7E7] text-[#DC2626]',
  blocked:   'bg-[#FCE7E7] text-[#DC2626]',

  // ── Neutral / closed ──
  cancelled: 'bg-[#F1EEF4] text-[#3F3548]',
  closed:    'bg-[#F1EEF4] text-[#3F3548]',
  draft:     'bg-[#F1EEF4] text-[#3F3548]',
  inactive:  'bg-[#F1EEF4] text-[#3F3548]',
  low:       'bg-[#F1EEF4] text-[#3F3548]',
}

const labelMap: Record<string, string> = {
  in_progress: 'In progress',
  near_expiry: 'Expiring soon',
  under_review: 'Under review',
  at_risk: 'At risk',
}

export default function StatusBadge({
  status,
  label,
}: {
  status: StatusVariant
  label?: string
}) {
  const display = label ?? labelMap[status] ?? status.replace(/_/g, ' ')
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold uppercase ${variantStyles[status] ?? 'bg-[#F1EEF4] text-[#3F3548]'}`}
      style={{ letterSpacing: '0.04em' }}
      role="status"
    >
      {display}
    </span>
  )
}
