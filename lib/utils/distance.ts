/** Haversine formula — returns distance in metres between two lat/lng points */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000 // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Returns true if staff is within 300m of client location */
export function isWithinGeofence(
  staffLat: number, staffLng: number,
  clientLat: number, clientLng: number,
  radiusMetres = 300
): boolean {
  return haversineDistance(staffLat, staffLng, clientLat, clientLng) <= radiusMetres
}

/** Returns true if current time is within 15 min before/after shift start */
export function isWithinShiftWindow(shiftStartTime: string, windowMinutes = 15): boolean {
  const now = new Date()
  const start = new Date(shiftStartTime)
  const diffMs = now.getTime() - start.getTime()
  const diffMinutes = diffMs / 60000
  return diffMinutes >= -windowMinutes && diffMinutes <= windowMinutes * 4 // 15min early to 60min after
}
