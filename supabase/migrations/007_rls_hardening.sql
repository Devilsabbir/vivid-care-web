-- Migration 007: RLS hardening
-- Fixes:
--   1. Staff can now view documents belonging to clients they support
--   2. Storage documents bucket tightened to authenticated-only reads
--   3. Overly broad public agreements viewing policy removed
--      (sign/[token]/page.tsx uses service role which bypasses RLS — safe to drop)
--   4. Performance index for the staff-clients subquery used in RLS policies

-- -----------------------------------------------------------------------------
-- Fix 2: Staff can view documents for clients they currently support
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff can view assigned client documents" ON public.documents
  FOR SELECT USING (
    owner_type = 'client'
    AND EXISTS (
      SELECT 1 FROM public.shifts
      WHERE shifts.client_id = documents.owner_id
        AND shifts.staff_id = auth.uid()
        AND shifts.status IN ('scheduled', 'active', 'completed')
    )
  );

-- -----------------------------------------------------------------------------
-- Fix 3: Tighten storage documents bucket — drop public read, add auth-only read
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can read documents (public bucket)" ON storage.objects;

CREATE POLICY "Authenticated users can read documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- Fix 4: Remove overly broad public agreements viewing policy
-- The /sign/[token] page uses createServiceClient() (service role) for all
-- agreement lookups — service role bypasses RLS entirely, so this public policy
-- is not needed and exposes all pending agreements to unauthenticated requests.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view agreement by signing token" ON public.agreements;

-- -----------------------------------------------------------------------------
-- Fix 5: Covering index for the staff-clients RLS subquery
-- The "Staff can view assigned client documents" policy (above) and the existing
-- "Staff can view client" policy both do EXISTS (SELECT 1 FROM shifts WHERE
-- client_id = ? AND staff_id = ?). This index makes those lookups O(log n).
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_shifts_client_staff
  ON public.shifts (client_id, staff_id);
