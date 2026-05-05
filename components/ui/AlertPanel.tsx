import { type ReactNode } from 'react'

type AlertVariant = 'error' | 'warning' | 'info' | 'success'

const variantStyles: Record<AlertVariant, { bg: string; border: string; icon: string; iconColor: string; titleColor: string }> = {
  error: {
    bg: 'bg-[#fef2f2]',
    border: 'border-[#fecaca]',
    icon: 'error',
    iconColor: 'text-[#991b1b]',
    titleColor: 'text-[#991b1b]',
  },
  warning: {
    bg: 'bg-[#fefce8]',
    border: 'border-[#fef08a]',
    icon: 'warning',
    iconColor: 'text-[#92400e]',
    titleColor: 'text-[#92400e]',
  },
  info: {
    bg: 'bg-[#eff6ff]',
    border: 'border-[#bfdbfe]',
    icon: 'info',
    iconColor: 'text-[#1d4ed8]',
    titleColor: 'text-[#1d4ed8]',
  },
  success: {
    bg: 'bg-[#f0fdf4]',
    border: 'border-[#bbf7d0]',
    icon: 'check_circle',
    iconColor: 'text-[#166534]',
    titleColor: 'text-[#166534]',
  },
}

export default function AlertPanel({
  variant,
  title,
  icon,
  children,
  className = '',
}: {
  variant: AlertVariant
  title?: string
  icon?: string
  children?: ReactNode
  className?: string
}) {
  const style = variantStyles[variant]

  return (
    <div
      className={`flex gap-3 rounded-[18px] border ${style.border} ${style.bg} p-4 ${className}`}
      role="alert"
    >
      <span className={`material-symbols-outlined mt-0.5 text-[20px] ${style.iconColor}`} aria-hidden="true">
        {icon ?? style.icon}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className={`text-sm font-semibold ${style.titleColor}`}>{title}</p>}
        {children && <div className="mt-1 text-xs leading-5 text-[#4f4c45]">{children}</div>}
      </div>
    </div>
  )
}
