import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'

interface ShiftCardProps {
  shift: {
    id: string
    start_time: string
    end_time: string
    status: string
    staff_name?: string | null
    client_name?: string | null
    support_type?: string | null
    location?: string | null
  }
  href?: string
  compact?: boolean
}

export default function ShiftCard({ shift, href, compact }: ShiftCardProps) {
  const startDate = new Date(shift.start_time)
  const endDate = new Date(shift.end_time)
  const dateStr = startDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  const startStr = startDate.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  const endStr = endDate.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()

  const content = (
    <div className={`flex flex-col gap-2 ${compact ? '' : 'md:flex-row md:items-center'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {shift.client_name && (
            <h4 className="text-sm font-semibold text-[#0f172a] truncate">{shift.client_name}</h4>
          )}
          {shift.support_type && (
            <span className="hidden shrink-0 rounded-full bg-[#f7f8f9] px-2 py-0.5 text-[10px] font-medium text-[#64748b] md:inline-flex">
              {shift.support_type}
            </span>
          )}
        </div>
        <p className="text-[12px] text-[#7d7a73]">
          {dateStr} Â· {startStr} â€“ {endStr}
          {shift.staff_name && ` Â· ${shift.staff_name}`}
        </p>
        {!compact && shift.location && (
          <p className="mt-0.5 text-[11px] text-[#94a3b8] truncate">{shift.location}</p>
        )}
      </div>
      <div className="shrink-0">
        <StatusBadge status={shift.status as any} />
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-[22px] border border-[#e6e8ec] bg-white p-4 shadow-[0_12px_28px_rgba(26,26,24,0.04)] transition-colors hover:bg-[#fafbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
      >
        {content}
      </Link>
    )
  }

  return (
    <article className="rounded-[22px] border border-[#e6e8ec] bg-white p-4 shadow-[0_12px_28px_rgba(26,26,24,0.04)]">
      {content}
    </article>
  )
}
