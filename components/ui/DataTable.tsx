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

/**
 * Standard admin data table. Chrome aligned with the design's
 * .adm-table treatment — warm-tinted header row, slate-700 cells,
 * hover-row highlight, 16px-radius card surround.
 */
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
    <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#F1EEF4] bg-[#F8F6FA]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={[
                    'px-4 py-3 text-[11px] font-semibold uppercase text-[#6B6371]',
                    col.srOnly ? 'sr-only' : '',
                    col.className ?? '',
                  ].join(' ')}
                  style={{ letterSpacing: '0.06em' }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1EEF4]">
            {rows.map((row) => {
              const key = getRowKey(row)
              const isClickable = Boolean(onRowClick)
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={
                    isClickable
                      ? 'cursor-pointer transition-colors hover:bg-[#F8F6FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6B2C91]'
                      : ''
                  }
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
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-[13.5px] text-[#3F3548] ${col.className ?? ''}`}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
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
