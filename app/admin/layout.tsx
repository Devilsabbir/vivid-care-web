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
    // Mixing the design's class names with a fixed-positioned sidebar:
    // CSS grid on .adm caused .adm-main to land in column 1 because the
    // mobile chrome (fixed top bar + drawer) was still consuming grid
    // cells. Sticking with a fixed sidebar + left-padding on main is
    // simpler and matches the design's pixel layout (248px column).
    <div
      className="min-h-screen"
      style={{ background: 'var(--app-bg)', color: 'var(--slate-900)', fontFamily: 'var(--ff-sans)' }}
    >
      <AdminSidebar adminName={adminName} />
      <div className="adm-main min-h-screen pt-14 lg:pt-0 lg:pl-[248px]">
        <AdminShell adminName={adminName} unreadCount={unreadCount}>
          {/* mx-auto centres the .adm-page within .adm-main on screens
              wider than its 1400px max-width — without this the page
              sticks to the left edge of the content area. */}
          <main className="adm-page mx-auto">{children}</main>
        </AdminShell>
      </div>
    </div>
  )
}
