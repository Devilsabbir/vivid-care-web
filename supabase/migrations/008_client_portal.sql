-- Migration 008: Client Portal
-- Adds client role support, links profiles → clients, and RLS for client access.

-- ============================================================
-- 1. Allow 'client' as a valid profile role
-- ============================================================
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'staff', 'client'));

-- ============================================================
-- 2. Add client_id column to profiles (links a client portal
--    user to their clients record)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients;

-- ============================================================
-- 3. RLS: Clients can view their own client record
-- ============================================================
DROP POLICY IF EXISTS "Clients can view own client record" ON public.clients;
CREATE POLICY "Clients can view own client record" ON public.clients
  FOR SELECT USING (
    id IN (
      SELECT client_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  );

-- ============================================================
-- 4. RLS: Clients can view their own agreements
-- ============================================================
DROP POLICY IF EXISTS "Clients can view own agreements" ON public.agreements;
CREATE POLICY "Clients can view own agreements" ON public.agreements
  FOR SELECT USING (
    target_type = 'client'
    AND target_id IN (
      SELECT client_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  );

-- ============================================================
-- 5. RLS: Clients can view their own shifts
-- ============================================================
DROP POLICY IF EXISTS "Clients can view own shifts" ON public.shifts;
CREATE POLICY "Clients can view own shifts" ON public.shifts
  FOR SELECT USING (
    client_id IN (
      SELECT client_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'client'
    )
  );

-- ============================================================
-- 6. RLS: Clients can view profiles of staff on their shifts
-- ============================================================
DROP POLICY IF EXISTS "Clients can view assigned staff profiles" ON public.profiles;
CREATE POLICY "Clients can view assigned staff profiles" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT staff_id FROM public.shifts
      WHERE client_id IN (
        SELECT client_id FROM public.profiles
        WHERE id = auth.uid() AND role = 'client'
      )
      AND status IN ('scheduled', 'active')
      AND staff_id IS NOT NULL
    )
  );

-- ============================================================
-- 7. RLS: Clients can view their own notifications
--    (The general policy already covers auth.uid() = user_id;
--    this is a no-op if it already exists — handled by DROP IF EXISTS)
-- ============================================================
DROP POLICY IF EXISTS "Clients can view own notifications" ON public.notifications;
CREATE POLICY "Clients can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 8. Index: speed up client_id lookups in profiles
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_client_id
  ON public.profiles (client_id)
  WHERE client_id IS NOT NULL;
