/** Returns true if current time is within 15 min before/after shift start */
export function isWithinShiftWindow(shiftStartTime: string, windowMinutes = 15): boolean {
  const now = new Date()
  const start = new Date(shiftStartTime)
  const diffMs = now.getTime() - start.getTime()
  const diffMinutes = diffMs / 60000
  return diffMinutes >= -windowMinutes && diffMinutes <= windowMinutes * 4 // 15min early to 60min after
}
