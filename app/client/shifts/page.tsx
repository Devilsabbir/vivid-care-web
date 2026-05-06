import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientShiftsClient from './ClientShiftsClient'

export default async function ClientShiftsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()
  if (profileError) console.error('[client shifts page] profile fetch failed:', profileError)

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

  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('id, start_time, end_time, status, support_type, notes, staff:profiles!staff_id(full_name)')
    .eq('client_id', clientId)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: false })
  if (shiftsError) console.error('[client shifts page] shifts fetch failed:', shiftsError)

  return <ClientShiftsClient shifts={shifts ?? []} />
}
