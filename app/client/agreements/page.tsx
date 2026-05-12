import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VIVID_CARE } from '@/lib/agreements/constants'
import ClientAgreementsClient from './ClientAgreementsClient'

export default async function ClientAgreementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()
  if (profileError) console.error('[client agreements page] profile fetch failed:', profileError)

  const clientId = profile?.client_id
  if (!clientId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-[#0f172a]">Account not linked</p>
          <p className="mt-2 text-sm text-[#64748b]">
            Your portal account is not yet linked to a client record. Please contact Vivid Care.
          </p>
        </div>
      </div>
    )
  }

  const [
    { data: agreements, error: agreementsError },
    { data: orgSettings, error: orgError },
    { data: clientRecord, error: clientRecordError },
  ] = await Promise.all([
    supabase
      .from('agreements')
      .select('id, title, status, expires_on, signed_at, signature_data_url, pdf_url, signing_token, signer_name, advocate_name, supports_description, funding_type, payment_method, created_at, target_id')
      .eq('target_type', 'client')
      .eq('target_id', clientId)
      .order('created_at', { ascending: false }),
    supabase
      .from('organization_settings')
      .select('org_name, business_email, business_phone, address, ndis_provider_number')
      .single(),
    supabase
      .from('clients')
      .select('full_name, client_type')
      .eq('id', clientId)
      .single(),
  ])

  if (agreementsError) console.error('[client agreements page] agreements fetch failed:', agreementsError)
  if (orgError) console.error('[client agreements page] org settings fetch failed:', orgError)
  if (clientRecordError) console.error('[client agreements page] client record fetch failed:', clientRecordError)

  // Build provider details from org settings, falling back to constants
  const provider = {
    name: orgSettings?.org_name ?? VIVID_CARE.name,
    email: orgSettings?.business_email ?? VIVID_CARE.email,
    phone: orgSettings?.business_phone ?? VIVID_CARE.phone,
    address: orgSettings?.address ?? VIVID_CARE.address,
    ndisRegistration: orgSettings?.ndis_provider_number ?? VIVID_CARE.ndisRegistration,
    abn: VIVID_CARE.abn,
    contactName: VIVID_CARE.contactName,
    website: VIVID_CARE.website,
  }

  // Standard (non-NDIS) clients do not have service agreements
  if (clientRecord?.client_type === 'standard') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
        <div>
          <span className="material-symbols-outlined text-[48px] text-[#94a3b8]">draw</span>
          <p className="mt-3 text-lg font-semibold text-[#0f172a]">Not applicable</p>
          <p className="mt-2 text-sm text-[#64748b]">
            Service agreements and digital signatures are only required for NDIS participants.
            Your account is registered as a standard client.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ClientAgreementsClient
      agreements={agreements ?? []}
      participantName={clientRecord?.full_name ?? ''}
      provider={provider}
    />
  )
}
