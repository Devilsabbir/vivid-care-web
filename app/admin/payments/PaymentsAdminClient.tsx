'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import MetricCard from '@/components/ui/MetricCard'
import StatusBadge from '@/components/ui/StatusBadge'
import DataTable, { type Column } from '@/components/ui/DataTable'

interface PaymentShift {
  id: string
  start_time: string
  end_time: string
  status: string
  support_type: string | null
  staff_id: string | null
  client_id: string | null
  staff_name: string | null
  client_name: string | null
  clock_in_time: string | null
  clock_out_time: string | null
}

export default function PaymentsAdminClient({ shifts }: { shifts: PaymentShift[] }) {
  const [search, setSearch] = useState('')
  const router = useRouter()

  const stats = useMemo(() => {
    let totalHours = 0
    let completedCount = 0
    let pendingCount = 0

    shifts.forEach(shift => {
      const start = shift.clock_in_time ? new Date(shift.clock_in_time) : new Date(shift.start_time)
      const end = shift.clock_out_time ? new Date(shift.clock_out_time) : new Date(shift.end_time)
      const hours = (end.getTime() - start.getTime()) / 3600000

      if (hours > 0) totalHours += hours
      if (shift.clock_out_time) completedCount++
      else pendingCount++
    })

    return { totalHours: totalHours.toFixed(1), completedCount, pendingCount }
  }, [shifts])

  const filtered = useMemo(() => {
    if (!search) return shifts
    const q = search.toLowerCase()
    return shifts.filter(s =>
      `${s.staff_name ?? ''} ${s.client_name ?? ''} ${s.support_type ?? ''}`.toLowerCase().includes(q)
    )
  }, [shifts, search])

  const columns: Column<PaymentShift>[] = [
    {
      key: 'client',
      label: 'Client',
      render: row => <span className="font-medium text-[#1a1a18]">{row.client_name ?? '—'}</span>,
    },
    {
      key: 'staff',
      label: 'Staff',
      render: row => row.staff_name ?? <span className="italic text-[#9b988f]">Unassigned</span>,
    },
    {
      key: 'service',
      label: 'Service',
      render: row => row.support_type ?? '—',
    },
    {
      key: 'hours',
      label: 'Hours',
      render: row => {
        const start = row.clock_in_time ? new Date(row.clock_in_time) : new Date(row.start_time)
        const end = row.clock_out_time ? new Date(row.clock_out_time) : new Date(row.end_time)
        const hours = ((end.getTime() - start.getTime()) / 3600000).toFixed(1)
        return `${hours}h`
      },
    },
    {
      key: 'date',
      label: 'Date',
      render: row => new Date(row.start_time).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    },
    {
      key: 'payment_status',
      label: 'Completion',
      render: row => {
        if (row.clock_out_time) return <StatusBadge status="completed" label="Clocked out" />
        return <StatusBadge status="pending" label="In progress" />
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total hours" value={stats.totalHours} sub="This period" />
        <MetricCard label="Completed" value={stats.completedCount} sub="Shifts with clock-out" />
        <MetricCard label="Pending" value={stats.pendingCount} sub="Awaiting completion" />
        <MetricCard label="Shifts" value={shifts.length} sub="Total in period" />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#9b988f]" aria-hidden="true">search</span>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by client, staff, or service..."
          className="w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] py-2.5 pl-10 pr-4 text-sm text-[#1a1a18] outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
          aria-label="Search payments"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={row => row.id}
        onRowClick={row => router.push(`/admin/shifts/${row.id}`)}
        emptyIcon="payments"
        emptyTitle="No payment records"
        emptyDescription="Completed and in-progress shifts will appear here."
      />

      {/* Payroll not enabled notice */}
      <div className="rounded-[22px] border border-[#e8e4dc] bg-white p-6 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4f2ed]">
            <span className="material-symbols-outlined text-[20px] text-[#6f6b63]" aria-hidden="true">account_balance_wallet</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1a1a18]">Payroll processing is not enabled</h3>
            <p className="mt-1 text-sm text-[#6c6b66]">
              This page shows a read-only summary of shift hours and clock activity. Invoice generation, NDIS claiming, and payment processing require a payroll integration that has not been configured for this organisation.
            </p>
            <p className="mt-2 text-xs text-[#9b988f]">Contact your system administrator to enable payroll features.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
