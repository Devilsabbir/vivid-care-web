'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type ShiftStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'

type Relation = {
  full_name: string | null
  phone?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
}

type ShiftRow = {
  id: string
  start_time: string
  end_time: string
  clock_in_time?: string | null
  status: ShiftStatus
  profiles: Relation | Relation[] | null
  clients: Relation | Relation[] | null
}

type NormalizedShift = {
  id: string
  startTime: string
  endTime: string
  clockInTime: string | null
  status: ShiftStatus
  staffName: string
  staffPhone: string | null
  clientName: string
  clientAddress: string | null
  hasGeofence: boolean
}

export default function ActiveShiftsClient({ initialShifts }: { initialShifts: ShiftRow[] }) {
  const [shifts, setShifts] = useState(initialShifts)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const channel = supabase
      .channel('active_shifts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, async () => {
        const { data } = await supabase
          .from('shifts')
          .select('*, profiles(full_name, phone), clients(full_name, address, lat, lng)')
          .in('status', ['active', 'scheduled'])
          .gte('start_time', new Date(Date.now() - 86400000).toISOString())
          .order('start_time', { ascending: true })

        if (data) setShifts(data as ShiftRow[])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const normalizedShifts = useMemo<NormalizedShift[]>(() => {
    return shifts.map(shift => {
      const staff = relationRow(shift.profiles)
      const client = relationRow(shift.clients)
      return {
        id: shift.id,
        startTime: shift.start_time,
        endTime: shift.end_time,
        clockInTime: shift.clock_in_time ?? null,
        status: shift.status,
        staffName: staff?.full_name ?? 'Unassigned staff',
        staffPhone: staff?.phone ?? null,
        clientName: client?.full_name ?? 'Client record',
        clientAddress: client?.address ?? null,
        hasGeofence: Boolean(client?.lat && client?.lng),
      }
    })
  }, [shifts])

  const active = normalizedShifts.filter(shift => shift.status === 'active')
  const scheduled = normalizedShifts.filter(shift => shift.status === 'scheduled')
  const monitored = normalizedShifts.length
  const geoReady = normalizedShifts.filter(shift => shift.hasGeofence).length
  const avgProgress = active.length
    ? Math.round(active.reduce((total, shift) => total + shiftProgress(shift), 0) / active.length)
    : 0

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        <StatCard label="Active now" value={active.length} sub="Shifts currently in progress" />
        <StatCard label="Scheduled next" value={scheduled.length} sub={`${geoReady}/${monitored} shifts have geofence coordinates`} accent />
        <aside className="relative overflow-hidden rounded-[24px] bg-[#1a1a18] p-6 text-white shadow-[0_16px_40px_rgba(26,26,24,0.14)]">
          <div className="absolute right-[-24px] top-[-24px] h-36 w-36 rounded-full bg-white/5" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Live operations</p>
              <h2 className="mt-4 max-w-[16rem] text-[1.5rem] leading-tight tracking-[-0.04em]">
                {active.length > 0 ? `${avgProgress}% average progress across active visits.` : 'No one is currently clocked in.'}
              </h2>
            </div>
            <Link
              href="/admin/roster"
              className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#1a1a18]"
            >
              Open roster planner
              <span className="material-symbols-outlined text-[18px]">north_east</span>
            </Link>
          </div>
        </aside>
      </section>

      {active.length > 0 ? (
        <section className="rounded-[28px] border border-[#e8e4dc] bg-white p-5 shadow-[0_16px_40px_rgba(26,26,24,0.04)] md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#1a1a18]">Live shift board</h3>
              <p className="text-xs text-[#8a877f]">Staff currently onsite with attendance progress and location readiness</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#faf5ff] px-3 py-1.5 text-[11px] font-medium text-[#6b21a8]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#a855f7] animate-pulse" />
              Realtime feed
            </span>
          </div>
          <div className="space-y-3">
            {active.map(shift => (
              <LiveShiftCard key={shift.id} shift={shift} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-[28px] border border-[#e8e4dc] bg-white p-5 shadow-[0_16px_40px_rgba(26,26,24,0.04)] md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#1a1a18]">Scheduled watchlist</h3>
              <p className="text-xs text-[#8a877f]">Upcoming visits that are ready for clock-in monitoring</p>
            </div>
            <Link href="/admin/shift-history" className="rounded-full bg-[#f4f2ed] px-3 py-1.5 text-[11px] font-medium text-[#4f4c45]">
              View history
            </Link>
          </div>

          {scheduled.length > 0 ? (
            <div className="space-y-3">
              {scheduled.map(shift => (
                <ScheduledShiftCard key={shift.id} shift={shift} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="event_available"
              title="No scheduled shifts in the watch window"
              copy="As new shifts approach their start time, they’ll appear here for live monitoring."
            />
          )}
        </section>

        <aside className="space-y-4">
          <InfoRail
            title="What this board shows"
            items={[
              'Active shifts refresh in realtime when attendance state changes.',
              'Geofence readiness flags whether the client location is configured.',
              'Use the roster planner to reassign or inspect the full weekly schedule.',
            ]}
          />

          <InfoRail
            title="Coverage snapshot"
            items={[
              `${active.length} currently active`,
              `${scheduled.length} queued for later today`,
              `${monitored - geoReady} shifts missing geofence coordinates`,
            ]}
          />
        </aside>
      </div>

      {monitored === 0 ? (
        <EmptyState
          icon="location_off"
          title="No active or scheduled shifts"
          copy="This board will populate once new visits are rostered into the monitoring window."
        />
      ) : null}
    </div>
  )
}

function LiveShiftCard({ shift }: { shift: NormalizedShift }) {
  const progress = shiftProgress(shift)

  return (
    <article className="rounded-[22px] border border-[#ece8df] bg-[#faf9f6] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Avatar name={shift.staffName} tone="dark" />
          <div>
            <h4 className="text-sm font-semibold text-[#1a1a18]">{shift.staffName}</h4>
            <p className="text-[12px] text-[#7d7a73]">{shift.clientName}</p>
            <p className="text-[11px] text-[#9a978f]">
              {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
            </p>
          </div>
        </div>

        <div className="md:ml-auto md:max-w-[14rem] md:text-right">
          <span className="inline-flex rounded-full bg-[#f3e8ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b21a8]">
            Live now
          </span>
          <p className="mt-2 text-[12px] text-[#68655e]">{shift.clientAddress ?? 'No client address saved'}</p>
          <p className="mt-1 text-[11px] text-[#9a978f]">{shift.staffPhone ?? 'No staff phone on file'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[11px] text-[#7c7972]">
            <span>Attendance progress</span>
            <strong className="font-semibold text-[#1a1a18]">{progress}%</strong>
          </div>
          <div className="mt-2 h-2 rounded-full bg-[#ebe7df]">
            <div className="h-2 rounded-full bg-[#1a1a18]" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={pillClass(shift.hasGeofence ? 'green' : 'amber')}>
            {shift.hasGeofence ? 'Geofence ready' : 'Geofence missing'}
          </span>
          {shift.clockInTime ? (
            <span className="rounded-full bg-[#f4f2ed] px-3 py-1.5 text-[#5f5c55]">
              Clocked in {formatTime(shift.clockInTime)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function ScheduledShiftCard({ shift }: { shift: NormalizedShift }) {
  return (
    <article className="flex flex-col gap-4 rounded-[22px] border border-[#ece8df] bg-[#faf9f6] p-4 md:flex-row md:items-center">
      <div className="flex items-center gap-3">
        <Avatar name={shift.staffName} tone="accent" />
        <div>
          <h4 className="text-sm font-semibold text-[#1a1a18]">{shift.staffName}</h4>
          <p className="text-[12px] text-[#7d7a73]">{shift.clientName}</p>
          <p className="text-[11px] text-[#9a978f]">{formatDate(shift.startTime)}</p>
        </div>
      </div>

      <div className="md:ml-auto md:text-right">
        <span className="rounded-full bg-[#dbeafe] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1d4ed8]">
          Scheduled
        </span>
        <p className="mt-2 text-[12px] text-[#68655e]">
          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
        </p>
        <p className="mt-1 text-[11px] text-[#9a978f]">
          {shift.clientAddress ?? 'Address pending'}{shift.hasGeofence ? ' / geo-ready' : ' / geo-missing'}
        </p>
      </div>
    </article>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number
  sub: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-[24px] p-6 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${accent ? 'bg-[#c852ff]' : 'border border-[#e8e4dc] bg-white'}`}>
      <p className={`text-[12px] ${accent ? 'text-[#5e0087]' : 'text-[#8a877f]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] text-[#1a1a18]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#5e0087]' : 'text-[#8a877f]'}`}>{sub}</p>
    </div>
  )
}

function InfoRail({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
      <div className="border-b border-[#f0ece5] px-4 py-3">
        <h3 className="text-sm font-semibold text-[#1a1a18]">{title}</h3>
      </div>
      <div className="space-y-3 px-4 py-4 text-[12px] leading-6 text-[#66635b]">
        {items.map(item => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </section>
  )
}

function EmptyState({
  icon,
  title,
  copy,
}: {
  icon: string
  title: string
  copy: string
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#d8d3ca] bg-white px-6 py-16 text-center">
      <span className="material-symbols-outlined text-[44px] text-[#bbb6ad]">{icon}</span>
      <p className="mt-3 text-sm font-medium text-[#1a1a18]">{title}</p>
      <p className="mt-1 text-xs text-[#8a877f]">{copy}</p>
    </div>
  )
}

function relationRow<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function shiftProgress(shift: NormalizedShift) {
  if (shift.status !== 'active' || !shift.clockInTime) return 0
  const now = Date.now()
  const start = new Date(shift.clockInTime).getTime()
  const end = new Date(shift.endTime).getTime()
  if (end <= start) return 0
  return Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)))
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function Avatar({ name, tone }: { name: string; tone: 'dark' | 'accent' }) {
  return (
    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold uppercase tracking-[0.14em] ${tone === 'dark' ? 'bg-[#1a1a18] text-[#c852ff]' : 'bg-[#c852ff] text-[#1a1a18]'}`}>
      {name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase())
        .join('')}
    </div>
  )
}

function pillClass(tone: 'green' | 'amber') {
  return tone === 'green'
    ? 'rounded-full bg-[#f3e8ff] px-3 py-1.5 text-[#6b21a8]'
    : 'rounded-full bg-[#fef9c3] px-3 py-1.5 text-[#92400e]'
}
