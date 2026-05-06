-- Migration 010: Tighten storage object read policies
--
-- Context
-- -------
-- Migration 007 replaced "Public can read documents (public bucket)" with:
--
--   CREATE POLICY "Authenticated users can read documents"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
--
-- After migration 009 made both buckets private, this policy became the
-- *only* access gate for document reads.  It is too broad: any authenticated
-- user (including clients) can call createSignedUrl() on any path in the
-- documents bucket if they know it.
--
-- Migration 006 also left a "Public can read agreements" storage policy that
-- was never removed, allowing any caller (auth or anon) to read from the
-- agreements bucket via signed URLs.
--
-- This migration:
--   1. Drops both over-permissive SELECT policies.
--   2. Adds a narrow staff → assigned-client storage SELECT policy so staff
--      can still open client documents they are responsible for.
--   3. Does NOT add a client-role storage SELECT policy: clients access signed
--      agreement PDFs via a long-lived signed URL stored in agreements.pdf_url
--      (generated server-side by the signing API with service role), and the
--      app no longer generates storage signed URLs from the browser.
--
-- After this migration all document signed-URL generation goes through
-- POST /api/documents/sign-url which verifies the requester's session,
-- queries the documents table through RLS, and then uses the service role
-- to create the signed URL server-side.
-- -------------------------------------------------------------------------

-- -------------------------------------------------------------------------
-- 1. Drop the over-permissive documents storage policy (from migration 007)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;

-- -------------------------------------------------------------------------
-- 2. Drop the stale public agreements storage policy (from migration 006)
--    The agreements bucket is now private (migration 009).  Agreement PDFs
--    are stored in the documents bucket under agreements/{id}.pdf and
--    accessed via long-lived signed URLs produced by the service role — no
--    public or broad SELECT policy is needed.
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can read agreements" ON storage.objects;

-- -------------------------------------------------------------------------
-- 3. Add narrow staff → assigned-client documents SELECT policy
--
--    Path layout: client/{client_id}/{doc_type}/{timestamp}_{filename}
--    foldername(name)[1] = 'client'
--    foldername(name)[2] = client_id (stored as text; compared via ::text cast
--                          on the UUID column to avoid crashing on malformed paths)
--
--    Grants SELECT only when the caller:
--      - is authenticated (auth.uid() IS NOT NULL implied by shifts.staff_id check)
--      - has an active/scheduled/completed shift for the client whose id appears
--        in position 2 of the storage path
--
--    The first two conditions (foldername checks) are evaluated before the
--    EXISTS subquery so malformed paths (missing components, non-UUID folder
--    names) will simply return false and never reach the subquery.
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can read assigned client storage documents" ON storage.objects;
CREATE POLICY "Staff can read assigned client storage documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'client'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.shifts
      WHERE shifts.client_id::text = (storage.foldername(name))[2]
        AND shifts.staff_id = auth.uid()
        AND shifts.status IN ('scheduled', 'active', 'completed')
    )
  );

-- -------------------------------------------------------------------------
-- Resulting effective policy set for SELECT on storage.objects
-- -------------------------------------------------------------------------
-- documents bucket:
--   "Admins can manage all documents"               → FOR ALL  (admins)
--   "Staff can read own documents"                  → SELECT   (staff/{uid}/*)
--   "Staff can read assigned client storage docs"   → SELECT   (client/{id}/* for assigned staff)
--   [no client-role policy — clients use pdf_url signed URLs from agreements table]
--   [no unauthenticated policy — bucket is private]
--
-- agreements bucket:
--   "Admins can manage agreements storage"          → FOR ALL  (admins)
--   "Service role full access to agreements"        → FOR ALL  (service role, effectively bypassed)
--   [no public/anon policy — bucket is private]
-- -------------------------------------------------------------------------
