'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'

export default function StaffHomeClient({ shifts, staffName }: { shifts: any[]; staffName: string }) {
  const [FC, setFC] = useState<any>(null)
  const [plugins, setPlugins] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      import('@fullcalendar/react'),
      import('@fullcalendar/daygrid'),
      import('@fullcalendar/interaction'),
    ]).then(([fc, dg, ip]) => {
      setFC(() => fc.default)
      setPlugins([dg.default, ip.default])
    })
  }, [])

  const now = new Date()
  const firstName = staffName.split(' ')[0] || 'there'
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const upcoming = shifts.filter(shift => new Date(shift.end_time) >= now)
  const todayShifts = shifts.filter(shift => {
    const date = new Date(shift.start_time)
    return date.toDateString() === now.toDateString()
  })
  const activeShift = shifts.find(shift => shift.status === 'active')
  const nextShift = upcoming.find(shift => shift.status !== 'completed' && shift.status !== 'cancelled')

  const weekAhead = new Date(now)
  weekAhead.setDate(now.getDate() + 7)
  const weekCount = shifts.filter(shift => {
    const start = new Date(shift.start_time)
    return start >= now && start <= weekAhead && shift.status !== 'cancelled'
  }).length

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)
  const completedThisWeek = shifts.filter(shift => {
    const start = new Date(shift.start_time)
    return start >= weekStart && shift.status === 'completed'
  }).length

  const events = shifts.map(shift => ({
    id: shift.id,
    title: shift.clients?.full_name ?? 'Shift',
    start: shift.start_time,
    end: shift.end_time,
    backgroundColor: shift.status === 'active' ? '#1d5d41' : shift.status === 'completed' ? '#8a867c' : '#171717',
    borderColor: 'transparent',
  }))

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] bg-[#171717] px-5 py-5 text-white shadow-[0_26px_54px_rgba(23,23,22,0.18)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8f8a80]">Today</p>
        <h1 className="mt-3 font-headline text-[2rem] font-semibold leading-none tracking-[-0.05em]">
          {greeting}, {firstName}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#d1ccc3]">
          {now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
          {activeShift
            ? ` You are currently on shift with ${activeShift.clients?.full_name ?? 'your client'}.`
            : nextShift
              ? ` Your next visit starts at ${formatTime(nextShift.start_time)}.`
              : ' You have no active shifts right now.'}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <MetricCard label="Today" value={todayShifts.length} />
          <MetricCard label="7 days" value={weekCount} accent />
          <MetricCard label="Done" value={completedThisWeek} />
        </div>
      </section>

      <section className="grid grid-cols-4 gap-3">
        <QuickAction href="/staff/clock" icon="timer" label="Clock" />
        <QuickAction href="/staff/documents" icon="folder" label="Docs" />
        <QuickAction href="/staff/documentation" icon="fact_check" label="Service" />
        <QuickAction href="/staff/incidents" icon="warning" label="Incidents" />
      </section>

      {activeShift ? (
        <section className="rounded-[28px] bg-[#cdff52] p-5 shadow-[0_18px_36px_rgba(205,255,82,0.2)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#627100]">Live shift</p>
              <h2 className="mt-2 font-headline text-xl font-semibold text-[#171717]">{activeShift.clients?.full_name ?? 'Current shift'}</h2>
              <p className="mt-1 text-sm text-[#435100]">
                {formatTime(activeShift.start_time)} to {formatTime(activeShift.end_time)}
              </p>
            </div>
            <Badge variant="active" />
          </div>

          {activeShift.clients?.address ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-[#435100]">
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              {activeShift.clients.address}
            </p>
          ) : null}

          <Link
            href="/staff/clock"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#171717] px-4 py-2 text-sm font-semibold text-white"
          >
            Open clock screen
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </section>
      ) : nextShift ? (
        <section className="rounded-[28px] border border-[#e6e0d7] bg-white p-5 shadow-[0_16px_32px_rgba(23,23,22,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">Next up</p>
              <h2 className="mt-2 font-headline text-xl font-semibold text-[#171716]">{nextShift.clients?.full_name ?? 'Upcoming shift'}</h2>
              <p className="mt-1 text-sm text-[#666258]">
                {formatDay(nextShift.start_time)} at {formatTime(nextShift.start_time)}
              </p>
            </div>
            <Badge variant={nextShift.status} />
          </div>

          {nextShift.clients?.address ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-[#8b867b]">
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              {nextShift.clients.address}
            </p>
          ) : null}
        </section>
      ) : null}

      {todayShifts.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">Today&apos;s visits</p>
              <h2 className="mt-1 text-lg font-semibold text-[#171716]">Your working day</h2>
            </div>
            <Link href="/staff/clock" className="text-sm font-semibold text-[#171716]">
              Clock actions
            </Link>
          </div>

          <div className="space-y-3">
            {todayShifts.map(shift => (
              <ShiftCard key={shift.id} shift={shift} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-[#e6e0d7] bg-white p-5 shadow-[0_16px_32px_rgba(23,23,22,0.05)]">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">Roster view</p>
          <h2 className="mt-1 text-lg font-semibold text-[#171716]">Monthly calendar</h2>
        </div>
        {FC && plugins.length > 0 ? (
          <FC
            plugins={plugins}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next', center: 'title', right: '' }}
            events={events}
            height="auto"
          />
        ) : (
          <div className="flex h-64 items-center justify-center text-[#8b867b]">
            <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
          </div>
        )}
      </section>

      {upcoming.length > 0 ? (
        <section className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">Upcoming</p>
            <h2 className="mt-1 text-lg font-semibold text-[#171716]">Next rostered visits</h2>
          </div>

          <div className="space-y-3">
            {upcoming.slice(0, 4).map(shift => (
              <ShiftCard key={shift.id} shift={shift} />
            ))}
          </div>
        </section>
      ) : null}

      {shifts.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-[#d7d1c6] bg-white px-6 py-14 text-center">
          <span className="material-symbols-outlined text-[44px] text-[#b5afa5]">calendar_today</span>
          <p className="mt-3 text-sm font-semibold text-[#171716]">No shifts assigned yet</p>
          <p className="mt-1 text-xs text-[#8b867b]">Your roster will appear here once a coordinator assigns work.</p>
        </section>
      ) : null}
    </div>
  )
}

function ShiftCard({ shift }: { shift: any }) {
  const start = new Date(shift.start_time)
  const end = new Date(shift.end_time)

  return (
    <article className="flex items-center gap-4 rounded-[24px] border border-[#ebe5db] bg-white p-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
      <div className="flex w-14 flex-shrink-0 flex-col items-center rounded-2xl bg-[#f4f1ea] py-3">
        <p className="font-headline text-xl font-semibold leading-none text-[#171716]">{start.getDate()}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b867b]">{start.toLocaleDateString('en-AU', { month: 'short' })}</p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-headline text-sm font-semibold text-[#171716]">{shift.clients?.full_name ?? 'Client'}</p>
            <p className="mt-1 text-xs text-[#666258]">
              {start.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} to {end.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <Badge variant={shift.status} />
        </div>

        {shift.clients?.address ? (
          <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-[#8b867b]">
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            {shift.clients.address}
          </p>
        ) : null}
      </div>
    </article>
  )
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-[24px] border border-[#e6e0d7] bg-white px-3 py-4 text-center shadow-[0_12px_26px_rgba(23,23,22,0.04)] transition hover:-translate-y-0.5"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#171717] text-[#cdff52]">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#171716]">{label}</span>
    </Link>
  )
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-[22px] px-4 py-4 ${accent ? 'bg-[#cdff52] text-[#171717]' : 'bg-white/8 text-white'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${accent ? 'text-[#627100]' : 'text-[#8f8a80]'}`}>
        {label}
      </p>
      <p className="mt-2 font-headline text-[1.8rem] font-semibold leading-none tracking-[-0.06em]">{value}</p>
    </div>
  )
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}
