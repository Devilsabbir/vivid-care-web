import { createClient } from '@/lib/supabase/server'
import DocumentsClient from './DocumentsClient'

export default async function StaffDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Personal docs
  const { data: myDocs } = await supabase
    .from('documents')
    .select('*')
    .eq('owner_id', user!.id)
    .eq('owner_type', 'staff')
    .order('created_at', { ascending: false })

  // Clients assigned to this staff
  const { data: shifts } = await supabase
    .from('shifts')
    .select('client_id, clients(id, full_name)')
    .eq('staff_id', user!.id)
    .not('client_id', 'is', null)

  const uniqueClients = Object.values(
    (shifts ?? []).reduce((acc: any, s: any) => {
      if (s.clients) acc[s.client_id] = s.clients
      return acc
    }, {})
  )

  // Client docs
  const clientIds = uniqueClients.map((c: any) => c.id)
  const { data: clientDocs } = clientIds.length > 0
    ? await supabase.from('documents').select('*').in('owner_id', clientIds).eq('owner_type', 'client').order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold font-headline text-on-surface">Documents</h2>
        <p className="text-on-surface-variant text-sm mt-0.5">Your compliance documents & client agreements</p>
      </div>
      <DocumentsClient
        myDocs={myDocs ?? []}
        clientDocs={clientDocs ?? []}
        clients={uniqueClients as any[]}
        staffId={user!.id}
      />
    </div>
  )
}
