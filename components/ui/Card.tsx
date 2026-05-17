import { type ReactNode } from 'react'

type CardVariant = 'default' | 'accent' | 'dark' | 'rail'

/**
 * Card primitive. Aligned with the design handoff's .adm-card recipe:
 * 16px radius, warm purple-tinted shadow, white background. The accent
 * variant uses the brand purple, and `dark` is reserved for high-contrast
 * callouts (e.g. side stat cards on the login brand panel).
 */
const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]',
  accent: 'bg-[#6B2C91] text-white shadow-[0_4px_14px_rgba(46,18,64,0.08),0_1px_3px_rgba(46,18,64,0.06)]',
  dark: 'bg-[#1A1320] text-white shadow-[0_8px_24px_rgba(20,12,32,0.18)]',
  rail: 'overflow-hidden bg-white shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]',
}

export function Card({
  variant = 'default',
  className = '',
  children,
}: {
  variant?: CardVariant
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`rounded-[16px] ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  )
}

export function CardBody({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

/** Side-rail card with a header + body split. */
export function RailCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card variant="rail">
      <div className="border-b border-[#F1EEF4] px-5 py-3.5">
        <h3 className="text-[14px] font-semibold leading-none text-[#1A1320]">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </Card>
  )
}
