import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  // ── Defensive: if Supabase env vars are missing, fail OPEN.
  // Without these, every server-side query throws and the auth gates can't run.
  // Letting traffic through is safer than redirect-looping users into /login.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[middleware] Supabase env vars missing — auth gates skipped')
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Defensive: any Supabase error during the auth check should NOT redirect.
  // Better to fall through to the public routing rules than to loop.
  let user: { id: string } | null = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch (err) {
    console.error('[middleware] supabase.auth.getUser() threw:', err)
    return supabaseResponse
  }

  // Public routes — /sign/ covers /sign/[token] (public agreement links) but NOT /sign-inperson (admin-only)
  if (pathname.startsWith('/login') || pathname.startsWith('/api') || pathname.startsWith('/sign/')) {
    if (user && pathname === '/login') {
      // Redirect logged-in users away from login — but only if they have valid access.
      // Standard (non-NDIS) clients should stay on /login since they cannot access the portal.
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, client_id')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'client') {
        if (!profile.client_id) return supabaseResponse
        const { data: clientRecord } = await supabase
          .from('clients')
          .select('client_type')
          .eq('id', profile.client_id)
          .single()
        if (clientRecord?.client_type !== 'ndis') return supabaseResponse
      }

      // Staff role: web portal retired — keep them on /login so they see the
      // "use the mobile app" message instead of trying to forward to a
      // nonexistent /staff/home.
      if (profile?.role === 'staff') return supabaseResponse

      const dest =
        profile?.role === 'admin' ? '/admin/dashboard' :
        profile?.role === 'client' ? '/client/home' :
        '/login'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return supabaseResponse
  }

  // Not logged in — send to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Get role + linked client_id (used for NDIS gate on the client portal).
  // If the query fails OR the profile row is missing OR role is anything other
  // than the three known values, treat the user as having no valid role and
  // bounce them to /login. This prevents the redirect-ping-pong loop that
  // happens when role is undefined and falls through every role check.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, client_id')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[middleware] profile fetch failed:', profileError)
  }

  const role = profile?.role
  if (role !== 'admin' && role !== 'staff' && role !== 'client') {
    // Broken / incomplete session — sign out and send to login.
    await supabase.auth.signOut()
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // The web staff portal has been retired — staff now use the mobile app.
  // When a staff-role user lands anywhere on the web, sign them out and bounce
  // to /login with an explanatory error code. signOut() clears cookies via the
  // setAll callback above; carry them onto the redirect so the next request
  // doesn't keep the stale session.
  if (role === 'staff') {
    await supabase.auth.signOut()
    const redirectResponse = NextResponse.redirect(
      new URL('/login?error=staff_use_mobile_app', request.url),
    )
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // For client-role users, look up client_type to enforce the NDIS-only portal rule.
  // Use whitelist semantics: only client_type === 'ndis' is allowed in.
  let clientIsNdis = false
  if (role === 'client') {
    if (profile?.client_id) {
      const { data: clientRecord } = await supabase
        .from('clients')
        .select('client_type')
        .eq('id', profile.client_id)
        .single()
      clientIsNdis = clientRecord?.client_type === 'ndis'
    }

    if (!clientIsNdis) {
      // Standard client (or unlinked) — sign out and bounce to login with explanation.
      // signOut() clears cookies on supabaseResponse via the setAll callback. We
      // must copy those Set-Cookie headers onto the redirect, otherwise the next
      // request still carries the stale session and the user loops.
      await supabase.auth.signOut()
      const errorCode = profile?.client_id ? 'standard_client_no_access' : 'client_not_linked'
      const redirectResponse = NextResponse.redirect(new URL(`/login?error=${errorCode}`, request.url))
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      return redirectResponse
    }
  }

  // Root redirect — only admin and client roles reach here (staff was bounced above).
  if (pathname === '/') {
    const dest = role === 'admin' ? '/admin/dashboard' : '/client/home'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Role enforcement
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/client/home', request.url))
  }
  if (pathname.startsWith('/client') && role !== 'client') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
