import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientProfileClient from './ClientProfileClient'

export default async function ClientProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, email, client_id')
    .eq('id', user.id)
    .single()
  if (profileError) console.error('[client profile page] profile fetch failed:', profileError)

  const clientId = profile?.client_id

  let clientRecord: {
    full_name: string | null
    email: string | null
    phone: string | null
    address: string | null
    ndis_number: string | null
    emergency_contact: string | null
    date_of_birth: string | null
  } | null = null

  if (clientId) {
    const { data, error: clientError } = await supabase
      .from('clients')
      .select('full_name, email, phone, address, ndis_number, emergency_contact, date_of_birth')
      .eq('id', clientId)
      .single()
    if (clientError) console.error('[client profile page] client record fetch failed:', clientError)
    clientRecord = data
  }

  return (
    <ClientProfileClient
      clientName={clientRecord?.full_name ?? profile?.full_name ?? ''}
      email={clientRecord?.email ?? profile?.email ?? user.email ?? ''}
      phone={clientRecord?.phone ?? null}
      address={clientRecord?.address ?? null}
      ndisNumber={clientRecord?.ndis_number ?? null}
      emergencyContact={clientRecord?.emergency_contact ?? null}
      dateOfBirth={clientRecord?.date_of_birth ?? null}
    />
  )
}
