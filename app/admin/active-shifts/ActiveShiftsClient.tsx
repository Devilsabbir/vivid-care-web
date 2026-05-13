'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LiveMap from '@/components/maps/LiveMap'
import type { MapMarker } from '@/components/maps/LiveMap'

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
  staff: Relation | Relation[] | null
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
  staffId: string | null
  clientName: string
  clientAddress: string | null
  clientLat: number | null
  clientLng: number | null
  hasMappedAddress: boolean
}

type StaffLocation = {
  staff_id: string
  lat: number
  lng: number
  accuracy: number | null
  updated_at: string
  shift_id: string | null
}

export default function ActiveShiftsClient({
  initialShifts,
  initialStaffLocations,
}: {
  initialShifts: ShiftRow[]
  initialStaffLocations: StaffLocation[]
}) {
  const [shifts, setShifts] = useState(initialShifts)
  const [staffLocations, setStaffLocations] = useState(initialStaffLocations)
  const [supabase] = useState(() => createClient())

  // Realtime: refetch shifts when any shift changes
  useEffect(() => {
    const channel = supabase
      .channel('active_shifts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, async () => {
        const { data, error } = await supabase
          .from('shifts')
          .select('*, staff:profiles!staff_id(full_name, phone), clients(full_name, address, lat, lng)')
          .in('status', ['active', 'scheduled'])
          .gte('start_time', new Date(Date.now() - 86400000).toISOString())
          .order('start_time', { ascending: true })
        if (error) console.error('[ActiveShiftsClient] shifts refetch failed:', error)
        if (data) setShifts(data as ShiftRow[])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  // Realtime: refetch staff locations when any position updates
  useEffect(() => {
    const channel = supabase
      .channel('staff_locations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_locations' }, async () => {
        const { data, error } = await supabase
          .from('staff_locations')
          .select('staff_id, lat, lng, accuracy, updated_at, shift_id')
        if (error) console.error('[ActiveShiftsClient] staff_locations refetch failed:', error)
        if (data) setStaffLocations(data as StaffLocation[])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const normalizedShifts = useMemo<NormalizedShift[]>(() => {
    return shifts.map(shift => {
      const staff = relationRow(shift.staff)
      const client = relationRow(shift.clients)
      return {
        id: shift.id,
        startTime: shift.start_time,
        endTime: shift.end_time,
        clockInTime: shift.clock_in_time ?? null,
        status: shift.status,
        staffName: staff?.full_name ?? 'Unassigned staff',
        staffPhone: staff?.phone ?? null,
        staffId: (shift as any).staff_id ?? null,
        clientName: client?.full_name ?? 'Client record',
        clientAddress: client?.address ?? null,
        clientLat: client?.lat ?? null,
        clientLng: client?.lng ?? null,
        hasMappedAddress: Boolean(client?.lat && client?.lng),
      }
    })
  }, [shifts])

  // Build map markers: live staff positions + client pins
  const mapMarkers = useMemo<MapMarker[]>(() => {
    const markers: MapMarker[] = []
    const seenClients = new Set<string>()

    normalizedShifts.forEach(shift => {
      const clientKey = `${shift.clientLat}:${shift.clientLng}`
      if (shift.clientLat && shift.clientLng && !seenClients.has(clientKey)) {
        seenClients.add(clientKey)
        markers.push({
          id: `client-${shift.id}`,
          lat: shift.clientLat,
          lng: shift.clientLng,
          type: 'client',
          label: shift.clientName,
          sublabel: shift.clientAddress ?? undefined,
        })
      }
    })

    staffLocations.forEach(loc => {
      const shift = normalizedShifts.find(s => s.id === loc.shift_id)
      markers.push({
        id: `staff-${loc.staff_id}`,
        lat: loc.lat,
        lng: loc.lng,
        type: 'staff',
        label: shift?.staffName ?? 'Staff',
        sublabel: shift?.clientName ? `Supporting ${shift.clientName}` : undefined,
        status: 'active',
        updatedAt: loc.updated_at,
      })
    })

    return markers
  }, [normalizedShifts, staffLocations])

  const active = normalizedShifts.filter(shift => shift.status === 'active')
  const scheduled = normalizedShifts.filter(shift => shift.status === 'scheduled')
  const monitored = normalizedShifts.length
  const mapped = normalizedShifts.filter(shift => shift.hasMappedAddress).length
  const avgProgress = active.length
    ? Math.round(active.reduce((total, shift) => total + shiftProgress(shift), 0) / active.length)
    : 0

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        <StatCard label="Active now" value={active.length} sub="Shifts currently in progress" />
        <StatCard label="Scheduled next" value={scheduled.length} sub={`${mapped}/${monitored} shifts have client addresses mapped`} accent />
        <aside className="relative overflow-hidden rounded-[24px] bg-[#0f172a] p-6 text-white shadow-[0_16px_40px_rgba(26,26,24,0.14)]">
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
              className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#0f172a]"
            >
              Open roster planner
              <span className="material-symbols-outlined text-[18px]">north_east</span>
            </Link>
          </div>
        </aside>
      </section>

      {/* Live location map â€” visible when any staff have a GPS position */}
      {mapMarkers.length > 0 && (
        <section className="rounded-[28px] border border-[#e6e8ec] bg-white p-5 shadow-[0_16px_40px_rgba(26,26,24,0.04)] md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">Live location map</h3>
              <p className="text-xs text-[#64748b]">Staff positions update every 30 seconds</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#64748b]">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#6B2C91]" /> Staff
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#00AAEF]" /> Client
              </span>
            </div>
          </div>
          <LiveMap markers={mapMarkers} height="400px" className="overflow-hidden rounded-[20px]" />
        </section>
      )}

      {active.length > 0 ? (
        <section className="rounded-[28px] border border-[#e6e8ec] bg-white p-5 shadow-[0_16px_40px_rgba(26,26,24,0.04)] md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">Live shift board</h3>
              <p className="text-xs text-[#64748b]">Staff currently onsite with attendance progress and location readiness</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#faf5ff] px-3 py-1.5 text-[11px] font-medium text-[#54206F]">
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
        <section className="rounded-[28px] border border-[#e6e8ec] bg-white p-5 shadow-[0_16px_40px_rgba(26,26,24,0.04)] md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">Scheduled watchlist</h3>
              <p className="text-xs text-[#64748b]">Upcoming visits that are ready for clock-in monitoring</p>
            </div>
            <Link href="/admin/shifts?view=past" className="rounded-full bg-[#f7f8f9] px-3 py-1.5 text-[11px] font-medium text-[#64748b]">
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
              copy="As new shifts approach their start time, theyâ€™ll appear here for live monitoring."
            />
          )}
        </section>

        <aside className="space-y-4">
          <InfoRail
            title="What this board shows"
            items={[
              'Active shifts refresh in realtime when attendance state changes.',
              'Client locations are shown on the map for visual proximity checks.',
              'Use the roster planner to reassign or inspect the full weekly schedule.',
            ]}
          />

          <InfoRail
            title="Coverage snapshot"
            items={[
              `${active.length} currently active`,
              `${scheduled.length} queued for later today`,
              `${monitored - mapped} shifts missing client address coordinates`,
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
    <Link href={`/admin/shifts/${shift.id}`} className="block rounded-[22px] border border-[#e6e8ec] bg-[#fafbfc] p-4 transition-colors hover:bg-[#f7f8f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Avatar name={shift.staffName} tone="dark" />
          <div>
            <h4 className="text-sm font-semibold text-[#0f172a]">{shift.staffName}</h4>
            <p className="text-[12px] text-[#7d7a73]">{shift.clientName}</p>
            <p className="text-[11px] text-[#9a978f]">
              {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
            </p>
          </div>
        </div>

        <div className="md:ml-auto md:max-w-[14rem] md:text-right">
          <span className="inline-flex rounded-full bg-[#F4ECF8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#54206F]">
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
            <strong className="font-semibold text-[#0f172a]">{progress}%</strong>
          </div>
          <div className="mt-2 h-2 rounded-full bg-[#ebe7df]">
            <div className="h-2 rounded-full bg-[#0f172a]" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className={pillClass(shift.hasMappedAddress ? 'green' : 'amber')}>
            {shift.hasMappedAddress ? 'Address mapped' : 'Address review'}
          </span>
          {shift.clockInTime ? (
            <span className="rounded-full bg-[#f7f8f9] px-3 py-1.5 text-[#64748b]">
              Clocked in {formatTime(shift.clockInTime)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

function ScheduledShiftCard({ shift }: { shift: NormalizedShift }) {
  return (
    <Link href={`/admin/shifts/${shift.id}`} className="flex flex-col gap-4 rounded-[22px] border border-[#e6e8ec] bg-[#fafbfc] p-4 md:flex-row md:items-center transition-colors hover:bg-[#f7f8f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]">
      <div className="flex items-center gap-3">
        <Avatar name={shift.staffName} tone="accent" />
        <div>
          <h4 className="text-sm font-semibold text-[#0f172a]">{shift.staffName}</h4>
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
          {shift.clientAddress ?? 'Address pending'}{shift.hasMappedAddress ? ' / mapped' : ' / address review'}
        </p>
      </div>
    </Link>
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
    <div className={`rounded-[24px] p-6 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${accent ? 'bg-[#6B2C91]' : 'border border-[#e6e8ec] bg-white'}`}>
      <p className={`text-[12px] ${accent ? 'text-[#54206F]' : 'text-[#64748b]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] text-[#0f172a]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#54206F]' : 'text-[#64748b]'}`}>{sub}</p>
    </div>
  )
}

function InfoRail({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
      <div className="border-b border-[#f0f1f3] px-4 py-3">
        <h3 className="text-sm font-semibold text-[#0f172a]">{title}</h3>
      </div>
      <div className="space-y-3 px-4 py-4 text-[12px] leading-6 text-[#64748b]">
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
    <div className="rounded-[24px] border border-dashed border-[#e6e8ec] bg-white px-6 py-16 text-center">
      <span className="material-symbols-outlined text-[44px] text-[#94a3b8]">{icon}</span>
      <p className="mt-3 text-sm font-medium text-[#0f172a]">{title}</p>
      <p className="mt-1 text-xs text-[#64748b]">{copy}</p>
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
    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold uppercase tracking-[0.14em] ${tone === 'dark' ? 'bg-[#0f172a] text-[#6B2C91]' : 'bg-[#6B2C91] text-[#0f172a]'}`}>
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
    ? 'rounded-full bg-[#F4ECF8] px-3 py-1.5 text-[#54206F]'
    : 'rounded-full bg-[#fef9c3] px-3 py-1.5 text-[#92400e]'
}
