type StatusVariant =
  | 'active' | 'scheduled' | 'completed' | 'cancelled' | 'missed' | 'in_progress' | 'unassigned'
  | 'open' | 'investigating' | 'under_review' | 'resolved' | 'closed'
  | 'emergency' | 'high' | 'medium' | 'low'
  | 'expired' | 'near_expiry' | 'verified' | 'pending'
  | 'draft' | 'sent' | 'signed'
  | 'paid' | 'overdue' | 'failed'
  | 'blocked' | 'at_risk' | 'ready'
  | 'inactive'

const variantStyles: Record<string, string> = {
  active: 'bg-[#dcfce7] text-[#166534]',
  scheduled: 'bg-[#dbeafe] text-[#1d4ed8]',
  completed: 'bg-[#f3e8ff] text-[#6b21a8]',
  cancelled: 'bg-[#f3f4f6] text-[#6b7280]',
  missed: 'bg-[#fee2e2] text-[#991b1b]',
  in_progress: 'bg-[#fef9c3] text-[#92400e]',
  unassigned: 'bg-[#fef9c3] text-[#92400e]',

  open: 'bg-[#fee2e2] text-[#991b1b]',
  investigating: 'bg-[#fef9c3] text-[#92400e]',
  under_review: 'bg-[#fef9c3] text-[#92400e]',
  resolved: 'bg-[#f3e8ff] text-[#6b21a8]',
  closed: 'bg-[#f3f4f6] text-[#6b7280]',

  emergency: 'bg-[#fee2e2] text-[#991b1b]',
  high: 'bg-[#fee2e2] text-[#991b1b]',
  medium: 'bg-[#fef9c3] text-[#92400e]',
  low: 'bg-[#f3e8ff] text-[#6b21a8]',

  expired: 'bg-[#fee2e2] text-[#991b1b]',
  near_expiry: 'bg-[#fef9c3] text-[#92400e]',
  verified: 'bg-[#dcfce7] text-[#166534]',
  pending: 'bg-[#fef9c3] text-[#92400e]',

  draft: 'bg-[#f3f4f6] text-[#6b7280]',
  sent: 'bg-[#dbeafe] text-[#1d4ed8]',
  signed: 'bg-[#dcfce7] text-[#166534]',

  paid: 'bg-[#dcfce7] text-[#166534]',
  overdue: 'bg-[#fee2e2] text-[#991b1b]',
  failed: 'bg-[#fee2e2] text-[#991b1b]',

  blocked: 'bg-[#fee2e2] text-[#991b1b]',
  at_risk: 'bg-[#fef9c3] text-[#92400e]',
  ready: 'bg-[#dcfce7] text-[#166534]',

  inactive: 'bg-[#f3f4f6] text-[#6b7280]',
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${variantStyles[status] ?? 'bg-[#f3f4f6] text-[#6b7280]'}`}
      role="status"
    >
      {display}
    </span>
  )
}
