-- Live staff location tracking during active shifts
-- Staff phones send GPS every ~30 seconds while clocked in.
-- Only the LATEST position per staff member is stored (upsert pattern).
-- Historical breadcrumbs are stored in a separate table for shift playback.

-- Latest position per staff member (one row per staff, upserted)
CREATE TABLE IF NOT EXISTS public.staff_locations (
  staff_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  lat float8 NOT NULL,
  lng float8 NOT NULL,
  accuracy float8,
  heading float8,
  speed float8,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Historical breadcrumbs for shift route playback
CREATE TABLE IF NOT EXISTS public.location_breadcrumbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  lat float8 NOT NULL,
  lng float8 NOT NULL,
  accuracy float8,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_breadcrumbs_shift ON public.location_breadcrumbs(shift_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_breadcrumbs_staff ON public.location_breadcrumbs(staff_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_locations_updated ON public.staff_locations(updated_at DESC);

-- RLS
ALTER TABLE public.staff_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_breadcrumbs ENABLE ROW LEVEL SECURITY;

-- Admins can see all locations
CREATE POLICY "Admins can view all staff locations" ON public.staff_locations
  FOR SELECT USING (public.is_admin());

-- Staff can upsert their own location
CREATE POLICY "Staff can update own location" ON public.staff_locations
  FOR ALL USING (auth.uid() = staff_id) WITH CHECK (auth.uid() = staff_id);

-- Admins can see all breadcrumbs
CREATE POLICY "Admins can view all breadcrumbs" ON public.location_breadcrumbs
  FOR SELECT USING (public.is_admin());

-- Staff can insert their own breadcrumbs
CREATE POLICY "Staff can insert own breadcrumbs" ON public.location_breadcrumbs
  FOR INSERT WITH CHECK (auth.uid() = staff_id);

-- Staff can view own breadcrumbs
CREATE POLICY "Staff can view own breadcrumbs" ON public.location_breadcrumbs
  FOR SELECT USING (auth.uid() = staff_id);

-- Enable realtime for staff_locations so admin map updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_locations;

-- Auto-cleanup: delete breadcrumbs older than 90 days (run via pg_cron or manual)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-breadcrumbs', '0 3 * * *', $$DELETE FROM public.location_breadcrumbs WHERE recorded_at < now() - interval '90 days'$$);
