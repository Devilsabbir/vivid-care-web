import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  createServiceClient,
  handleOptions,
  jsonResponse,
  parseJsonBody,
  relationRow,
} from '../_shared/utils.ts'

type GeofenceRequest = {
  shiftId?: string
  latitude: number
  longitude: number
  clientLatitude?: number
  clientLongitude?: number
  allowedRadiusMeters?: number
  windowMinutes?: number
  action?: 'validate' | 'clock_in' | 'clock_out'
  persist?: boolean
  currentTime?: string
}

type ShiftRecord = {
  id: string
  staff_id: string | null
  start_time: string
  end_time: string
  status: string
  clients:
    | {
        full_name: string | null
        address: string | null
        lat: number | null
        lng: number | null
      }
    | Array<{
        full_name: string | null
        address: string | null
        lat: number | null
        lng: number | null
      }>
    | null
}

function haversineDistanceInMeters(
  latitude: number,
  longitude: number,
  clientLatitude: number,
  clientLongitude: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const earthRadius = 6_371_000
  const dLat = toRadians(clientLatitude - latitude)
  const dLng = toRadians(clientLongitude - longitude)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latitude)) *
      Math.cos(toRadians(clientLatitude)) *
      Math.sin(dLng / 2) ** 2

  return 2 * earthRadius * Math.asin(Math.sqrt(a))
}

function isWithinShiftWindow(shiftStartTime: string, currentTime: Date, windowMinutes: number) {
  const start = new Date(shiftStartTime)
  const diffMinutes = (currentTime.getTime() - start.getTime()) / 60_000
  return diffMinutes >= -windowMinutes && diffMinutes <= windowMinutes * 4
}

serve(async request => {
  const optionsResponse = handleOptions(request)
  if (optionsResponse) return optionsResponse

  try {
    const payload = await parseJsonBody<GeofenceRequest>(request)

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      return jsonResponse(
        { ok: false, error: 'latitude and longitude are required numeric values.' },
        400,
      )
    }

    const supabase = createServiceClient()
    const now = payload.currentTime ? new Date(payload.currentTime) : new Date()
    const action = payload.action ?? 'validate'

    let shift: ShiftRecord | null = null
    let clientLatitude = payload.clientLatitude ?? null
    let clientLongitude = payload.clientLongitude ?? null
    let allowedRadiusMeters = payload.allowedRadiusMeters ?? 300
    let clockWindowMinutes = payload.windowMinutes ?? 15

    if (payload.shiftId) {
      const [{ data: shiftRow, error: shiftError }, { data: settings, error: settingsError }] =
        await Promise.all([
          supabase
            .from('shifts')
            .select('id, staff_id, start_time, end_time, status, clients(full_name, address, lat, lng)')
            .eq('id', payload.shiftId)
            .single(),
          supabase
            .from('organization_settings')
            .select('geofence_radius_meters, clock_in_window_minutes')
            .eq('id', 1)
            .maybeSingle(),
        ])

      if (shiftError) {
        return jsonResponse({ ok: false, error: shiftError.message }, 404)
      }

      if (settingsError) {
        return jsonResponse({ ok: false, error: settingsError.message }, 500)
      }

      shift = shiftRow as ShiftRecord
      const client = relationRow(shift.clients)

      clientLatitude = clientLatitude ?? client?.lat ?? null
      clientLongitude = clientLongitude ?? client?.lng ?? null
      allowedRadiusMeters = payload.allowedRadiusMeters ?? settings?.geofence_radius_meters ?? 300
      clockWindowMinutes = payload.windowMinutes ?? settings?.clock_in_window_minutes ?? 15
    }

    const hasClientCoordinates =
      Number.isFinite(clientLatitude) && Number.isFinite(clientLongitude)

    const distance = hasClientCoordinates
      ? haversineDistanceInMeters(
          payload.latitude,
          payload.longitude,
          Number(clientLatitude),
          Number(clientLongitude),
        )
      : null

    const withinGeofence = distance === null || distance <= allowedRadiusMeters
    const withinWindow =
      !shift || action === 'clock_out'
        ? true
        : isWithinShiftWindow(shift.start_time, now, clockWindowMinutes)

    const ok = withinGeofence && withinWindow

    if (payload.persist && shift && action !== 'validate' && ok) {
      const patch =
        action === 'clock_out'
          ? {
              status: 'completed',
              clock_out_time: now.toISOString(),
              clock_out_lat: payload.latitude,
              clock_out_lng: payload.longitude,
            }
          : {
              status: 'active',
              clock_in_time: now.toISOString(),
              clock_in_lat: payload.latitude,
              clock_in_lng: payload.longitude,
            }

      const [{ error: updateError }, { data: admins, error: adminError }] = await Promise.all([
        supabase.from('shifts').update(patch).eq('id', shift.id),
        supabase.from('profiles').select('id').eq('role', 'admin'),
      ])

      if (updateError) {
        return jsonResponse({ ok: false, error: updateError.message }, 500)
      }

      if (adminError) {
        return jsonResponse({ ok: false, error: adminError.message }, 500)
      }

      const client = relationRow(shift.clients)

      if ((admins ?? []).length > 0) {
        const type = action === 'clock_out' ? 'clock_out' : 'clock_in'
        const title = action === 'clock_out' ? 'Staff Clocked Out' : 'Staff Clocked In'
        const message = `${
          action === 'clock_out' ? 'Shift completed' : 'Shift started'
        } for client ${client?.full_name ?? 'Unknown'}`

        const { error: notificationError } = await supabase.from('notifications').insert(
          admins.map(admin => ({
            user_id: admin.id,
            type,
            title,
            message,
            related_id: shift!.id,
          })),
        )

        if (notificationError) {
          return jsonResponse({ ok: false, error: notificationError.message }, 500)
        }
      }
    }

    return jsonResponse({
      ok,
      shiftId: shift?.id ?? payload.shiftId ?? null,
      action,
      distance,
      allowedRadiusMeters,
      clockWindowMinutes,
      withinGeofence,
      withinWindow,
      message: ok
        ? payload.persist && action !== 'validate'
          ? `Shift ${action === 'clock_out' ? 'clocked out' : 'clocked in'} successfully.`
          : 'Validation successful.'
        : !withinGeofence
          ? 'Staff is outside the configured client geofence.'
          : 'Clock-in is outside the allowed time window.',
    })
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected geofence validation error.',
      },
      500,
    )
  }
})
