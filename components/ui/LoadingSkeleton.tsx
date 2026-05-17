/**
 * Loading-state skeletons. Tokens aligned with the rest of the admin UI:
 *  - 16px radius card chrome with warm purple-tinted shadow
 *  - F1EEF4 placeholder bars (warm slate-100)
 *  - F8F6FA row separators
 */

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[16px] bg-white p-5 shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)] ${className}`}
    >
      <div className="h-3 w-24 rounded bg-[#F1EEF4]" />
      <div className="mt-3 h-8 w-16 rounded bg-[#F1EEF4]" />
      <div className="mt-3 h-3 w-32 rounded bg-[#F1EEF4]" />
    </div>
  )
}

export function SkeletonRow({ columns = 4, className = '' }: { columns?: number; className?: string }) {
  return (
    <div
      className={`flex animate-pulse items-center gap-4 rounded-[12px] bg-white px-4 py-4 shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)] ${className}`}
    >
      {Array.from({ length: columns }, (_, i) => (
        <div key={i} className="h-3 flex-1 rounded bg-[#F1EEF4]" />
      ))}
    </div>
  )
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-[#F1EEF4]"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="animate-pulse overflow-hidden rounded-[16px] bg-white shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]">
      <div className="flex gap-4 border-b border-[#F1EEF4] bg-[#F8F6FA] px-4 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} className="h-3 flex-1 rounded bg-[#E5E1E8]" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 border-b border-[#F1EEF4] px-4 py-4 last:border-0">
          {Array.from({ length: columns }, (_, j) => (
            <div key={j} className="h-3 flex-1 rounded bg-[#F1EEF4]" />
          ))}
        </div>
      ))}
    </div>
  )
}
