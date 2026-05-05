'use client'

export interface TabItem {
  key: string
  label: string
}

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
      className="flex flex-wrap gap-2 rounded-full bg-[#dfddd7] p-1.5 text-xs font-medium"
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map(item => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={active === item.key}
          tabIndex={active === item.key ? 0 : -1}
          onClick={() => onChange(item.key)}
          className={
            active === item.key
              ? 'rounded-full bg-[#1a1a18] px-4 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c852ff] focus-visible:ring-offset-2'
              : 'rounded-full px-4 py-2 text-[#6d6b64] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c852ff] focus-visible:ring-offset-2'
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
