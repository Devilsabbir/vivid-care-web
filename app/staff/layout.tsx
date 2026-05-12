import { createClient } from '@/lib/supabase/server'
import StaffBottomNav from '@/components/staff/StaffBottomNav'
import StaffHeader from '@/components/staff/StaffHeader'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let staffName = ''
  let unreadCount = 0
  const userId = user?.id ?? ''
  if (user) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
    ])
    staffName = profile?.full_name ?? ''
    unreadCount = count ?? 0
  }

  return (
    <div className="min-h-screen bg-[#f6f2ea] text-[#0f172a]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.10),_transparent_58%),linear-gradient(180deg,_rgba(17,17,17,0.08),_transparent)]" />
      <StaffHeader staffName={staffName} initialUnreadCount={unreadCount} userId={userId} />

      <main className="relative mx-auto max-w-lg px-4 pb-28 pt-5">
        {children}
      </main>

      <StaffBottomNav />
    </div>
  )
}
