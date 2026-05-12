'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import LiveMap, { type MapMarker } from '@/components/maps/LiveMap'
import { createClient } from '@/lib/supabase/client'

type MapShiftRow = {
  id: string
  staff_id: string | null
  client_id: string | null
  status: string
  staff: { full_name: string | null } | { full_name: string | null }[] | null
  clients:
    | { full_name: string | null; address: string | null; lat: number | null; lng: number | null }
    | { full_name: string | null; address: string | null; lat: number | null; lng: number | null }[]
    | null
}

type StaffLocation = {
  staff_id: string
  lat: number
  lng: number
  updated_at: string
  shift_id: string | null
}

interface DashboardLiveMapProps {
  initialShifts: MapShiftRow[]
  initialStaffLocations: StaffLocation[]
}

function relationRow<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * Live staff GPS widget rendered on the admin dashboard.
 *
 * Subscribes to `staff_locations` and `shifts` realtime channels so pins update
 * the instant staff move or admins reassign shifts. Reuses the existing
 * `LiveMap` component built in commit ab2af96.
 */
export default function DashboardLiveMap({ initialShifts, initialStaffLocations }: DashboardLiveMapProps) {
  const [shifts, setShifts] = useState(initialShifts)
  const [staffLocations, setStaffLocations] = useState(initialStaffLocations)
  const [supabase] = useState(() => createClient())

  // Refetch shifts on changes (limited to current window — same shape as initial)
  useEffect(() => {
    const channel = supabase
      .channel('dashboard_live_map_shifts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, async () => {
        const { data, error } = await supabase
          .from('shifts')
          .select('id, staff_id, client_id, status, staff:profiles!staff_id(full_name), clients(full_name, address, lat, lng)')
          .in('status', ['active', 'scheduled'])
          .gte('start_time', new Date(Date.now() - 86_400_000).toISOString())
          .order('start_time', { ascending: true })
        if (error) console.error('[DashboardLiveMap] shifts refetch failed:', error)
        if (data) setShifts(data as MapShiftRow[])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  useEffect(() => {
    const channel = supabase
      .channel('dashboard_live_map_locations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_locations' }, async () => {
        const { data, error } = await supabase
          .from('staff_locations')
          .select('staff_id, lat, lng, updated_at, shift_id')
        if (error) console.error('[DashboardLiveMap] staff_locations refetch failed:', error)
        if (data) setStaffLocations(data as StaffLocation[])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const liveCount = useMemo(
    () => shifts.filter(s => s.status === 'active').length,
    [shifts],
  )

  const markers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = []
    const seenClients = new Set<string>()

    // Client pins for active/scheduled shifts
    shifts.forEach(s => {
      const client = relationRow(s.clients)
      if (client?.lat && client?.lng) {
        const key = `${client.lat}:${client.lng}`
        if (!seenClients.has(key)) {
          seenClients.add(key)
          out.push({
            id: `client-${s.id}`,
            lat: client.lat,
            lng: client.lng,
            type: 'client',
            label: client.full_name ?? 'Client',
            sublabel: client.address ?? undefined,
          })
        }
      }
    })

    // Staff live position pins
    staffLocations.forEach(loc => {
      const matchingShift = shifts.find(s => s.id === loc.shift_id)
      const staff = relationRow(matchingShift?.staff)
      const client = relationRow(matchingShift?.clients)
      out.push({
        id: `staff-${loc.staff_id}`,
        lat: loc.lat,
        lng: loc.lng,
        type: 'staff',
        label: staff?.full_name ?? 'Staff',
        sublabel: client?.full_name ? `Supporting ${client.full_name}` : undefined,
        status: 'active',
        updatedAt: loc.updated_at,
      })
    })

    return out
  }, [shifts, staffLocations])

  return (
    <section className="rounded-[16px] border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-[#0f172a]">Where staff are now</h3>
          <p className="mt-1 text-[12px] text-[#64748b]">
            {liveCount} on shift · positions update in real time
          </p>
        </div>
        <Link
          href="/admin/active-shifts"
          className="inline-flex items-center gap-1 rounded-full border border-[#e6e8ec] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#0f172a] hover:bg-[#f7f8f9]"
        >
          View full board
          <span className="material-symbols-outlined text-[12px]" aria-hidden="true">arrow_forward</span>
        </Link>
      </div>
      <div className="h-[360px] overflow-hidden rounded-[12px]">
        <LiveMap markers={markers} height="360px" />
      </div>
    </section>
  )
}
