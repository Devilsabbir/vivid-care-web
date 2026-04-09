import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let adminName = ''
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    adminName = profile?.full_name ?? user.email ?? ''
  }

  return (
    <div className="min-h-screen bg-surface">
      <AdminSidebar adminName={adminName} />
      <main className="ml-64 min-h-screen px-8 py-8">
        {children}
      </main>
    </div>
  )
}
