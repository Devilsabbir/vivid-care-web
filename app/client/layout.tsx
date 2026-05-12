import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientHeader from '@/components/client/ClientHeader'
import ClientBottomNav from '@/components/client/ClientBottomNav'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let clientName = ''
  let unreadCount = 0
  const userId = user.id

  const [{ data: profile }, { count }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, client_id')
      .eq('id', user.id)
      .single(),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false),
  ])

  let isNdisClient = true // default to NDIS for safe rendering
  if (profile?.client_id) {
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('full_name, client_type')
      .eq('id', profile.client_id)
      .single()
    clientName = clientRecord?.full_name ?? profile?.full_name ?? ''
    isNdisClient = clientRecord?.client_type !== 'standard'
  } else {
    clientName = profile?.full_name ?? ''
  }

  unreadCount = count ?? 0

  return (
    <div className="min-h-screen bg-[#f6f2ea] text-[#0f172a]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.10),_transparent_58%),linear-gradient(180deg,_rgba(17,17,17,0.08),_transparent)]" />
      <ClientHeader clientName={clientName} initialUnreadCount={unreadCount} userId={userId} />

      <main className="relative mx-auto max-w-lg px-4 pb-28 pt-5">
        {children}
      </main>

      <ClientBottomNav isNdis={isNdisClient} />
    </div>
  )
}
