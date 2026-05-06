import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientHomeClient from './ClientHomeClient'

export default async function ClientHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, client_id')
    .eq('id', user.id)
    .single()
  if (profileError) console.error('[client home page] profile fetch failed:', profileError)

  const clientId = profile?.client_id
  if (!clientId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-[#1a1a18]">Account not linked</p>
          <p className="mt-2 text-sm text-[#8a877f]">
            Your portal account is not yet linked to a client record. Please contact Vivid Care.
          </p>
        </div>
      </div>
    )
  }

  const now = new Date().toISOString()

  const [
    { data: clientRecord, error: clientError },
    { data: upcomingShifts, error: shiftsError },
    { count: pendingCount, error: pendingError },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('full_name')
      .eq('id', clientId)
      .single(),
    supabase
      .from('shifts')
      .select('id, start_time, end_time, status, support_type, staff:profiles!staff_id(full_name)')
      .eq('client_id', clientId)
      .gte('start_time', now)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true })
      .limit(5),
    supabase
      .from('agreements')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', 'client')
      .eq('target_id', clientId)
      .eq('status', 'pending_signature'),
  ])

  if (clientError) console.error('[client home page] client record fetch failed:', clientError)
  if (shiftsError) console.error('[client home page] upcoming shifts fetch failed:', shiftsError)
  if (pendingError) console.error('[client home page] pending agreements count failed:', pendingError)

  return (
    <ClientHomeClient
      clientName={clientRecord?.full_name ?? profile?.full_name ?? ''}
      upcomingShifts={upcomingShifts ?? []}
      pendingAgreements={pendingCount ?? 0}
    />
  )
}
