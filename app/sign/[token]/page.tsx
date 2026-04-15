// app/sign/[token]/page.tsx

import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import SignClient from './SignClient'

export default async function PublicSignPage({
  params,
}: {
  params: { token: string }
}) {
  const service = createServiceClient()

  const { data: agreement, error } = await service
    .from('agreements')
    .select('id, title, status, expires_on, signing_token, clients(full_name)')
    .eq('signing_token', params.token)
    .single()

  if (error || !agreement) return notFound()

  const participantName =
    (agreement.clients as any)?.full_name ?? 'Participant'

  return (
    <div className="min-h-screen bg-[#edecea]">
      <SignClient
        token={params.token}
        agreementTitle={agreement.title}
        participantName={participantName}
        status={agreement.status}
        expiresOn={agreement.expires_on ?? null}
      />
    </div>
  )
}
