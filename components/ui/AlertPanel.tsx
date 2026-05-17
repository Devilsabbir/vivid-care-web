import { type ReactNode } from 'react'

type AlertVariant = 'error' | 'warning' | 'info' | 'success'

/**
 * Inline alert panel — warm-toned palette aligned with StatusBadge +
 * design tokens. 12px radius, 32px icon square on the left, 14px title
 * with 13.5px slate-warm body. Use for form errors, schema notices, etc.
 */
const variantStyles: Record<
  AlertVariant,
  { bg: string; iconBg: string; iconColor: string; titleColor: string; bodyColor: string }
> = {
  error: {
    bg: '#FCE7E7',
    iconBg: '#F8C9C9',
    iconColor: '#DC2626',
    titleColor: '#991B1B',
    bodyColor: '#7B1818',
  },
  warning: {
    bg: '#FEF3D6',
    iconBg: '#F8E0A4',
    iconColor: '#D97706',
    titleColor: '#5C3A06',
    bodyColor: '#7C5614',
  },
  info: {
    bg: '#F4ECF8',
    iconBg: '#E6D4F0',
    iconColor: '#6B2C91',
    titleColor: '#54206F',
    bodyColor: '#3F1856',
  },
  success: {
    bg: '#F1F9E1',
    iconBg: '#D9EAB8',
    iconColor: '#5E8D1F',
    titleColor: '#5E8D1F',
    bodyColor: '#3F6014',
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
  const iconName =
    icon ??
    (variant === 'error'
      ? 'error'
      : variant === 'warning'
        ? 'warning'
        : variant === 'success'
          ? 'check_circle'
          : 'info')

  return (
    <div
      className={`flex gap-3 rounded-[12px] p-3.5 ${className}`}
      style={{ background: style.bg }}
      role="alert"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
        style={{ background: style.iconBg, color: style.iconColor }}
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{iconName}</span>
      </div>
      <div className="min-w-0 flex-1">
        {title && (
          <p className="text-[13.5px] font-semibold leading-tight" style={{ color: style.titleColor }}>
            {title}
          </p>
        )}
        {children && (
          <div
            className="mt-1 text-[12.5px] leading-[1.45]"
            style={{ color: style.bodyColor }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
