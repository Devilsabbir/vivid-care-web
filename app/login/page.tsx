'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ERROR_MESSAGES: Record<string, string> = {
  standard_client_no_access:
    'The client portal is only available to NDIS participants. Please contact Vivid Care if you believe this is an error.',
  client_not_linked:
    'Your account is not linked to a client record. Please contact Vivid Care.',
  staff_use_mobile_app:
    'Staff workflows have moved to the VividCare mobile app. Please sign in there instead — ask your administrator if you need a download link.',
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const errorCode = searchParams.get('error')
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      setError(ERROR_MESSAGES[errorCode])
    }
  }, [searchParams])

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, client_id')
        .eq('id', data.user.id)
        .single()

      const role = profile?.role

      // Staff workflows live in the mobile app — bounce off the web login.
      if (role === 'staff') {
        await supabase.auth.signOut()
        setError(ERROR_MESSAGES.staff_use_mobile_app)
        setLoading(false)
        return
      }

      // Client portal access is restricted to NDIS clients only.
      if (role === 'client') {
        if (!profile?.client_id) {
          await supabase.auth.signOut()
          setError(ERROR_MESSAGES.client_not_linked)
          setLoading(false)
          return
        }
        const { data: clientRecord } = await supabase
          .from('clients')
          .select('client_type')
          .eq('id', profile.client_id)
          .single()
        if (clientRecord?.client_type !== 'ndis') {
          await supabase.auth.signOut()
          setError(ERROR_MESSAGES.standard_client_no_access)
          setLoading(false)
          return
        }
      }

      const dest = role === 'admin' ? '/admin/dashboard' : '/client/home'
      router.push(dest)
      router.refresh()
    }
  }

  return (
    <div className="grid min-h-screen bg-[#F7F5FA] lg:grid-cols-[1fr_1.1fr]">
      {/* ── Left: form column ──────────────────────────────────────── */}
      <div className="flex flex-col bg-white px-6 py-8 md:px-14 md:py-12">
        {/* Brand */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="VividCare" className="h-14 w-auto" />
        </div>

        {/* Form wrapper — vertically centered, max 420px */}
        <div className="flex flex-1 flex-col justify-center self-center w-full max-w-[420px]">
          <h1
            className="m-0 text-[32px] font-bold text-[#1A1320]"
            style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            Welcome back
          </h1>
          <p className="mb-8 mt-2 text-[14.5px] leading-[1.4] text-[#6B6371]">
            Sign in to manage shifts, staff and care across your VividCare team.
          </p>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div className="mb-4">
              <label
                htmlFor="email"
                className="mb-2 block text-[11px] font-semibold uppercase text-[#3F3548]"
                style={{ letterSpacing: '0.08em' }}
              >
                Work email
              </label>
              <div className="flex h-[52px] items-center gap-2.5 rounded-[12px] border-[1.5px] border-[#E5E1E8] bg-white px-3.5 transition-all focus-within:border-[#6B2C91] focus-within:shadow-[0_0_0_4px_#F4ECF8]">
                <span className="flex text-[#97909C]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jamie@vividcare.com.au"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#1A1320] outline-none placeholder:text-[#C7C2CB]"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-4">
              <label
                htmlFor="password"
                className="mb-2 block text-[11px] font-semibold uppercase text-[#3F3548]"
                style={{ letterSpacing: '0.08em' }}
              >
                Password
              </label>
              <div className="flex h-[52px] items-center gap-2.5 rounded-[12px] border-[1.5px] border-[#E5E1E8] bg-white px-3.5 transition-all focus-within:border-[#6B2C91] focus-within:shadow-[0_0_0_4px_#F4ECF8]">
                <span className="flex text-[#97909C]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#1A1320] outline-none placeholder:text-[#C7C2CB]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="flex items-center justify-center p-1.5 text-[#97909C] hover:text-[#3F3548]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.36 6.16A10 10 0 0112 6c6.5 0 10 7 10 7a18.5 18.5 0 01-3.06 4.18M6.18 6.18A18 18 0 002 13s3.5 7 10 7c1.86 0 3.5-.54 4.93-1.34"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Keep signed in + forgot */}
            <div className="my-1 mb-6 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[#3F3548]">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  style={{ accentColor: '#6B2C91', width: 16, height: 16 }}
                />
                Keep me signed in
              </label>
              <a href="#" className="text-[13px] font-medium text-[#6B2C91] hover:underline">
                Forgot password?
              </a>
            </div>

            {/* Error */}
            {error ? (
              <div className="mb-4 rounded-[12px] bg-[#FCE7E7] px-4 py-3 text-[13px] font-medium leading-[1.4] text-[#991b1b]">
                {error}
              </div>
            ) : null}

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#6B2C91] text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(107,44,145,0.25)] transition-all hover:bg-[#54206F] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14M13 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            className="my-7 flex items-center gap-3.5 text-[11.5px] font-medium uppercase text-[#97909C]"
            style={{ letterSpacing: '0.08em' }}
          >
            <span className="h-px flex-1 bg-[#F1EEF4]" />
            or continue with
            <span className="h-px flex-1 bg-[#F1EEF4]" />
          </div>

          {/* SSO row — visually identical to design; wired as no-ops for now
              since we haven't enabled OAuth providers yet. */}
          <div className="flex gap-2.5">
            <SsoButton
              onClick={() => setError('Single sign-on with Google is not yet enabled — please use email + password.')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.1A6.61 6.61 0 015.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A11 11 0 001 12c0 1.77.43 3.45 1.18 4.93l3.66-2.83z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </SsoButton>
            <SsoButton
              onClick={() => setError('Single sign-on with Apple is not yet enabled — please use email + password.')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                <path d="M16.5 1.5c0 1.1-.5 2.2-1.3 3-.8.8-2 1.4-3 1.3-.1-1.1.4-2.2 1.2-3 .9-.9 2-1.4 3.1-1.3zm3.4 16.4c-.5 1.2-1 2.2-1.6 3.1-.9 1.3-2.1 2.9-3.6 3-1.4 0-1.8-.9-3.7-.9s-2.3.9-3.7.9c-1.5-.1-2.7-1.6-3.6-2.9-1.9-2.7-3.4-7.7-1.4-11 1-1.7 2.7-2.8 4.6-2.8 1.5 0 2.8.9 3.7.9.9 0 2.5-1.1 4.3-1 .7 0 2.8.3 4.1 2.2-3.6 2.1-3 7.3-.1 8.5z" />
              </svg>
              Apple
            </SsoButton>
            <SsoButton
              onClick={() => setError('Single sign-on with Microsoft is not yet enabled — please use email + password.')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="M11.5 2H2v9.5h9.5V2zm10.5 0h-9.5v9.5H22V2zM11.5 12.5H2V22h9.5v-9.5zm10.5 0h-9.5V22H22v-9.5z"
                  fill="#0078D4"
                />
              </svg>
              Microsoft
            </SsoButton>
          </div>

          {/* Foot */}
          <div className="mt-8 border-t border-[#F1EEF4] pt-5 text-center text-[12.5px] font-medium leading-[1.5] text-[#6B6371]">
            New to VividCare?{' '}
            <a href="mailto:hello@vividcare.com.au" className="text-[#6B2C91] no-underline hover:underline">
              Talk to sales
            </a>{' '}
            · By signing in you agree to our{' '}
            <a href="#" className="text-[#6B2C91] no-underline hover:underline">
              terms
            </a>
            .
          </div>
        </div>
      </div>

      {/* ── Right: brand side panel ────────────────────────────────── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-14 text-white lg:flex"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, #8A3CB5 0%, #6B2C91 38%, #3E1860 78%, #1E0B30 100%)',
        }}
      >
        {/* Blue glow blob top-right */}
        <div
          className="pointer-events-none absolute"
          style={{
            top: -150,
            right: -100,
            width: 380,
            height: 380,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(43,174,224,0.35), rgba(43,174,224,0) 65%)',
            filter: 'blur(6px)',
          }}
        />
        {/* Green glow blob bottom-left */}
        <div
          className="pointer-events-none absolute"
          style={{
            bottom: -180,
            left: -120,
            width: 420,
            height: 420,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(141,198,63,0.3), rgba(141,198,63,0) 65%)',
            filter: 'blur(10px)',
          }}
        />
        {/* Dot grid texture */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.1,
            maskImage:
              'radial-gradient(ellipse at center, black 35%, transparent 78%)',
            WebkitMaskImage:
              'radial-gradient(ellipse at center, black 35%, transparent 78%)',
          }}
        />

        {/* Content */}
        <div className="relative z-[2] flex flex-1 max-w-[520px] flex-col justify-center gap-10">
          <div
            className="text-[12px] font-semibold uppercase opacity-70"
            style={{ letterSpacing: '0.28em' }}
          >
            VividCare · Admin Console
          </div>
          <h2
            className="m-0 text-[44px] font-bold"
            style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            Empowering{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #8DC63F 0%, #2BAEE0 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              every shift
            </span>
            , every carer, every client.
          </h2>

          <div className="grid grid-cols-3 gap-5 border-t border-white/15 pt-6">
            <Stat value="2,940h" label={<>Care delivered<br />in Perth this quarter</>} />
            <Stat value="42" label={<>Active clients<br />across WA</>} />
            <Stat value="99.2%" label={<>Incident-free<br />shifts</>} />
          </div>
        </div>

        {/* Floating glass cards */}
        <FloatCard className="top-[80px] right-[-10px] w-[240px]" delay="0s">
          <div className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 rounded-full bg-[#8DC63F]"
              style={{ boxShadow: '0 0 0 4px rgba(141,198,63,0.3)' }}
            />
            <span className="text-[12px] font-semibold leading-none">Sarah Morrison</span>
            <span className="ml-auto font-mono text-[10px] leading-none opacity-70">on shift</span>
          </div>
          <div className="mt-2 text-[11px] font-medium leading-[1.4] opacity-70">
            Margaret Adelaide · Subiaco
            <br />
            9:00 – 11:00 AM · Personal care
          </div>
        </FloatCard>

        <FloatCard className="bottom-[140px] right-[40px] w-[260px]" delay="1.5s">
          <div className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: 'linear-gradient(135deg, #8DC63F, #2BAEE0)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" />
              </svg>
            </span>
            <span className="text-[12px] font-semibold leading-none">Vivi · AI Guide</span>
          </div>
          <div className="mt-2 text-[11px] font-medium leading-[1.4] opacity-70">
            “Aiyana&apos;s incident report needs filing before Thursday.”
          </div>
        </FloatCard>

        <FloatCard className="top-[200px] right-[200px] w-[180px]" delay="3s">
          <div
            className="text-[10px] font-medium uppercase leading-none opacity-60"
            style={{ letterSpacing: '0.08em' }}
          >
            This week
          </div>
          <div
            className="mt-1.5 text-[22px] font-bold leading-none"
            style={{ letterSpacing: '-0.02em' }}
          >
            $24,820
          </div>
          <div className="mt-1.5 text-[10px] font-medium leading-none text-[#8DC63F] opacity-90">
            ↑ 12% vs avg
          </div>
        </FloatCard>

        {/* Side foot */}
        <div className="relative z-[2] flex items-center justify-between text-[12px] font-medium opacity-55">
          <span>© 2026 VividCare Pty Ltd · Perth WA</span>
          <span>v2.4</span>
        </div>
      </div>

      {/* Float animation keyframes — injected once via global style */}
      <style jsx global>{`
        @keyframes vc-float-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

function SsoButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[46px] flex-1 items-center justify-center gap-2.5 rounded-[12px] border-[1.5px] border-[#E5E1E8] bg-white text-[13.5px] font-medium text-[#3F3548] transition-all hover:border-[#C7C2CB] hover:bg-[#F8F6FA]"
    >
      {children}
    </button>
  )
}

function Stat({ value, label }: { value: string; label: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-[28px] font-bold leading-none"
        style={{
          letterSpacing: '-0.02em',
          background:
            'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.7) 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {value}
      </div>
      <div className="mt-2 text-[12px] font-medium leading-[1.3] opacity-60">{label}</div>
    </div>
  )
}

function FloatCard({
  children,
  className = '',
  delay = '0s',
}: {
  children: React.ReactNode
  className?: string
  delay?: string
}) {
  return (
    <div
      className={`absolute z-[1] rounded-[14px] px-4 py-3.5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] ${className}`}
      style={{
        background: 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.15)',
        animation: `vc-float-y 5s ease-in-out infinite`,
        animationDelay: delay,
      }}
    >
      {children}
    </div>
  )
}
