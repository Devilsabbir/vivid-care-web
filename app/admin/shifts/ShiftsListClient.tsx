'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import StatusBadge from '@/components/ui/StatusBadge'
import DataTable, { type Column } from '@/components/ui/DataTable'

interface Shift {
  id: string
  start_time: string
  end_time: string
  status: string
  support_type: string | null
  staff_id: string | null
  client_id: string | null
  staff_name: string | null
  client_name: string | null
  client_address: string | null
  clock_in_time: string | null
  clock_out_time: string | null
}

interface StaffOption {
  id: string
  full_name: string
}

interface ClientOption {
  id: string
  full_name: string
}

export default function ShiftsListClient({
  shifts,
  staff,
  clients,
}: {
  shifts: Shift[]
  staff: StaffOption[]
  clients: ClientOption[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [staffFilter, setStaffFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')

  const filtered = useMemo(() => {
    return shifts.filter(shift => {
      if (statusFilter !== 'all' && shift.status !== statusFilter) return false
      if (staffFilter !== 'all' && shift.staff_id !== staffFilter) return false
      if (clientFilter !== 'all' && shift.client_id !== clientFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const haystack = `${shift.staff_name ?? ''} ${shift.client_name ?? ''} ${shift.support_type ?? ''} ${shift.client_address ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [shifts, search, statusFilter, staffFilter, clientFilter])

  const columns: Column<Shift>[] = [
    {
      key: 'date',
      label: 'Date / Time',
      render: (row) => {
        const start = new Date(row.start_time)
        const end = new Date(row.end_time)
        return (
          <div>
            <p className="font-medium text-[#0f172a]">{start.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
            <p className="text-[11px] text-[#64748b]">
              {start.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()} â€“ {end.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
            </p>
          </div>
        )
      },
    },
    {
      key: 'client_name',
      label: 'Client',
      render: (row) => <span className="font-medium text-[#0f172a]">{row.client_name ?? 'â€”'}</span>,
    },
    {
      key: 'staff_name',
      label: 'Staff',
      render: (row) => row.staff_name ?? <span className="text-[#94a3b8] italic">Unassigned</span>,
    },
    {
      key: 'support_type',
      label: 'Support type',
      render: (row) => row.support_type ?? 'â€”',
    },
    {
      key: 'clock',
      label: 'Clock',
      render: (row) => {
        if (row.clock_in_time && row.clock_out_time) return <StatusBadge status="completed" label="Complete" />
        if (row.clock_in_time) return <StatusBadge status="in_progress" label="Clocked in" />
        return <span className="text-[#94a3b8]">â€”</span>
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status as any} />,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#94a3b8]" aria-hidden="true">search</span>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shifts..."
            className="w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] py-2.5 pl-10 pr-4 text-sm text-[#0f172a] outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
            aria-label="Search shifts"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-2.5 text-sm text-[#64748b] outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={staffFilter}
          onChange={e => setStaffFilter(e.target.value)}
          className="rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-2.5 text-sm text-[#64748b] outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
          aria-label="Filter by staff"
        >
          <option value="all">All staff</option>
          {staff.map(s => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>

        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-2.5 text-sm text-[#64748b] outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
          aria-label="Filter by client"
        >
          <option value="all">All clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-xs text-[#64748b]">{filtered.length} shift{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Table */}
      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={row => row.id}
        onRowClick={row => router.push(`/admin/shifts/${row.id}`)}
        emptyIcon="event_busy"
        emptyTitle="No shifts match your filters"
        emptyDescription="Try adjusting the search or filter criteria."
      />
    </div>
  )
}
