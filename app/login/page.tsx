'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
        .select('role')
        .eq('id', data.user.id)
        .single()

      router.push(profile?.role === 'admin' ? '/admin/dashboard' : '/staff/home')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#edecea]">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden bg-[#1a1a18] px-6 py-10 text-white md:px-10 lg:px-14">
          <div className="absolute left-[-4rem] top-[-3rem] h-40 w-40 rounded-full bg-[#cdff52]/16 blur-3xl" />
          <div className="absolute bottom-[-5rem] right-[-3rem] h-56 w-56 rounded-full bg-white/6 blur-3xl" />

          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#cdff52] text-[#1a1a18] shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
                <span className="material-symbols-outlined material-symbols-filled text-[28px]">favorite</span>
              </div>

              <div className="space-y-4">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/65">
                  Care operations platform
                </p>
                <h1 className="max-w-[24rem] text-[2.8rem] font-medium leading-[0.95] tracking-[-0.07em] md:text-[3.5rem]">
                  <span className="font-headline">Vivid Care</span>
                </h1>
                <p className="max-w-[26rem] text-base leading-7 text-white/72">
                  Workforce rostering, live attendance, compliance, and service documentation for disability and support care teams.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:max-w-[30rem]">
              <FeatureCard
                title="Command center admin"
                copy="Monitor shifts, review compliance, and coordinate incidents from one desktop-first workspace."
              />
              <FeatureCard
                title="Mobile staff flow"
                copy="Clock in with geofence checks, finish required documentation, and stay on top of today’s support work."
              />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 md:px-10">
          <div className="w-full max-w-md rounded-[28px] border border-[#e8e4dc] bg-white p-8 shadow-[0_20px_50px_rgba(26,26,24,0.08)] md:p-10">
            <div className="mb-8">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8f8c84]">Welcome back</p>
              <h2 className="mt-3 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18]">
                <span className="font-headline">Sign in</span>
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6c6b66]">
                Use your Vivid Care account to open the admin dashboard or staff mobile workspace.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@vividcare.com"
              />
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
              />

              {error ? (
                <div className="rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in to Vivid Care'}
              </button>
            </form>

            <div className="mt-6 rounded-[18px] bg-[#faf9f6] p-4 text-[12px] leading-6 text-[#66635b]">
              Contact your administrator if you need access or your temporary password reset.
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        required
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
      />
    </div>
  )
}

function FeatureCard({
  title,
  copy,
}: {
  title: string
  copy: string
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/65">{copy}</p>
    </div>
  )
}
