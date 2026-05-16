'use client'

export interface TabItem {
  key: string
  label: string
}

/**
 * Inline segmented tabs. Mirrors `.adm-tabs` from the design handoff:
 *  - slate-100 (#F1EEF4) track with 10px radius, 3px padding, 2px gap
 *  - buttons 6×12 padding, 8px radius, 12.5px / 500 slate-700 by default
 *  - active = white bg, slate-900 fg, 600 weight, subtle 1px shadow
 */
export default function Tabs({
  items,
  active,
  onChange,
  ariaLabel,
}: {
  items: TabItem[]
  active: string
  onChange: (key: string) => void
  ariaLabel?: string
}) {
  return (
    <div
      className="inline-flex flex-wrap gap-[2px] rounded-[10px] bg-[#F1EEF4] p-[3px]"
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map(item => {
        const isActive = active === item.key
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.key)}
            className={[
              'rounded-[8px] px-3 py-1.5 text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91] focus-visible:ring-offset-2',
              isActive
                ? 'bg-white font-semibold text-[#1A1320] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                : 'font-medium text-[#3F3548] hover:text-[#1A1320]',
            ].join(' ')}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
