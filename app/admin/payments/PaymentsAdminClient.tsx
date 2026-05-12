'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MetricCard from '@/components/ui/MetricCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { createClient } from '@/lib/supabase/client'

interface PaymentShift {
  id: string
  start_time: string
  end_time: string
  status: string
  support_type: string | null
  staff_id: string | null
  client_id: string | null
  staff_name: string | null
  hourly_rate: number
  client_name: string | null
  clock_in_time: string | null
  clock_out_time: string | null
  payment_status: 'pending' | 'paid'
  paid_at: string | null
}

type FilterKey = 'outstanding' | 'paid' | 'all'

function calcHours(shift: PaymentShift): number {
  if (!shift.clock_in_time || !shift.clock_out_time) return 0
  const start = new Date(shift.clock_in_time).getTime()
  const end = new Date(shift.clock_out_time).getTime()
  const hours = (end - start) / 3600000
  return hours > 0 ? hours : 0
}

function fmtMoney(value: number): string {
  return `$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PaymentsAdminClient({ shifts }: { shifts: PaymentShift[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('outstanding')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Augment each shift with calculated hours and amount
  const enriched = useMemo(() => {
    return shifts.map(s => {
      const hours = calcHours(s)
      const amount = hours * s.hourly_rate
      return { ...s, hours, amount }
    })
  }, [shifts])

  const stats = useMemo(() => {
    let outstandingAmount = 0
    let paidAmount = 0
    let outstandingHours = 0
    let paidHours = 0
    const staffWithRate = new Set<string>()

    enriched.forEach(s => {
      if (s.staff_id && s.hourly_rate > 0) staffWithRate.add(s.staff_id)
      if (s.payment_status === 'paid') {
        paidAmount += s.amount
        paidHours += s.hours
      } else if (s.clock_out_time) {
        outstandingAmount += s.amount
        outstandingHours += s.hours
      }
    })
    return { outstandingAmount, paidAmount, outstandingHours, paidHours, staffWithRateCount: staffWithRate.size }
  }, [enriched])

  // Group by staff for the summary by-staff table
  const byStaff = useMemo(() => {
    const map = new Map<string, {
      staff_id: string
      staff_name: string
      hourly_rate: number
      outstandingHours: number
      outstandingAmount: number
      paidHours: number
      paidAmount: number
      shiftCount: number
    }>()

    enriched.forEach(s => {
      if (!s.staff_id) return
      const existing = map.get(s.staff_id) ?? {
        staff_id: s.staff_id,
        staff_name: s.staff_name ?? 'Unnamed staff',
        hourly_rate: s.hourly_rate,
        outstandingHours: 0,
        outstandingAmount: 0,
        paidHours: 0,
        paidAmount: 0,
        shiftCount: 0,
      }
      existing.shiftCount += 1
      if (s.payment_status === 'paid') {
        existing.paidHours += s.hours
        existing.paidAmount += s.amount
      } else if (s.clock_out_time) {
        existing.outstandingHours += s.hours
        existing.outstandingAmount += s.amount
      }
      map.set(s.staff_id, existing)
    })

    return Array.from(map.values()).sort((a, b) => b.outstandingAmount - a.outstandingAmount)
  }, [enriched])

  const filteredShifts = useMemo(() => {
    return enriched.filter(s => {
      // Filter chip
      if (filter === 'outstanding' && s.payment_status !== 'pending') return false
      if (filter === 'paid' && s.payment_status !== 'paid') return false
      // Only include shifts that have actually been clocked in/out
      if (filter !== 'all' && !s.clock_out_time) return false
      // Search
      if (search) {
        const q = search.toLowerCase()
        const haystack = `${s.staff_name ?? ''} ${s.client_name ?? ''} ${s.support_type ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [enriched, filter, search])

  async function markPaid(shiftId: string, nextStatus: 'pending' | 'paid') {
    setBusyId(shiftId)
    setMessage(null)
    const update = nextStatus === 'paid'
      ? { payment_status: 'paid', paid_at: new Date().toISOString() }
      : { payment_status: 'pending', paid_at: null }
    const { error } = await supabase.from('shifts').update(update).eq('id', shiftId)
    setBusyId(null)
    if (error) {
      console.error('[PaymentsAdminClient] payment_status update failed:', error)
      setMessage('Failed to update payment status: ' + error.message)
      return
    }
    setMessage(nextStatus === 'paid' ? 'Marked as paid.' : 'Reverted to pending.')
    router.refresh()
  }

  async function markStaffAllPaid(staffId: string) {
    if (!confirm('Mark all outstanding shifts for this staff member as paid?')) return
    setBusyId(`staff:${staffId}`)
    setMessage(null)
    const { error } = await supabase
      .from('shifts')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('staff_id', staffId)
      .eq('payment_status', 'pending')
      .not('clock_out_time', 'is', null)
    setBusyId(null)
    if (error) {
      console.error('[PaymentsAdminClient] bulk mark-paid failed:', error)
      setMessage('Bulk mark-paid failed: ' + error.message)
      return
    }
    setMessage('Bulk payment recorded.')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Outstanding" value={fmtMoney(stats.outstandingAmount)} sub={`${stats.outstandingHours.toFixed(1)} hours pending`} accent />
        <MetricCard label="Paid" value={fmtMoney(stats.paidAmount)} sub={`${stats.paidHours.toFixed(1)} hours settled`} />
        <MetricCard label="Staff with rate" value={String(stats.staffWithRateCount)} sub="Eligible for billing" />
        <MetricCard label="Shifts tracked" value={String(shifts.length)} sub="Across recent period" />
      </div>

      {message && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${
          message.startsWith('Failed') || message.startsWith('Bulk mark-paid failed')
            ? 'bg-[#fee2e2] text-[#991b1b]'
            : 'bg-[#f0fdfa] text-[#0f766e]'
        }`}>
          {message}
        </div>
      )}

      {/* By-staff summary table */}
      <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_14px_32px_rgba(26,26,24,0.04)]">
        <div className="border-b border-[#f0f1f3] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#0f172a]">Summary by staff member</h3>
          <p className="text-xs text-[#64748b]">Outstanding amounts are calculated from clocked-in/out times × hourly rate.</p>
        </div>
        {byStaff.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[#64748b]">No staff have completed shifts in this period yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">
                  <th className="px-5 py-3 font-medium">Staff</th>
                  <th className="px-5 py-3 font-medium">Rate</th>
                  <th className="px-5 py-3 font-medium">Outstanding</th>
                  <th className="px-5 py-3 font-medium">Paid</th>
                  <th className="px-5 py-3 font-medium">Shifts</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {byStaff.map(row => (
                  <tr key={row.staff_id} className="border-t border-[#f0f1f3] text-sm text-[#0f172a]">
                    <td className="px-5 py-3">
                      <Link href={`/admin/staff/${row.staff_id}`} className="font-medium hover:underline">
                        {row.staff_name}
                      </Link>
                      {row.hourly_rate === 0 && (
                        <p className="mt-1 text-[11px] text-[#dc2626]">No hourly rate set</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#64748b]">{fmtMoney(row.hourly_rate)}/hr</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-[#0f172a]">{fmtMoney(row.outstandingAmount)}</p>
                      <p className="text-[11px] text-[#94a3b8]">{row.outstandingHours.toFixed(1)}h</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[#64748b]">{fmtMoney(row.paidAmount)}</p>
                      <p className="text-[11px] text-[#94a3b8]">{row.paidHours.toFixed(1)}h</p>
                    </td>
                    <td className="px-5 py-3 text-[#64748b]">{row.shiftCount}</td>
                    <td className="px-5 py-3 text-right">
                      {row.outstandingAmount > 0 ? (
                        <button
                          type="button"
                          onClick={() => markStaffAllPaid(row.staff_id)}
                          disabled={busyId === `staff:${row.staff_id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#0f172a] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
                        >
                          {busyId === `staff:${row.staff_id}` ? 'Working…' : 'Mark all paid'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#94a3b8]">Up to date</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Filter chips + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full bg-[#f0f1f3] p-1 text-xs font-medium">
          {(['outstanding', 'paid', 'all'] as const).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-2 transition-colors ${
                filter === key ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              {key === 'outstanding' ? 'Outstanding' : key === 'paid' ? 'Paid' : 'All clocked'}
            </button>
          ))}
        </div>

        <div className="relative ml-auto max-w-sm flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#94a3b8]" aria-hidden="true">search</span>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by staff, client, or service…"
            className="w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] py-2.5 pl-10 pr-4 text-sm text-[#0f172a] outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
          />
        </div>
      </div>

      {/* Per-shift list */}
      <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_14px_32px_rgba(26,26,24,0.04)]">
        <div className="border-b border-[#f0f1f3] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#0f172a]">Shift ledger</h3>
        </div>
        {filteredShifts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="material-symbols-outlined text-[40px] text-[#94a3b8]">receipt_long</span>
            <p className="mt-3 text-sm font-semibold text-[#0f172a]">No shifts match this filter</p>
            <p className="mt-1 text-xs text-[#64748b]">
              {filter === 'outstanding' ? 'No outstanding shifts to bill.' : filter === 'paid' ? 'No paid shifts yet.' : 'No shifts found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Staff</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Hours</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredShifts.map(row => (
                  <tr key={row.id} className="border-t border-[#f0f1f3] text-sm text-[#0f172a]">
                    <td className="px-5 py-3 text-[#64748b]">
                      {new Date(row.start_time).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-5 py-3">{row.staff_name ?? '—'}</td>
                    <td className="px-5 py-3 text-[#64748b]">{row.client_name ?? '—'}</td>
                    <td className="px-5 py-3 text-[#64748b]">{row.hours.toFixed(1)}h</td>
                    <td className="px-5 py-3 font-medium">{fmtMoney(row.amount)}</td>
                    <td className="px-5 py-3">
                      {row.payment_status === 'paid' ? (
                        <StatusBadge status="paid" />
                      ) : row.clock_out_time ? (
                        <StatusBadge status="pending" label="Pending" />
                      ) : (
                        <StatusBadge status="in_progress" />
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.clock_out_time && (
                        <button
                          type="button"
                          onClick={() => markPaid(row.id, row.payment_status === 'paid' ? 'pending' : 'paid')}
                          disabled={busyId === row.id}
                          className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold disabled:opacity-60 ${
                            row.payment_status === 'paid'
                              ? 'border border-[#e6e8ec] bg-white text-[#64748b] hover:text-[#0f172a]'
                              : 'bg-[#0d9488] text-[#0f172a]'
                          }`}
                        >
                          {busyId === row.id ? 'Working…' : row.payment_status === 'paid' ? 'Revert' : 'Mark paid'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
