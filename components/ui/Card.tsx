import { type ReactNode } from 'react'

type CardVariant = 'default' | 'accent' | 'dark' | 'rail'

const variantStyles: Record<CardVariant, string> = {
  default: 'border border-[#e6e8ec] bg-white shadow-[0_14px_32px_rgba(26,26,24,0.04)]',
  accent: 'bg-[#6B2C91] shadow-[0_14px_32px_rgba(26,26,24,0.04)]',
  dark: 'bg-[#0f172a] text-white shadow-[0_16px_40px_rgba(26,26,24,0.14)]',
  rail: 'border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)] overflow-hidden',
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
    <div className={`rounded-[24px] ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  )
}

export function CardBody({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

export function RailCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card variant="rail">
      <div className="border-b border-[#f0f1f3] px-4 py-3">
        <h3 className="text-sm font-semibold text-[#0f172a]">{title}</h3>
      </div>
      <div className="px-4 py-4">{children}</div>
    </Card>
  )
}
