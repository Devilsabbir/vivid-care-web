/** Returns how many days until a date. Negative = already expired. */
export function daysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/** Returns 'expired' | 'near_expiry' | 'active' based on days remaining */
export function getExpiryStatus(expiryDate: string | null): 'expired' | 'near_expiry' | 'active' | 'none' {
  const days = daysUntilExpiry(expiryDate)
  if (days === null) return 'none'
  if (days < 0) return 'expired'
  if (days <= 45) return 'near_expiry'
  return 'active'
}

/** Human-readable expiry label */
export function expiryLabel(expiryDate: string | null): string {
  const days = daysUntilExpiry(expiryDate)
  if (days === null) return 'No expiry'
  if (days < 0) return `Expired ${Math.abs(days)}d ago`
  if (days === 0) return 'Expires today'
  if (days <= 45) return `Expires in ${days}d`
  return new Date(expiryDate!).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
