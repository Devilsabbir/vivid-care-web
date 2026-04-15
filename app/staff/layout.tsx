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
    <div className="min-h-screen bg-[#f6f2ea] text-[#171716]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(200,82,255,0.22),_transparent_58%),linear-gradient(180deg,_rgba(17,17,17,0.08),_transparent)]" />
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#171717]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
          <Link href="/staff/home" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#c852ff] text-[#171717] shadow-[0_8px_24px_rgba(200,82,255,0.28)]">
              <span className="material-symbols-outlined material-symbols-filled text-[20px]">favorite</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8f8a80]">Staff workspace</p>
              <p className="font-headline text-sm font-semibold text-white">Vivid Care</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/staff/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#f6f2ea] transition hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#c852ff] px-1 text-[10px] font-bold text-[#171717]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Link>

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white">
              {staffName?.charAt(0).toUpperCase() ?? 'S'}
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-lg px-4 pb-28 pt-5">
        {children}
      </main>

      <StaffBottomNav />
    </div>
  )
}
