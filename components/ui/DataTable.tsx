import { type ReactNode } from 'react'
import EmptyState from './EmptyState'

export interface Column<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
  className?: string
  srOnly?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptyIcon?: string
  emptyTitle?: string
  emptyDescription?: string
}

export default function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptyIcon = 'inbox',
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items to display.',
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_14px_32px_rgba(26,26,24,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#f0ece5]">
              {columns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9b988f] ${col.srOnly ? 'sr-only' : ''} ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f5f3ee]">
            {rows.map(row => {
              const key = getRowKey(row)
              const isClickable = Boolean(onRowClick)
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`${isClickable ? 'cursor-pointer hover:bg-[#faf9f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c852ff]' : ''}`}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={
                    isClickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onRowClick!(row)
                          }
                        }
                      : undefined
                  }
                  role={isClickable ? 'button' : undefined}
                >
                  {columns.map(col => (
                    <td key={col.key} className={`px-4 py-3 text-[#4f4c45] ${col.className ?? ''}`}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
