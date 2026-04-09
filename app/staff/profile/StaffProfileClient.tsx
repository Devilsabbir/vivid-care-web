'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StaffProfileClient({ fullName, email }: { fullName: string; email: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex flex-col items-center pt-10 pb-6 px-6">
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full primary-gradient flex items-center justify-center text-white text-2xl font-bold font-headline mb-4">
        {fullName.charAt(0).toUpperCase()}
      </div>

      <h2 className="text-xl font-bold font-headline text-on-surface">{fullName}</h2>
      <p className="text-sm text-on-surface-variant mt-1 mb-8">{email}</p>

      <div className="w-full max-w-sm space-y-3">
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Full Name</p>
          <p className="text-sm font-semibold text-on-surface">{fullName}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Email</p>
          <p className="text-sm font-semibold text-on-surface">{email}</p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-sky-900/5 text-sky-900 font-headline text-sm font-bold border border-sky-900/10 hover:bg-sky-900/10 transition-colors mt-4"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Sign Out
        </button>
      </div>
    </div>
  )
}
