// app/sign-inperson/[id]/page.tsx

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import InPersonSignClient from './InPersonSignClient'

export default async function InPersonSignPage({
  params,
}: {
  params: { id: string }
}) {
  // Verify admin session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/login')

  // Load agreement with service role so we get all fields
  const service = createServiceClient()
  const { data: agreement, error } = await service
    .from('agreements')
    .select('id, title, status, expires_on, clients(full_name)')
    .eq('id', params.id)
    .single()

  if (error || !agreement) return notFound()

  const participantName =
    (agreement.clients as any)?.full_name ?? 'Participant'

  return (
    <div className="min-h-screen bg-[#edecea]">
      <InPersonSignClient
        agreementId={agreement.id}
        agreementTitle={agreement.title}
        participantName={participantName}
        status={agreement.status}
        expiresOn={agreement.expires_on ?? null}
      />
    </div>
  )
}
