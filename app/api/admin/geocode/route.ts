import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { getIP } from '@/lib/get-ip'

/**
 * Forward an address string to OpenStreetMap Nominatim and return lat/lng.
 *
 * Why Nominatim:
 * - No API key required (zero setup)
 * - Free for low-volume use (the policy is <1 req/sec, no commercial mass use)
 * - Acceptable accuracy for street-level Australian addresses
 *
 * Why server-side:
 * - The User-Agent header Nominatim requires is set here, not exposed to the
 *   browser (browsers can't set User-Agent anyway).
 * - Caller is admin-guarded + rate-limited, so we don't blow through the
 *   public Nominatim service.
 */
export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`geocode:${ip}`, { limit: 30, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many geocode requests. Please slow down.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': String(rl.remaining),
        },
      }
    )
  }

  // Admin-only
  const caller = await createServerClient()
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await caller.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }

  // Bias to Australia for our use case. Single best result.
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', address)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'au')
  url.searchParams.set('addressdetails', '0')

  let response: Response
  try {
    response = await fetch(url.toString(), {
      headers: {
        // Nominatim requires a real User-Agent that identifies the caller.
        'User-Agent': 'VividCare-Admin/1.0 (contact: raiyansabbir@gmail.com)',
        'Accept': 'application/json',
      },
      // Don't let a slow Nominatim hang the admin flow forever.
      signal: AbortSignal.timeout(8000),
    })
  } catch (err: any) {
    console.error('[geocode] nominatim fetch failed:', err)
    return NextResponse.json(
      { error: 'Geocoding service unreachable', detail: err?.message ?? 'unknown' },
      { status: 502 }
    )
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Geocoding service error', status: response.status },
      { status: 502 }
    )
  }

  const results = (await response.json().catch(() => [])) as Array<{ lat?: string; lon?: string }>
  const top = results?.[0]
  if (!top?.lat || !top?.lon) {
    return NextResponse.json(
      { error: 'NO_MATCH', message: `No location found for "${address}". Check the spelling or use a more specific address.` },
      { status: 404 }
    )
  }

  const lat = parseFloat(top.lat)
  const lng = parseFloat(top.lon)
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'Bad coordinates from provider' }, { status: 502 })
  }

  return NextResponse.json({ lat, lng })
}
