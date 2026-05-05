export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-[24px] border border-[#e8e4dc] bg-white p-5 ${className}`}>
      <div className="h-3 w-24 rounded bg-[#e8e4dc]" />
      <div className="mt-3 h-8 w-16 rounded bg-[#e8e4dc]" />
      <div className="mt-3 h-3 w-32 rounded bg-[#e8e4dc]" />
    </div>
  )
}

export function SkeletonRow({ columns = 4, className = '' }: { columns?: number; className?: string }) {
  return (
    <div className={`animate-pulse flex items-center gap-4 rounded-[18px] bg-white px-4 py-4 ${className}`}>
      {Array.from({ length: columns }, (_, i) => (
        <div key={i} className="h-3 flex-1 rounded bg-[#e8e4dc]" />
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
          className="h-3 rounded bg-[#e8e4dc]"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="animate-pulse overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white">
      <div className="flex gap-4 border-b border-[#f0ece5] px-4 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} className="h-3 flex-1 rounded bg-[#e8e4dc]" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 border-b border-[#f5f3ee] px-4 py-4 last:border-0">
          {Array.from({ length: columns }, (_, j) => (
            <div key={j} className="h-3 flex-1 rounded bg-[#e8e4dc]" />
          ))}
        </div>
      ))}
    </div>
  )
}
