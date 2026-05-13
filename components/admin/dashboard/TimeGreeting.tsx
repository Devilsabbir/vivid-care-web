'use client'

import { useEffect, useState } from 'react'

/**
 * Time-aware greeting pinned to Australia/Perth (UTC+8, no DST), so the admin
 * sees the right salutation regardless of where they're physically signed in
 * from. Re-evaluates every minute so the greeting flips correctly when the
 * tab is left open across a boundary (e.g. 11:59 → 12:00 → afternoon).
 */
export default function TimeGreeting({ firstName }: { firstName: string }) {
  const [greeting, setGreeting] = useState(() => computeGreeting())

  useEffect(() => {
    setGreeting(computeGreeting())
    const id = setInterval(() => setGreeting(computeGreeting()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#0f172a] md:text-[32px]">
      {greeting}, {firstName}
    </h1>
  )
}

function computeGreeting(): string {
  const perthHour = parseInt(
    new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Perth',
      hour: 'numeric',
      hour12: false,
    }).format(new Date()),
    10,
  )
  if (Number.isNaN(perthHour)) return 'Hello'
  if (perthHour < 12) return 'Good morning'
  if (perthHour < 18) return 'Good afternoon'
  return 'Good evening'
}
