// Simple in-memory rate limiter using a sliding window per key
// Keys are automatically cleaned up after their window expires

const store = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((entry, key) => {
      if (now > entry.resetAt) store.delete(key)
    })
  }, 60_000)
}

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, limit, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, limit, remaining: limit - entry.count, resetAt: entry.resetAt }
}
