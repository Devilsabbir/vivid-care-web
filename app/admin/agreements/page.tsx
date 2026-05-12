import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgreementsClient from './AgreementsClient'

export default async function AgreementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: templates, error: templatesError },
    { data: agreements, error: agreementsError },
    { data: staff, error: staffError },
    { data: clients, error: clientsError },
  ] = await Promise.all([
    supabase.from('agreement_templates').select('*').order('created_at', { ascending: false }),
    supabase.from('agreements').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, role').in('role', ['admin', 'staff']).order('full_name', { ascending: true }),
    supabase.from('clients').select('id, full_name').eq('client_type', 'ndis').order('full_name', { ascending: true }),
  ])

  if (templatesError) console.error('[agreements page] agreement_templates fetch failed:', templatesError)
  if (agreementsError) console.error('[agreements page] agreements fetch failed:', agreementsError)
  if (staffError) console.error('[agreements page] profiles fetch failed:', staffError)
  if (clientsError) console.error('[agreements page] clients fetch failed:', clientsError)

  const schemaReady = !templatesError && !agreementsError && !staffError && !clientsError

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#0f172a] md:text-[2.35rem]">
            <span className="font-headline">Agreements</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#0d9488] px-4 py-1 text-sm font-semibold tracking-normal text-[#0f172a]">
              <span className="material-symbols-outlined text-[18px]">draw</span>
              signatures
            </span>
          </div>
          <div className="text-[2rem] font-medium tracking-[-0.05em] text-[#0f172a] md:text-[2.35rem]">
            <span className="font-headline">template and capture hub</span>
          </div>
          <p className="text-sm text-[#64748b]">
            Generate agreements, capture signatures on-device, and monitor renewals.
          </p>
        </div>
      </header>

      <AgreementsClient
        schemaReady={schemaReady}
        adminId={user?.id ?? ''}
        templates={templates ?? []}
        agreements={agreements ?? []}
        staff={staff ?? []}
        clients={clients ?? []}
      />
    </div>
  )
}
