'use client'

import { useState } from 'react'

type Shift = {
  id: string
  start_time: string
  end_time: string
  status: string
  support_type: string | null
  notes: string | null
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
}

type Tab = 'upcoming' | 'past'

export default function ClientShiftsClient({ shifts }: { shifts: Shift[] }) {
  const [tab, setTab] = useState<Tab>('upcoming')
  const now = new Date()

  const upcoming = shifts.filter(shift => new Date(shift.start_time) >= now)
  const past = shifts.filter(shift => new Date(shift.start_time) < now)

  const visible = tab === 'upcoming' ? [...upcoming].reverse() : past

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">Your care schedule</p>
        <h1 className="mt-1 font-headline text-2xl font-semibold tracking-[-0.04em] text-[#171716]">Visits</h1>
        <p className="mt-1 text-sm text-[#8b867b]">
          {upcoming.length} upcoming · {past.length} past
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 rounded-[22px] border border-[#e6e0d7] bg-white p-1.5 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
        {(['upcoming', 'past'] as Tab[]).map(value => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`flex-1 rounded-[18px] py-3 text-sm font-semibold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6] ${
              tab === value ? 'bg-[#171717] text-white' : 'text-[#676359] hover:text-[#171716]'
            }`}
          >
            {value === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map(shift => (
            <ShiftCard key={shift.id} shift={shift} />
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-[#d7d1c6] bg-white px-6 py-14 text-center">
          <span className="material-symbols-outlined text-[44px] text-[#b5afa5]">
            {tab === 'upcoming' ? 'calendar_today' : 'history'}
          </span>
          <p className="mt-3 text-sm font-semibold text-[#171716]">
            {tab === 'upcoming' ? 'No upcoming visits' : 'No past visits'}
          </p>
          <p className="mt-1 text-xs text-[#8b867b]">
            {tab === 'upcoming'
              ? 'Your upcoming care schedule will appear here once visits are arranged.'
              : 'Your completed visits will appear here.'}
          </p>
        </div>
      )}
    </div>
  )
}

function ShiftCard({ shift }: { shift: Shift }) {
  const start = new Date(shift.start_time)
  const end = new Date(shift.end_time)
  const staffName = Array.isArray(shift.profiles)
    ? shift.profiles[0]?.full_name
    : shift.profiles?.full_name

  const statusStyles: Record<string, string> = {
    scheduled: 'bg-[#f4f1ea] text-[#5c5850]',
    active: 'bg-[#8B45A6] text-[#171717]',
    completed: 'bg-[#f3e8ff] text-[#6b21a8]',
  }
  const statusLabels: Record<string, string> = {
    scheduled: 'Scheduled',
    active: 'In progress',
    completed: 'Completed',
  }

  return (
    <article className="rounded-[24px] border border-[#e6e0d7] bg-white p-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
      <div className="flex items-start gap-4">
        {/* Date block */}
        <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-[#f4f1ea] py-3">
          <p className="font-headline text-xl font-semibold leading-none text-[#171716]">{start.getDate()}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b867b]">
            {start.toLocaleDateString('en-AU', { month: 'short' })}
          </p>
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-headline text-sm font-semibold text-[#171716]">
                {staffName ?? 'Vivid Care staff'}
              </p>
              <p className="mt-0.5 text-xs text-[#666258]">
                {start.toLocaleDateString('en-AU', { weekday: 'short' })}
                {' · '}
                {start.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                {' – '}
                {end.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusStyles[shift.status] ?? statusStyles.scheduled}`}>
              {statusLabels[shift.status] ?? shift.status}
            </span>
          </div>

          {shift.support_type && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#f4f1ea] px-2.5 py-1">
              <span className="material-symbols-outlined text-[12px] text-[#8b867b]">label</span>
              <span className="text-[11px] text-[#5c5850]">{shift.support_type}</span>
            </div>
          )}

          {shift.notes && (
            <p className="mt-2 text-xs leading-5 text-[#8b867b]">{shift.notes}</p>
          )}
        </div>
      </div>
    </article>
  )
}
