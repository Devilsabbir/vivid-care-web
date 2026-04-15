import { createClient } from '@/lib/supabase/server'
import StaffDocumentationClient from './StaffDocumentationClient'

export default async function StaffDocumentationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('id, client_id, title, start_time, end_time, status, documentation_status, support_type_key, clients(full_name)')
    .eq('staff_id', user!.id)
    .in('status', ['active', 'completed'])
    .gte('start_time', since.toISOString())
    .order('start_time', { ascending: false })

  const shiftIds = (shifts ?? []).map(shift => shift.id)

  const [
    { data: docs, error: docsError },
    { data: requirements, error: requirementsError },
    { data: fields, error: fieldsError },
  ] = await Promise.all([
    shiftIds.length
      ? supabase.from('shift_documentation').select('*').in('shift_id', shiftIds).order('submitted_at', { ascending: false })
      : Promise.resolve({ data: [] as any[], error: null }),
    supabase.from('ndis_doc_requirements').select('*').order('support_type_key', { ascending: true }).order('label', { ascending: true }),
    supabase.from('ndis_form_fields').select('*').order('display_order', { ascending: true }),
  ])

  const schemaReady = !shiftsError && !docsError && !requirementsError && !fieldsError

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#171717] px-5 py-5 text-white shadow-[0_24px_44px_rgba(23,23,22,0.18)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8f8a80]">Service documentation</p>
        <h1 className="mt-3 font-headline text-[1.85rem] font-semibold leading-none tracking-[-0.05em]">Complete required records</h1>
        <p className="mt-3 text-sm leading-6 text-[#d1ccc3]">
          Finish your post-shift NDIS forms here so the shift can be marked fully documented.
        </p>
      </section>

      <StaffDocumentationClient
        schemaReady={schemaReady}
        staffId={user!.id}
        shifts={shifts ?? []}
        docs={docs ?? []}
        requirements={requirements ?? []}
        fields={fields ?? []}
      />
    </div>
  )
}
