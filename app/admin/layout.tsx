import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminShell from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let adminName = ''
  let unreadCount = 0
  if (user) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false),
    ])
    adminName = profile?.full_name ?? user.email ?? ''
    unreadCount = count ?? 0
  }

  return (
    <div className="min-h-screen bg-[#f7f8f9] text-[#0f172a]">
      <AdminSidebar adminName={adminName} />
      <div className="min-h-screen pl-0 pt-14 lg:pl-[232px] lg:pt-0">
        <AdminShell adminName={adminName} unreadCount={unreadCount}>
          <main>
            <div className="mx-auto w-full max-w-[1480px] px-4 py-6 md:px-6 md:py-7">
              {children}
            </div>
          </main>
        </AdminShell>
      </div>
    </div>
  )
}
