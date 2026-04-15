import { createClient } from '@/lib/supabase/server'
import AgreementsClient from './AgreementsClient'

export default async function AgreementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: templates, error: templatesError },
    { data: agreements, error: agreementsError },
    { data: staff, error: staffError },
    { data: clients, error: clientsError },
  ] = await Promise.all([
    supabase.from('agreement_templates').select('*').order('created_at', { ascending: false }),
    supabase.from('agreements').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, role').in('role', ['admin', 'staff']).order('full_name', { ascending: true }),
    supabase.from('clients').select('id, full_name').order('full_name', { ascending: true }),
  ])

  const schemaReady = !templatesError && !agreementsError && !staffError && !clientsError

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">Agreements</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#c852ff] px-4 py-1 text-sm font-semibold tracking-normal text-[#1a1a18]">
              <span className="material-symbols-outlined text-[18px]">draw</span>
              signatures
            </span>
          </div>
          <div className="text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">template and capture hub</span>
          </div>
          <p className="text-sm text-[#6c6b66]">
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
