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
    <div className="min-h-screen bg-[#F7F5FA] text-[#1A1320]">
      <AdminSidebar adminName={adminName} />
      {/* Sidebar is 248px wide on lg+ — match the design spec. */}
      <div className="min-h-screen pl-0 pt-14 lg:pl-[248px] lg:pt-0">
        <AdminShell adminName={adminName} unreadCount={unreadCount}>
          <main>
            {/* Design spec: 28px padding top/bottom, 32px left/right, max 1400px content. */}
            <div className="mx-auto w-full max-w-[1400px] px-5 py-6 md:px-8 md:py-7">
              {children}
            </div>
          </main>
        </AdminShell>
      </div>
    </div>
  )
}
