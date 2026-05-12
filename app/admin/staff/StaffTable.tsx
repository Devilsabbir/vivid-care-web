'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type StaffCard = {
  id: string
  full_name: string
  phone: string | null
  shiftsThisWeek: number
  hoursThisWeek: number
  docState: 'expired' | 'near_expiry' | 'active' | 'missing'
}

export default function StaffTable({ staff }: { staff: StaffCard[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return staff.filter(member =>
      member.full_name.toLowerCase().includes(query) ||
      member.phone?.toLowerCase().includes(query)
    )
  }, [search, staff])

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#e6e8ec] bg-white shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
      <div className="border-b border-[#f0f1f3] px-5 py-4 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0f172a]">Team directory</h3>
            <p className="text-xs text-[#64748b]">Search the workforce and review roster load and document readiness</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-2.5 md:w-[320px]">
            <span className="material-symbols-outlined text-[18px] text-[#918d85]">search</span>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search staff..."
              className="w-full bg-transparent text-sm text-[#0f172a] placeholder:text-[#9d998f] outline-none"
            />
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3 md:p-6">
          {filtered.map(member => (
            <Link
              key={member.id}
              href={`/admin/staff/${member.id}`}
              className="rounded-[22px] border border-[#e6e8ec] bg-[#fafbfc] p-5 transition-colors hover:bg-[#f7f8f9]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0f172a] text-sm font-semibold uppercase tracking-[0.14em] text-[#0d9488]">
                  {initials(member.full_name)}
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-[#0f172a]">{member.full_name}</h4>
                  <p className="truncate text-xs text-[#64748b]">{member.phone ?? 'Care team member'}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatBox label="Shifts this week" value={String(member.shiftsThisWeek)} />
                <StatBox label="Hours" value={`${member.hoursThisWeek.toFixed(1)}h`} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-[10px] font-semibold text-[#3b5bdb]">Rostered</span>
                <span className={statusClass(member.docState)}>{statusLabel(member.docState)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="px-6 py-16 text-center">
          <span className="material-symbols-outlined text-[44px] text-[#94a3b8]">badge</span>
          <p className="mt-3 text-sm font-medium text-[#0f172a]">
            {search ? 'No staff match your search' : 'No staff records yet'}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">
            {search ? 'Try a different name or phone number.' : 'Add your first team member to start rostering.'}
          </p>
        </div>
      )}
    </section>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-white px-3 py-3">
      <p className="text-[10px] text-[#94a3b8]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#0f172a]">{value}</p>
    </div>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}

function statusLabel(state: StaffCard['docState']) {
  if (state === 'expired') return 'Doc expired'
  if (state === 'near_expiry') return 'Doc expiring'
  if (state === 'active') return 'Docs current'
  return 'Docs missing'
}

function statusClass(state: StaffCard['docState']) {
  if (state === 'expired') return 'rounded-full bg-[#fee2e2] px-2.5 py-1 text-[10px] font-semibold text-[#991b1b]'
  if (state === 'near_expiry') return 'rounded-full bg-[#fef9c3] px-2.5 py-1 text-[10px] font-semibold text-[#92400e]'
  if (state === 'active') return 'rounded-full bg-[#f0fdfa] px-2.5 py-1 text-[10px] font-semibold text-[#0f766e]'
  return 'rounded-full bg-[#f7f8f9] px-2.5 py-1 text-[10px] font-semibold text-[#64748b]'
}
