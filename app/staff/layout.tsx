import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import StaffBottomNav from '@/components/staff/StaffBottomNav'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let staffName = ''
  let unreadCount = 0
  if (user) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
    ])
    staffName = profile?.full_name ?? ''
    unreadCount = count ?? 0
  }

  return (
    <div className="min-h-screen bg-surface pb-20">
      {/* Top Header */}
      <header className="glass-header sticky top-0 z-40 h-14 flex items-center justify-between px-5 border-b border-outline-variant/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 primary-gradient rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-sm material-symbols-filled">favorite</span>
          </div>
          <span className="font-bold font-headline text-sky-900 text-base">Vivid Care</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/staff/notifications" className="relative p-2 rounded-full hover:bg-surface-container transition-colors text-outline">
            <span className="material-symbols-outlined text-xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-surface" />
            )}
          </Link>
          <div className="w-8 h-8 bg-secondary-fixed rounded-full flex items-center justify-center text-secondary font-bold text-sm">
            {staffName?.charAt(0) ?? 'S'}
          </div>
        </div>
      </header>

      <main className="px-5 py-6">
        {children}
      </main>

      <StaffBottomNav />
    </div>
  )
}
