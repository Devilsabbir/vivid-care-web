import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminShell from '@/components/admin/AdminShell'
// Pull in the design-handoff CSS so .adm-*, .vc-*, .pill, .donut etc.
// classes are available across every admin page. Scoped to /admin/* only.
import '@/styles/vc-design.css'

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
    // .adm wrapper from the design handoff — CSS grid with a 248px
    // sidebar column on lg+, single-column below. The actual sidebar +
    // mobile drawer logic still lives in <AdminSidebar />; this wrapper
    // just provides the layout grid and the warm app background.
    <div className="adm" style={{ background: 'var(--app-bg)' }}>
      <AdminSidebar adminName={adminName} />
      <div className="adm-main pt-14 lg:pt-0">
        <AdminShell adminName={adminName} unreadCount={unreadCount}>
          <main className="adm-page">{children}</main>
        </AdminShell>
      </div>
    </div>
  )
}
