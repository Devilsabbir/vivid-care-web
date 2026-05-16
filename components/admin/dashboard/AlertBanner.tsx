import Link from 'next/link'

interface AlertBannerProps {
  clientName: string
  reportedAt: string
  severity: string
  deadline: string
  href: string
}

/**
 * Amber alert banner — surfaces an urgent open incident at the top of the
 * dashboard so admins act before NDIS reporting deadlines.
 *
 * Mirrors the design's `.adm-alert`:
 *  - linear-gradient(90deg, rgba(217,119,6,0.08) → 0.02) background
 *  - 1px rgba(217,119,6,0.25) border, 12px radius
 *  - 32px warning-bg icon square
 *  - body 13px slate-700, bolded client name
 *  - pill action button on the right
 */
export default function AlertBanner({ clientName, reportedAt, severity, deadline, href }: AlertBannerProps) {
  const reported = new Date(reportedAt).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
  return (
    <div
      className="mb-[18px] flex flex-col items-start gap-3 rounded-[12px] px-4 py-3 md:flex-row md:items-center"
      style={{
        background: 'linear-gradient(90deg, rgba(217,119,6,0.08) 0%, rgba(217,119,6,0.02) 100%)',
        border: '1px solid rgba(217,119,6,0.25)',
      }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#FEF3D6] text-[#D97706]">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">warning</span>
      </div>
      <div className="min-w-0 flex-1 text-[13px] leading-[1.4] text-[#3F3548]">
        <strong className="font-semibold text-[#1A1320]">{clientName}</strong> — incident filed {reported} ({severity}).
        Awaiting your review before NDIS reporting window closes <strong className="font-semibold text-[#1A1320]">{deadline}</strong>.
      </div>
      <Link
        href={href}
        className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-[9px] border border-[#E5E1E8] bg-white px-3 text-[12.5px] font-medium text-[#3F3548] hover:bg-[#F8F6FA]"
      >
        Review now
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
      </Link>
    </div>
  )
}
