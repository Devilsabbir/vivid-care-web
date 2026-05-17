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

/**
 * Staff registry card grid. Mirrors the Clients list visuals: 16px
 * radius cards, warm purple-tinted shadow, brand-gradient avatar.
 */
export default function StaffTable({ staff }: { staff: StaffCard[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return staff.filter(
      (member) =>
        member.full_name.toLowerCase().includes(query) ||
        member.phone?.toLowerCase().includes(query),
    )
  }, [search, staff])

  return (
    <section className="overflow-hidden rounded-[16px] bg-white shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]">
      <div className="border-b border-[#F1EEF4] px-5 py-4 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-[16px] font-semibold leading-none text-[#1A1320]">Team directory</h3>
            <p className="mt-1.5 text-[12.5px] text-[#6B6371]">
              Search the workforce and review roster load and document readiness.
            </p>
          </div>
          <div className="flex h-9 items-center gap-2.5 rounded-[10px] border border-[#F1EEF4] bg-[#F8F6FA] px-3 md:w-[320px]">
            <span className="material-symbols-outlined text-[16px] text-[#97909C]">search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or phone…"
              className="w-full bg-transparent text-[13.5px] text-[#1A1320] outline-none placeholder:text-[#97909C]"
            />
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3 md:p-6">
          {filtered.map((member) => (
            <Link
              key={member.id}
              href={`/admin/staff/${member.id}`}
              className="group rounded-[16px] border border-[#F1EEF4] bg-white p-5 transition-all hover:border-[#E6D4F0] hover:bg-[#F8F6FA] hover:shadow-[0_4px_14px_rgba(46,18,64,0.05)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold uppercase tracking-[0.1em] text-white"
                  style={{
                    background: 'linear-gradient(135deg, #6B2C91 0%, #54206F 100%)',
                  }}
                >
                  {initials(member.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-[14px] font-semibold leading-tight text-[#1A1320] group-hover:text-[#54206F]">
                    {member.full_name}
                  </h4>
                  <p className="mt-1 truncate text-[12px] text-[#6B6371]">
                    {member.phone ?? 'Care team member'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatBox label="Shifts this week" value={String(member.shiftsThisWeek)} />
                <StatBox label="Hours" value={`${member.hoursThisWeek.toFixed(1)}h`} />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-[#E6F5FC] px-2 py-[3px] text-[11px] font-semibold uppercase text-[#1380AB]"
                  style={{ letterSpacing: '0.04em' }}
                >
                  Rostered
                </span>
                <span className={statusClass(member.docState)} style={{ letterSpacing: '0.04em' }}>
                  {statusLabel(member.docState)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="px-6 py-16 text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: '#F4ECF8', color: '#6B2C91' }}
          >
            <span className="material-symbols-outlined text-[26px]" aria-hidden="true">badge</span>
          </div>
          <p className="mt-4 text-[14.5px] font-semibold text-[#1A1320]">
            {search ? 'No staff match your search' : 'No staff records yet'}
          </p>
          <p className="mt-1.5 mx-auto max-w-md text-[12.5px] text-[#6B6371]">
            {search ? 'Try a different name or phone number.' : 'Add your first team member to start rostering.'}
          </p>
        </div>
      )}
    </section>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-[#F8F6FA] px-3 py-2.5">
      <p
        className="text-[10px] font-medium uppercase text-[#97909C]"
        style={{ letterSpacing: '0.06em' }}
      >
        {label}
      </p>
      <p className="mt-1 text-[15px] font-bold text-[#1A1320]" style={{ letterSpacing: '-0.01em' }}>
        {value}
      </p>
    </div>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function statusLabel(state: StaffCard['docState']) {
  if (state === 'expired') return 'Doc expired'
  if (state === 'near_expiry') return 'Doc expiring'
  if (state === 'active') return 'Docs current'
  return 'Docs missing'
}

function statusClass(state: StaffCard['docState']) {
  const base =
    'inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold uppercase'
  if (state === 'expired') return `${base} bg-[#FCE7E7] text-[#DC2626]`
  if (state === 'near_expiry') return `${base} bg-[#FEF3D6] text-[#5C3A06]`
  if (state === 'active') return `${base} bg-[#F1F9E1] text-[#5E8D1F]`
  return `${base} bg-[#F1EEF4] text-[#3F3548]`
}
