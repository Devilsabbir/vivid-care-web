'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [errorCount, setErrorCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setErrorCount(c => c + 1)
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(160deg, #f7f9fb 0%, #e8f1f8 100%)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl primary-gradient mb-4">
            <span className="material-symbols-outlined material-symbols-filled text-white text-2xl">favorite</span>
          </div>
          <h1 className="text-2xl font-bold font-headline bg-gradient-to-br from-sky-900 to-sky-700 bg-clip-text text-transparent">
            Vivid Care
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-outline font-bold mt-1">Clinical Atelier</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-xl p-8 animate-fade-slide-up" style={{ boxShadow: '0 20px 40px rgba(25,28,30,0.08)' }}>
          <h2 className="text-xl font-bold font-headline text-on-surface mb-1">Welcome back</h2>
          <p className="text-sm text-on-surface-variant mb-6">Sign in to your account</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-b-2 focus:border-primary transition-all"
                placeholder="you@vividcare.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-b-2 focus:border-primary transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div key={errorCount} className="animate-shake flex items-center gap-2 text-error text-sm bg-error-container rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full primary-gradient text-on-primary font-semibold text-sm rounded-xl py-3 mt-2 flex items-center justify-center gap-2 disabled:opacity-60 transition-all duration-200 hover:scale-[1.01] hover:shadow-md"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  Signing in…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">login</span>
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-outline mt-6">
          Contact your administrator to get access
        </p>
      </div>
    </div>
  )
}
