import { createClient } from '@/lib/supabase/server'
import DocumentationAdminClient from './DocumentationAdminClient'

export default async function ServiceDocumentationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: shifts, error: shiftsError },
    { data: docs, error: docsError },
    { data: supportTypes, error: supportTypesError },
    { data: requirements, error: requirementsError },
  ] = await Promise.all([
    supabase
      .from('shifts')
      .select('id, staff_id, client_id, title, start_time, end_time, status, support_type_key, documentation_status, profiles!shifts_staff_id_fkey(full_name), clients(full_name)')
      .order('start_time', { ascending: false })
      .limit(50),
    supabase
      .from('shift_documentation')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(50),
    supabase.from('ndis_support_types').select('*').order('title', { ascending: true }),
    supabase.from('ndis_doc_requirements').select('*').order('support_type_key', { ascending: true }).order('label', { ascending: true }),
  ])

  const schemaReady = !shiftsError && !docsError && !supportTypesError && !requirementsError

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">Service documentation</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#c852ff] px-4 py-1 text-sm font-semibold tracking-normal text-[#1a1a18]">
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              NDIS engine
            </span>
          </div>
          <div className="text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">review and approval workspace</span>
          </div>
          <p className="text-sm text-[#6c6b66]">
            Track required post-shift records, review submissions, and approve compliance documentation.
          </p>
        </div>
      </header>

      <DocumentationAdminClient
        schemaReady={schemaReady}
        adminId={user?.id ?? ''}
        shifts={shifts ?? []}
        docs={docs ?? []}
        supportTypes={supportTypes ?? []}
        requirements={requirements ?? []}
      />
    </div>
  )
}
