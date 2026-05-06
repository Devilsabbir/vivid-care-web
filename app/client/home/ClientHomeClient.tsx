'use client'

import Link from 'next/link'

interface Shift {
  id: string
  start_time: string
  end_time: string
  status: string
  support_type: string | null
  staff: { full_name: string | null } | { full_name: string | null }[] | null
}

export default function ClientHomeClient({
  clientName,
  upcomingShifts,
  pendingAgreements,
}: {
  clientName: string
  upcomingShifts: Shift[]
  pendingAgreements: number
}) {
  const now = new Date()
  const firstName = clientName.split(' ')[0] || 'there'
  const greeting =
    now.getHours() < 12 ? 'Good morning' :
    now.getHours() < 17 ? 'Good afternoon' :
    'Good evening'

  const nextShift = upcomingShifts[0]

  return (
    <div className="space-y-5">
      {/* Hero greeting */}
      <section className="overflow-hidden rounded-[30px] bg-[#171717] px-5 py-5 text-white shadow-[0_26px_54px_rgba(23,23,22,0.18)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8f8a80]">
          {now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="mt-3 font-headline text-[2rem] font-semibold leading-none tracking-[-0.05em]">
          {greeting}, {firstName}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[#d1ccc3]">
          {nextShift
            ? `Your next visit is on ${formatDay(nextShift.start_time)} at ${formatTime(nextShift.start_time)}.`
            : 'You have no upcoming visits scheduled right now.'}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-white/8 px-4 py-4 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8f8a80]">Upcoming</p>
            <p className="mt-2 font-headline text-[1.8rem] font-semibold leading-none tracking-[-0.06em]">
              {upcomingShifts.length}
            </p>
          </div>
          <div className="rounded-[22px] bg-[#8B45A6] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5e0087]">To sign</p>
            <p className="mt-2 font-headline text-[1.8rem] font-semibold leading-none tracking-[-0.06em] text-[#171717]">
              {pendingAgreements}
            </p>
          </div>
        </div>
      </section>

      {/* Agreements callout — only when there are pending signatures */}
      {pendingAgreements > 0 ? (
        <Link
          href="/client/agreements"
          className="flex items-center gap-4 rounded-[28px] bg-[#8B45A6] px-5 py-4 shadow-[0_18px_36px_rgba(139,69,166,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171717]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#171717] text-[#8B45A6]">
            <span className="material-symbols-outlined text-[20px]">description</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#171717]">
              {pendingAgreements === 1 ? '1 agreement needs your signature' : `${pendingAgreements} agreements need your signature`}
            </p>
            <p className="mt-0.5 text-xs text-[#4a006f]">Tap to review and sign</p>
          </div>
          <span className="material-symbols-outlined text-[20px] text-[#4a006f]">arrow_forward</span>
        </Link>
      ) : (
        <Link
          href="/client/agreements"
          className="flex items-center gap-4 rounded-[28px] border border-[#e6e0d7] bg-white px-5 py-4 shadow-[0_14px_28px_rgba(23,23,22,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#171717] text-[#8B45A6]">
            <span className="material-symbols-outlined text-[20px]">description</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#171716]">Your agreements</p>
            <p className="mt-0.5 text-xs text-[#8b867b]">View your service agreement documents</p>
          </div>
          <span className="material-symbols-outlined text-[20px] text-[#8b867b]">arrow_forward</span>
        </Link>
      )}

      {/* Upcoming visits */}
      {upcomingShifts.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">Upcoming visits</p>
              <h2 className="mt-1 text-lg font-semibold text-[#171716]">Your scheduled care</h2>
            </div>
            <Link href="/client/shifts" className="text-sm font-semibold text-[#8B45A6]">
              See all
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingShifts.map(shift => (
              <VisitCard key={shift.id} shift={shift} />
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-[28px] border border-dashed border-[#d7d1c6] bg-white px-6 py-14 text-center">
          <span className="material-symbols-outlined text-[44px] text-[#b5afa5]">calendar_today</span>
          <p className="mt-3 text-sm font-semibold text-[#171716]">No upcoming visits</p>
          <p className="mt-1 text-xs text-[#8b867b]">Your care schedule will appear here once visits are arranged.</p>
        </section>
      )}

      {/* Quick links */}
      <section className="grid grid-cols-2 gap-3">
        <QuickLink href="/client/shifts" icon="calendar_month" label="All visits" />
        <QuickLink href="/client/profile" icon="person" label="My profile" />
      </section>
    </div>
  )
}

function VisitCard({ shift }: { shift: Shift }) {
  const start = new Date(shift.start_time)
  const end = new Date(shift.end_time)
  const staffName = Array.isArray(shift.staff)
    ? shift.staff[0]?.full_name
    : shift.staff?.full_name

  return (
    <div className="flex items-center gap-4 rounded-[24px] border border-[#ebe5db] bg-white p-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
      <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-[#f4f1ea] py-3">
        <p className="font-headline text-xl font-semibold leading-none text-[#171716]">{start.getDate()}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b867b]">
          {start.toLocaleDateString('en-AU', { month: 'short' })}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-headline text-sm font-semibold text-[#171716]">
          {staffName ?? 'Vivid Care staff'}
        </p>
        <p className="mt-0.5 text-xs text-[#666258]">
          {start.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
          {' '}–{' '}
          {end.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
        </p>
        {shift.support_type && (
          <p className="mt-1 text-xs text-[#8b867b]">{shift.support_type}</p>
        )}
      </div>

      <StatusPill status={shift.status} />
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: 'bg-[#f4f1ea] text-[#5c5850]',
    active: 'bg-[#8B45A6] text-[#1a1a18]',
    completed: 'bg-[#f3e8ff] text-[#6b21a8]',
  }
  const labels: Record<string, string> = {
    scheduled: 'Scheduled',
    active: 'In progress',
    completed: 'Done',
  }
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${styles[status] ?? styles.scheduled}`}>
      {labels[status] ?? status}
    </span>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-[24px] border border-[#e6e0d7] bg-white px-3 py-4 text-center shadow-[0_12px_26px_rgba(23,23,22,0.04)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#171717] text-[#8B45A6]">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#171716]">{label}</span>
    </Link>
  )
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}
