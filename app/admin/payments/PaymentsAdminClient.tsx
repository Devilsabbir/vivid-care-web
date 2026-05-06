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
      label: 'Status',
      render: row => {
        // TODO: Replace with real payment status from a payments table when available
        if (row.clock_out_time) return <StatusBadge status="completed" label="Billable" />
        return <StatusBadge status="pending" label="Pending" />
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
        emptyDescription="Completed shifts will appear here for billing."
      />

      {/* TODO notice */}
      <p className="rounded-[18px] bg-[#fef9c3] px-4 py-3 text-xs text-[#92400e]">
        <span className="material-symbols-outlined mr-1 text-[14px] align-middle" aria-hidden="true">info</span>
        Payment processing integration is pending. This view currently shows shift-based billing data only.
      </p>
    </div>
  )
}
