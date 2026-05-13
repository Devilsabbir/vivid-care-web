'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isWithinShiftWindow } from '@/lib/utils/distance'
import { Badge } from '@/components/ui/Badge'
import ErrorToast from '@/components/ui/ErrorToast'
import { useErrorToast } from '@/lib/hooks/useErrorToast'
import { useLocationTracker } from '@/lib/hooks/useLocationTracker'
import LiveMap from '@/components/maps/LiveMap'
import type { MapMarker } from '@/components/maps/LiveMap'

export default function ClockClient({ initialShifts, adminIds, staffId }: {
  initialShifts: any[]
  adminIds: string[]
  staffId: string
}) {
  const [shifts, setShifts] = useState(initialShifts)
  const [loading, setLoading] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const { errorMessage, showError, dismiss } = useErrorToast()

  // The shift currently clocked in (not yet clocked out)
  const activeShift = shifts.find((s: any) => s.clock_in_time && !s.clock_out_time)

  // Live location tracking â€” runs only while a shift is active
  const { stopTracking } = useLocationTracker({
    staffId,
    shiftId: activeShift?.id ?? null,
    enabled: Boolean(activeShift),
    intervalMs: 30000,
  })

  // Realtime: refetch today's shifts when any shift changes
  useEffect(() => {
    async function refetchShifts() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Replicate Perth UTC+8 day boundary logic from page.tsx
      const PERTH_OFFSET_MS = 8 * 60 * 60 * 1000
      const nowUtc = new Date()
      const perthNow = new Date(nowUtc.getTime() + PERTH_OFFSET_MS)
      perthNow.setUTCHours(0, 0, 0, 0)
      const startOfPerthDay = new Date(perthNow.getTime() - PERTH_OFFSET_MS)
      const endOfPerthDay = new Date(startOfPerthDay.getTime() + 24 * 60 * 60 * 1000 - 1)

      const [{ data: todayScheduled }, { data: currentlyActive }] = await Promise.all([
        supabase.from('shifts').select('*, clients(full_name, address, lat, lng)')
          .eq('staff_id', user.id).eq('status', 'scheduled')
          .gte('start_time', startOfPerthDay.toISOString())
          .lte('start_time', endOfPerthDay.toISOString())
          .order('start_time', { ascending: true }),
        supabase.from('shifts').select('*, clients(full_name, address, lat, lng)')
          .eq('staff_id', user.id).eq('status', 'active')
          .order('start_time', { ascending: true }),
      ])

      const activeList = currentlyActive ?? []
      const activeIds = new Set(activeList.map((s: any) => s.id))
      setShifts([
        ...activeList,
        ...(todayScheduled ?? []).filter((s: any) => !activeIds.has(s.id)),
      ])
    }

    const channel = supabase
      .channel('clock-shifts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
        refetchShifts()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  async function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject(new Error('Geolocation not supported'))
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
    })
  }

  async function handleClockIn(shift: any) {
    setLoading(shift.id)
    setSuccessMessage(null)

    try {
      const pos = await getPosition()
      const { latitude: lat, longitude: lng } = pos.coords

      if (!isWithinShiftWindow(shift.start_time)) {
        showError('You can only clock in within 15 minutes of your shift start time.')
        setLoading(null)
        return
      }

      const { error: shiftError } = await supabase.from('shifts').update({
        status: 'active',
        clock_in_time: new Date().toISOString(),
        clock_in_lat: lat,
        clock_in_lng: lng,
      }).eq('id', shift.id)

      if (shiftError) {
        console.error('[ClockClient] clock_in shift update failed:', shiftError)
        showError('Failed to record clock-in. Please try again.')
        setLoading(null)
        return
      }

      await Promise.all(adminIds.map(adminId =>
        supabase.from('notifications').insert({
          user_id: adminId,
          type: 'clock_in',
          title: 'Staff Clocked In',
          message: `Shift started for client ${shift.clients?.full_name ?? 'Unknown'}`,
          related_id: shift.id,
        }),
      ))

      setSuccessMessage('Clocked in successfully.')
      router.refresh()
    } catch (err: any) {
      const msg = err?.code === 1
        ? 'Location permission denied. Please enable GPS in your browser settings.'
        : err?.code === 3
          ? 'Location request timed out. Please try again.'
          : (err?.message ?? 'Unable to get your location. Please enable GPS.')
      console.error('[ClockClient] clock_in error:', err)
      showError(msg)
    }

    setLoading(null)
  }

  async function handleClockOut(shift: any) {
    setLoading(shift.id)
    setSuccessMessage(null)

    try {
      const pos = await getPosition()
      const { latitude: lat, longitude: lng } = pos.coords

      const { error: shiftError } = await supabase.from('shifts').update({
        status: 'completed',
        clock_out_time: new Date().toISOString(),
        clock_out_lat: lat,
        clock_out_lng: lng,
      }).eq('id', shift.id)

      if (shiftError) {
        console.error('[ClockClient] clock_out shift update failed:', shiftError)
        showError('Failed to record clock-out. Please try again.')
        setLoading(null)
        return
      }

      await Promise.all(adminIds.map(adminId =>
        supabase.from('notifications').insert({
          user_id: adminId,
          type: 'clock_out',
          title: 'Staff Clocked Out',
          message: `Shift completed for client ${shift.clients?.full_name ?? 'Unknown'}`,
          related_id: shift.id,
        }),
      ))

      // Immediately clear live location and stop GPS polling
      await stopTracking()

      setSuccessMessage('Clocked out successfully.')
      router.refresh()
    } catch (err: any) {
      const msg = err?.code === 1
        ? 'Location permission denied. Please enable GPS in your browser settings.'
        : err?.code === 3
          ? 'Location request timed out. Please try again.'
          : (err?.message ?? 'Unable to get your location. Please enable GPS.')
      console.error('[ClockClient] clock_out error:', err)
      showError(msg)
    }

    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {errorMessage && <ErrorToast message={errorMessage} onDismiss={dismiss} />}
      {successMessage ? (
        <div className="flex items-start gap-3 rounded-[22px] border border-[#E6D4F0] bg-[#F4ECF8] px-4 py-4 text-sm text-[#54206F] shadow-[0_10px_24px_rgba(26,26,24,0.04)]">
          <span className="material-symbols-outlined mt-0.5 text-[18px]">check_circle</span>
          <p>{successMessage}</p>
        </div>
      ) : null}

      {/* Location sharing disclosure â€” shown while a shift is active */}
      {activeShift && (
        <div className="flex items-center gap-2 rounded-2xl bg-[#F4ECF8] px-4 py-3 text-xs text-[#54206F]">
          <span className="material-symbols-outlined text-[16px]">location_on</span>
          <span>Your location is being shared with your coordinator while on shift.</span>
        </div>
      )}

      {shifts.length > 0 ? shifts.map(shift => {
        const isActive = shift.status === 'active'
        const isThisLoading = loading === shift.id
        const start = new Date(shift.start_time)

        return (
          <article key={shift.id} className="rounded-[28px] border border-[#e6e8ec] bg-white p-5 shadow-[0_16px_32px_rgba(26,26,24,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#64748b]">
                  {start.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
                <h3 className="mt-2 font-headline text-xl font-semibold text-[#0f172a]">{shift.clients?.full_name ?? 'Client'}</h3>
                <p className="mt-1 text-sm text-[#64748b]">
                  {formatTime(shift.start_time)} to {formatTime(shift.end_time)}
                </p>
              </div>
              <Badge variant={isActive ? 'active' : shift.status} />
            </div>

            {shift.clients?.address ? (
              <div className="mt-4 rounded-[22px] bg-[#f7f8f9] px-4 py-3 text-sm text-[#64748b]">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined mt-0.5 text-[18px] text-[#0f172a]">location_on</span>
                  <div>
                    <p className="font-medium text-[#0f172a]">{shift.clients.address}</p>
                    <p className="mt-1 text-xs text-[#64748b]">
                      Your GPS position is recorded on clock-in and clock-out so your coordinator can confirm attendance.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Mini map â€” shows client location pin */}
            {shift.clients?.lat && shift.clients?.lng ? (() => {
              const clientMarkers: MapMarker[] = [{
                id: `client-${shift.id}`,
                lat: shift.clients.lat,
                lng: shift.clients.lng,
                type: 'client',
                label: shift.clients.full_name ?? 'Client',
                sublabel: shift.clients.address ?? undefined,
              }]
              return (
                <div className="mt-3 overflow-hidden rounded-[22px]">
                  <LiveMap markers={clientMarkers} height="180px" zoom={15} />
                </div>
              )
            })() : null}

            <div className="mt-4 rounded-[22px] border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-xs text-[#64748b]">
              Clock in opens 15 minutes before shift start. Clock out captures your GPS position for attendance history.
            </div>

            {isActive ? (
              <button
                onClick={() => handleClockOut(shift)}
                disabled={!!loading}
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-[22px] bg-[#0f172a] px-4 py-4 font-headline text-base font-semibold text-white transition hover:bg-black disabled:opacity-60"
              >
                {isThisLoading ? (
                  <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[22px]">logout</span>
                )}
                {isThisLoading ? 'Capturing location...' : 'Clock out now'}
              </button>
            ) : (
              <button
                onClick={() => handleClockIn(shift)}
                disabled={!!loading}
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-[22px] bg-[#6B2C91] px-4 py-4 font-headline text-base font-semibold text-[#0f172a] transition hover:brightness-95 disabled:opacity-60"
              >
                {isThisLoading ? (
                  <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[22px]">login</span>
                )}
                {isThisLoading ? 'Capturing location...' : 'Clock in now'}
              </button>
            )}
          </article>
        )
      }) : (
        <section className="rounded-[28px] border border-dashed border-[#e6e8ec] bg-white px-6 py-14 text-center">
          <span className="material-symbols-outlined text-[44px] text-[#94a3b8]">timer_off</span>
          <p className="mt-3 text-sm font-semibold text-[#0f172a]">No shifts scheduled for today</p>
          <p className="mt-1 text-xs text-[#64748b]">When a coordinator assigns a visit, it will appear here for clock actions.</p>
        </section>
      )}
    </div>
  )
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}
