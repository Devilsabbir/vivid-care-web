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
    <div className="min-h-screen bg-[#edecea] text-[#1a1a18]">
      <AdminSidebar adminName={adminName} />
      <main className="min-h-screen pl-[88px]">
        <div className="mx-auto w-full max-w-[1480px] px-4 py-6 md:px-6 md:py-7">
          {children}
        </div>
      </main>
    </div>
  )
}
