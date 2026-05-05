-- ============================================================
-- Vivid Care — Production Schema (Consolidation)
-- Migration 006: Adds missing columns, clock_events table,
-- clients.status, profiles.email, shifts.support_type,
-- performance indexes, and tightens RLS.
-- ============================================================

-- ============================================================
-- 1. SCHEMA ADDITIONS (columns missing from prior migrations)
-- ============================================================

-- profiles.email (used by shift detail to display staff email)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- clients.status (used by roster-validation to check active/inactive)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive'));

-- shifts.support_type (display label, separate from support_type_key FK)
ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS support_type text;

-- shifts.staff_id must be NULLABLE to support unassigned shifts
-- The original migration had NOT NULL — drop and re-add
ALTER TABLE public.shifts
  ALTER COLUMN staff_id DROP NOT NULL;

-- ============================================================
-- 2. CLOCK EVENTS TABLE
-- Records each clock-in/out event for audit trail
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.shifts ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.profiles ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('clock_in', 'clock_out')),
  lat float8,
  lng float8,
  accuracy float8,
  is_within_geofence boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clock_events_shift
  ON public.clock_events (shift_id, created_at);

CREATE INDEX IF NOT EXISTS idx_clock_events_staff
  ON public.clock_events (staff_id, created_at DESC);

-- ============================================================
-- 3. TRIGGER: auto-create clock_event on shift clock-in/out
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_shift_clock_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: unassigned shifts have no staff_id and cannot produce clock events
  IF NEW.staff_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- On clock IN (handles both initial set and correction)
  IF OLD.clock_in_time IS DISTINCT FROM NEW.clock_in_time
     AND NEW.clock_in_time IS NOT NULL THEN
    INSERT INTO public.clock_events (shift_id, staff_id, type, lat, lng)
    VALUES (NEW.id, NEW.staff_id, 'clock_in', NEW.clock_in_lat, NEW.clock_in_lng);
  END IF;

  -- On clock OUT (handles both initial set and correction)
  IF OLD.clock_out_time IS DISTINCT FROM NEW.clock_out_time
     AND NEW.clock_out_time IS NOT NULL THEN
    INSERT INTO public.clock_events (shift_id, staff_id, type, lat, lng)
    VALUES (NEW.id, NEW.staff_id, 'clock_out', NEW.clock_out_lat, NEW.clock_out_lng);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shift_clock_event ON public.shifts;
CREATE TRIGGER trg_shift_clock_event
AFTER UPDATE ON public.shifts
FOR EACH ROW EXECUTE PROCEDURE public.handle_shift_clock_event();

-- ============================================================
-- 4. PERFORMANCE INDEXES
-- ============================================================

-- shifts: filtered by status + time range (dashboard, active-shifts, roster)
CREATE INDEX IF NOT EXISTS idx_shifts_status_start
  ON public.shifts (status, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_shifts_staff_start
  ON public.shifts (staff_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_shifts_client
  ON public.shifts (client_id, start_time DESC);

-- documents: filtered by owner + expiry
CREATE INDEX IF NOT EXISTS idx_documents_owner
  ON public.documents (owner_id, owner_type);

CREATE INDEX IF NOT EXISTS idx_documents_expiry
  ON public.documents (expiry_date) WHERE expiry_date IS NOT NULL;

-- notifications: filtered by user + read state
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read, created_at DESC);

-- incidents: filtered by status
CREATE INDEX IF NOT EXISTS idx_incidents_status
  ON public.incidents (status, reported_at DESC);

-- incidents: by shift (shift detail page)
CREATE INDEX IF NOT EXISTS idx_incidents_shift
  ON public.incidents (shift_id) WHERE shift_id IS NOT NULL;

-- clients: status filter
CREATE INDEX IF NOT EXISTS idx_clients_status
  ON public.clients (status);

-- profiles: role filter
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role);

-- ============================================================
-- 5. CLOCK EVENTS RLS
-- ============================================================

ALTER TABLE public.clock_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to clock_events"
  ON public.clock_events FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Staff can view own clock_events"
  ON public.clock_events FOR SELECT
  USING (auth.uid() = staff_id);

CREATE POLICY "Staff can insert own clock_events"
  ON public.clock_events FOR INSERT
  WITH CHECK (
    auth.uid() = staff_id
    AND EXISTS (
      SELECT 1 FROM public.shifts
      WHERE shifts.id = clock_events.shift_id
        AND shifts.staff_id = auth.uid()
    )
  );

-- ============================================================
-- 6. STORAGE BUCKETS
-- ============================================================

-- Documents bucket (staff/client document uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Agreements bucket (signed PDF agreements)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agreements',
  'agreements',
  true,
  5242880, -- 5MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 7. STORAGE POLICIES
-- ============================================================

-- Documents bucket policies
DROP POLICY IF EXISTS "Admins can manage all documents" ON storage.objects;
CREATE POLICY "Admins can manage all documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'documents' AND public.is_admin());

DROP POLICY IF EXISTS "Staff can upload own documents" ON storage.objects;
CREATE POLICY "Staff can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'staff'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Staff can read own documents" ON storage.objects;
CREATE POLICY "Staff can read own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (
      public.is_admin()
      OR (
        (storage.foldername(name))[1] = 'staff'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS "Public can read documents (public bucket)" ON storage.objects;
CREATE POLICY "Public can read documents (public bucket)"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

-- Agreements bucket policies
DROP POLICY IF EXISTS "Admins can manage agreements storage" ON storage.objects;
CREATE POLICY "Admins can manage agreements storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'agreements' AND public.is_admin())
  WITH CHECK (bucket_id = 'agreements' AND public.is_admin());

DROP POLICY IF EXISTS "Public can read agreements" ON storage.objects;
CREATE POLICY "Public can read agreements"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agreements');

-- Service role can always write (for API route PDF generation)
DROP POLICY IF EXISTS "Service role full access to agreements" ON storage.objects;
CREATE POLICY "Service role full access to agreements"
  ON storage.objects FOR ALL
  USING (bucket_id = 'agreements' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'agreements' AND auth.role() = 'service_role');

-- ============================================================
-- 8. REALTIME PUBLICATION
-- ============================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;

-- ============================================================
-- 9. ADDITIONAL RLS FIXES
-- ============================================================

-- Organization settings: authenticated users can read (staff need geofence settings)
DROP POLICY IF EXISTS "Authenticated users can read org settings" ON public.organization_settings;
CREATE POLICY "Authenticated users can read org settings"
  ON public.organization_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Staff can view clients they're assigned to (including via client_id on incidents they reported)
-- Already covered by existing policy, but let's also allow direct client select for staff
-- who have shifts with that client (existing policy does this)

-- Agreements: allow public signature via signing_token (for /sign/[token] page)
DROP POLICY IF EXISTS "Public can view agreement by signing token" ON public.agreements;
CREATE POLICY "Public can view agreement by signing token"
  ON public.agreements FOR SELECT
  USING (signing_token IS NOT NULL AND status = 'pending_signature');

-- Agreements: service role can update signed agreements (from API route)
DROP POLICY IF EXISTS "Service role can update agreements" ON public.agreements;
CREATE POLICY "Service role can update agreements"
  ON public.agreements FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
