// app/api/agreements/sign/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import AgreementPDF from '@/components/agreements/AgreementPDF'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function POST(request: NextRequest) {
  let body: {
    token?: string
    id?: string
    signerName: string
    signatureDataUrl: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { token, id, signerName, signatureDataUrl } = body

  if (!signerName?.trim()) {
    return NextResponse.json({ error: 'signerName is required' }, { status: 400 })
  }
  if (!signatureDataUrl?.startsWith('data:image/')) {
    return NextResponse.json({ error: 'signatureDataUrl is required' }, { status: 400 })
  }
  if (!token && !id) {
    return NextResponse.json({ error: 'token or id is required' }, { status: 400 })
  }

  const service = createServiceClient()
  let agreement: Record<string, any>

  if (token) {
    // Public flow — look up by signing_token (no auth required)
    const { data, error } = await service
      .from('agreements')
      .select('*, clients(full_name)')
      .eq('signing_token', token)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }
    if (data.status === 'signed') {
      return NextResponse.json({ error: 'Already signed' }, { status: 409 })
    }
    if (data.status === 'expired') {
      return NextResponse.json({ error: 'This agreement has expired' }, { status: 410 })
    }
    agreement = data
  } else {
    // Admin in-person flow — verify admin session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await service
      .from('agreements')
      .select('*, clients(full_name)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }
    agreement = data
  }

  const signedAt = new Date().toISOString()
  const participantName: string = agreement.clients?.full_name ?? signerName

  // Generate PDF
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(AgreementPDF, {
        participantName,
        advocateName: agreement.advocate_name ?? null,
        supportDescription: agreement.supports_description ?? 'As discussed and agreed between the parties.',
        fundingType: agreement.funding_type ?? 'ndia',
        paymentMethod: agreement.payment_method ?? 'eft',
        commencementDate: agreement.created_at ? formatDate(agreement.created_at) : formatDate(signedAt),
        expiryDate: agreement.expires_on ? formatDate(agreement.expires_on) : null,
        signerName: signerName.trim(),
        signatureDataUrl,
        signedAt: formatDateTime(signedAt),
      }) as any
    )
  } catch (err) {
    console.error('PDF generation failed:', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }

  // Upload to Supabase Storage
  const filePath = `agreements/${agreement.id}.pdf`
  const { error: uploadError } = await service.storage
    .from('documents')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('Storage upload failed:', uploadError)
    return NextResponse.json({ error: 'PDF upload failed' }, { status: 500 })
  }

  // Generate signed URL valid for ~20 years
  const { data: signedData, error: signedUrlError } = await service.storage
    .from('documents')
    .createSignedUrl(filePath, 630_720_000)

  if (signedUrlError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate download URL' }, { status: 500 })
  }

  // Update agreement row
  const { error: updateError } = await service
    .from('agreements')
    .update({
      status: 'signed',
      signed_at: signedAt,
      signature_data_url: signatureDataUrl,
      signer_name: signerName.trim(),
      pdf_url: signedData.signedUrl,
    })
    .eq('id', agreement.id)

  if (updateError) {
    console.error('Agreement update failed:', updateError)
    return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 })
  }

  return NextResponse.json({ success: true, pdfUrl: signedData.signedUrl })
}
