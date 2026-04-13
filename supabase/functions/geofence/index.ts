import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

type Payload = {
  latitude: number
  longitude: number
  clientLatitude: number
  clientLongitude: number
  allowedRadiusMeters?: number
}

function haversineDistanceInMeters(
  latitude: number,
  longitude: number,
  clientLatitude: number,
  clientLongitude: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const earthRadius = 6371000
  const dLat = toRadians(clientLatitude - latitude)
  const dLng = toRadians(clientLongitude - longitude)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latitude)) *
      Math.cos(toRadians(clientLatitude)) *
      Math.sin(dLng / 2) ** 2

  return 2 * earthRadius * Math.asin(Math.sqrt(a))
}

serve(async request => {
  const payload = (await request.json()) as Payload
  const distance = haversineDistanceInMeters(
    payload.latitude,
    payload.longitude,
    payload.clientLatitude,
    payload.clientLongitude,
  )

  return new Response(
    JSON.stringify({
      ok: distance <= (payload.allowedRadiusMeters ?? 300),
      distance,
      allowedRadiusMeters: payload.allowedRadiusMeters ?? 300,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
