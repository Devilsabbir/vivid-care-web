import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { rateLimit } from '@/lib/rate-limit'
import { getIP } from '@/lib/get-ip'

/**
 * POST /api/documents/sign-url
 *
 * Returns a 1-hour signed URL for a document the caller is authorised to view.
 *
 * Security model:
 *  1. Auth check   — only admin and staff may call this endpoint (401 / 403).
 *  2. Document lookup via the *user's session* Supabase client so that the
 *     documents-table RLS policies are enforced.  If the caller cannot read
 *     the document row (wrong owner, not an assigned-client document, etc.)
 *     the query returns nothing and we return 404 — same response as "not
 *     found" to avoid leaking whether the document exists.
 *  3. Signed URL is generated via the *service role* client server-side.
 *     The service role key is never sent to the browser.
 *  4. The caller supplies a document *id* (UUID), never a raw storage path,
 *     eliminating the class of attack where a caller supplies an arbitrary
 *     path to bypass document-table RLS.
 */

const SIGNED_URL_TTL = 3600 // 1 hour

/**
 * Extract the storage-object path from a legacy Supabase public URL.
 * Rows uploaded before migration 009 stored the full CDN URL; newer rows
 * store only the bare storage path.
 */
function extractPathFromLegacyUrl(url: string): string | null {
  // Matches: …/storage/v1/object/public/documents/{path}[?query]
  const match = url.match(/\/storage\/v1\/object\/public\/documents\/(.+?)(?:\?|$)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function POST(req: NextRequest) {
  // ── Rate limit ────────────────────────────────────────────────────────────
  const rl = rateLimit(`sign-url:${getIP(req)}`, { limit: 30, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': String(rl.remaining),
        },
      },
    )
  }

  // ── Authentication ────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Role check ────────────────────────────────────────────────────────────
  // Clients access their signed agreement PDFs via the pdf_url field on the
  // agreements row (a long-lived URL produced server-side at signing time).
  // They do not need direct storage access.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Input validation ──────────────────────────────────────────────────────
  let documentId: string
  try {
    const body = await req.json()
    documentId = body?.documentId
    if (!documentId || typeof documentId !== 'string' || documentId.trim() === '') {
      throw new Error('invalid')
    }
    // Basic UUID shape guard — prevents obviously malformed inputs reaching DB
    if (!/^[0-9a-f-]{36}$/i.test(documentId)) {
      throw new Error('invalid uuid')
    }
  } catch {
    return NextResponse.json({ error: 'documentId must be a valid UUID' }, { status: 400 })
  }

  // ── Document lookup via session client (RLS enforced) ────────────────────
  // The documents table RLS policies allow:
  //   • Admins:  all rows
  //   • Staff:   own documents (owner_type='staff', owner_id=auth.uid())
  //              + assigned-client documents (via shifts subquery)
  // If the caller cannot see this row the query returns nothing → 404.
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, file_url, file_name')
    .eq('id', documentId.trim())
    .maybeSingle()

  if (docError) {
    console.error('[sign-url] documents query failed:', docError)
    return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 })
  }
  if (!doc) {
    return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 })
  }
  if (!doc.file_url) {
    return NextResponse.json({ error: 'Document has no associated file' }, { status: 404 })
  }

  // ── Resolve storage path ──────────────────────────────────────────────────
  let storagePath = doc.file_url
  if (doc.file_url.startsWith('http')) {
    // Legacy row — file_url is a full CDN public URL; extract the object path.
    const extracted = extractPathFromLegacyUrl(doc.file_url)
    if (!extracted) {
      console.error('[sign-url] cannot extract path from legacy URL:', doc.file_url)
      return NextResponse.json({ error: 'Cannot resolve document storage path' }, { status: 500 })
    }
    storagePath = extracted
  }

  // ── Generate signed URL via service role ──────────────────────────────────
  // Service role bypasses storage RLS; the access check was already performed
  // above via the documents-table RLS query.  The service role key is only
  // used here on the server — it is never sent to the browser.
  const service = createServiceClient()
  const { data: signed, error: signError } = await service.storage
    .from('documents')
    .createSignedUrl(storagePath, SIGNED_URL_TTL)

  if (signError || !signed?.signedUrl) {
    console.error('[sign-url] createSignedUrl failed:', signError)
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }

  return NextResponse.json({ signedUrl: signed.signedUrl })
}
