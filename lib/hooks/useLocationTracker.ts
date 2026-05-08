'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseLocationTrackerOptions {
  staffId: string
  shiftId: string | null // null = not tracking
  intervalMs?: number // default 30000 (30 seconds)
  enabled?: boolean // default true
}

export function useLocationTracker({
  staffId,
  shiftId,
  intervalMs = 30000,
  enabled = true,
}: UseLocationTrackerOptions) {
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSentRef = useRef<number>(0)

  const sendLocation = useCallback(async (position: GeolocationPosition) => {
    // Throttle: don't send more than once per intervalMs
    const now = Date.now()
    if (now - lastSentRef.current < intervalMs * 0.8) return
    lastSentRef.current = now

    if (!shiftId) return

    const supabase = createClient()
    const { latitude: lat, longitude: lng, accuracy, heading, speed } = position.coords

    // Upsert latest position
    await supabase.from('staff_locations').upsert({
      staff_id: staffId,
      shift_id: shiftId,
      lat,
      lng,
      accuracy,
      heading,
      speed,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'staff_id' })

    // Insert breadcrumb
    await supabase.from('location_breadcrumbs').insert({
      staff_id: staffId,
      shift_id: shiftId,
      lat,
      lng,
      accuracy,
      recorded_at: new Date().toISOString(),
    })
  }, [staffId, shiftId, intervalMs])

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Clear the staff's live location when they stop tracking
    if (staffId) {
      const supabase = createClient()
      await supabase.from('staff_locations').delete().eq('staff_id', staffId)
    }
  }, [staffId])

  useEffect(() => {
    if (!enabled || !shiftId || !navigator.geolocation) return

    // Use watchPosition for continuous high-accuracy updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      (err) => console.error('[location tracker] GPS error:', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    )

    // Also poll on interval as a fallback (watchPosition can be unreliable on some devices)
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        sendLocation,
        () => {}, // silent fail on interval polls
        { enableHighAccuracy: true, timeout: 10000 },
      )
    }, intervalMs)

    return () => { stopTracking() }
  }, [enabled, shiftId, sendLocation, stopTracking, intervalMs])

  return { stopTracking }
}
