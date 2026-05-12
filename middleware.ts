import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

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

      const dest =
        profile?.role === 'admin' ? '/admin/dashboard' :
        profile?.role === 'client' ? '/client/home' :
        '/staff/home'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return supabaseResponse
  }

  // Not logged in — send to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Get role + linked client_id (used for NDIS gate on the client portal)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, client_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role

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
      await supabase.auth.signOut()
      const errorCode = profile?.client_id ? 'standard_client_no_access' : 'client_not_linked'
      return NextResponse.redirect(new URL(`/login?error=${errorCode}`, request.url))
    }
  }

  // Root redirect
  if (pathname === '/') {
    const dest =
      role === 'admin' ? '/admin/dashboard' :
      role === 'client' ? '/client/home' :
      '/staff/home'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Role enforcement
  if (pathname.startsWith('/admin') && role !== 'admin') {
    const dest = role === 'client' ? '/client/home' : '/staff/home'
    return NextResponse.redirect(new URL(dest, request.url))
  }
  if (pathname.startsWith('/staff') && role !== 'staff') {
    const dest = role === 'admin' ? '/admin/dashboard' : '/client/home'
    return NextResponse.redirect(new URL(dest, request.url))
  }
  if (pathname.startsWith('/client') && role !== 'client') {
    const dest = role === 'admin' ? '/admin/dashboard' : '/staff/home'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
