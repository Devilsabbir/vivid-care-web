import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgreementsClient from './AgreementsClient'

export default async function AgreementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // NDIS-only refactor: agreements are issued solely to NDIS clients, so we
  // no longer need to load staff at all. The agreement_templates target_type
  // column is retained for schema safety but every template/agreement created
  // here writes 'client'.
  const [
    { data: templates, error: templatesError },
    { data: agreements, error: agreementsError },
    { data: clients, error: clientsError },
  ] = await Promise.all([
    supabase.from('agreement_templates').select('*').order('created_at', { ascending: false }),
    supabase.from('agreements').select('*').eq('target_type', 'client').order('created_at', { ascending: false }),
    supabase.from('clients').select('id, full_name').eq('client_type', 'ndis').order('full_name', { ascending: true }),
  ])

  if (templatesError) console.error('[agreements page] agreement_templates fetch failed:', templatesError)
  if (agreementsError) console.error('[agreements page] agreements fetch failed:', agreementsError)
  if (clientsError) console.error('[agreements page] clients fetch failed:', clientsError)

  const schemaReady = !templatesError && !agreementsError && !clientsError

  return (
    <div className="space-y-6">
      <header>
        <h1
          className="m-0 text-[28px] font-bold leading-[1.15] text-[#1A1320]"
          style={{ letterSpacing: '-0.02em' }}
        >
          Agreements
        </h1>
        <p className="mt-1.5 text-[14px] text-[#6B6371]">
          Generate NDIS service agreements, capture signatures on the participant&apos;s phone, and monitor renewals.
        </p>
      </header>

      <AgreementsClient
        schemaReady={schemaReady}
        adminId={user?.id ?? ''}
        templates={templates ?? []}
        agreements={agreements ?? []}
        clients={clients ?? []}
      />
    </div>
  )
}
