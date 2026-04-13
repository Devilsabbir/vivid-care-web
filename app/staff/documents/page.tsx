import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DocumentsClient from './DocumentsClient'

export default async function StaffDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: myDocs } = await supabase
    .from('documents')
    .select('*')
    .eq('owner_id', user!.id)
    .eq('owner_type', 'staff')
    .order('created_at', { ascending: false })

  const { data: shifts } = await supabase
    .from('shifts')
    .select('client_id, clients(id, full_name)')
    .eq('staff_id', user!.id)
    .not('client_id', 'is', null)

  const uniqueClients = Object.values(
    (shifts ?? []).reduce((acc: any, shift: any) => {
      if (shift.clients) acc[shift.client_id] = shift.clients
      return acc
    }, {}),
  )

  const clientIds = uniqueClients.map((client: any) => client.id)
  const { data: clientDocs } = clientIds.length > 0
    ? await supabase.from('documents').select('*').in('owner_id', clientIds).eq('owner_type', 'client').order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#171717] px-5 py-5 text-white shadow-[0_24px_44px_rgba(23,23,22,0.18)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8f8a80]">Documents</p>
        <h1 className="mt-3 font-headline text-[1.85rem] font-semibold leading-none tracking-[-0.05em]">Stay compliance ready</h1>
        <p className="mt-3 text-sm leading-6 text-[#d1ccc3]">
          Upload your own certificates and review client-facing paperwork in one place.
        </p>
        <Link
          href="/staff/documentation"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#cdff52] px-4 py-2 text-sm font-semibold text-[#171716]"
        >
          Open service documentation
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </section>

      <DocumentsClient
        myDocs={myDocs ?? []}
        clientDocs={clientDocs ?? []}
        clients={uniqueClients as any[]}
        staffId={user!.id}
      />
    </div>
  )
}
