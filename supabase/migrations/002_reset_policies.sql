-- ============================================================
-- Run this in Supabase SQL Editor if migration fails with
-- "policy already exists" errors
-- ============================================================

-- Drop all policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins full access to clients" ON public.clients;
DROP POLICY IF EXISTS "Staff can view clients" ON public.clients;
DROP POLICY IF EXISTS "Admins full access to shifts" ON public.shifts;
DROP POLICY IF EXISTS "Staff can view own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Staff can update own shift clock times" ON public.shifts;
DROP POLICY IF EXISTS "Admins full access to documents" ON public.documents;
DROP POLICY IF EXISTS "Staff can view and upload own documents" ON public.documents;
DROP POLICY IF EXISTS "Admins full access to incidents" ON public.incidents;
DROP POLICY IF EXISTS "Staff can insert incidents" ON public.incidents;
DROP POLICY IF EXISTS "Staff can view own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

-- Drop trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_admin();

-- Drop tables (cascade removes all dependencies)
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================
-- Recreate everything from scratch
-- ============================================================

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'staff')),
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'staff'),
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- CLIENTS
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  age int,
  date_of_birth date,
  address text,
  lat float8,
  lng float8,
  ndis_number text,
  phone text,
  email text,
  emergency_contact text,
  notes text,
  created_by uuid REFERENCES public.profiles,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- SHIFTS
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.profiles NOT NULL,
  client_id uuid REFERENCES public.clients NOT NULL,
  title text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','completed','cancelled')),
  clock_in_time timestamptz,
  clock_in_lat float8,
  clock_in_lng float8,
  clock_out_time timestamptz,
  clock_out_lat float8,
  clock_out_lng float8,
  notes text,
  created_by uuid REFERENCES public.profiles,
  created_at timestamptz DEFAULT now()
);

-- DOCUMENTS
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  owner_type text NOT NULL CHECK (owner_type IN ('staff','client')),
  doc_type text NOT NULL,
  file_url text,
  file_name text,
  expiry_date date,
  status text DEFAULT 'active' CHECK (status IN ('active','near_expiry','expired')),
  uploaded_by uuid REFERENCES public.profiles,
  created_at timestamptz DEFAULT now()
);

-- INCIDENTS
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES public.shifts,
  staff_id uuid REFERENCES public.profiles NOT NULL,
  client_id uuid REFERENCES public.clients,
  title text NOT NULL,
  description text,
  severity text DEFAULT 'medium' CHECK (severity IN ('low','medium','high','emergency')),
  status text DEFAULT 'open' CHECK (status IN ('open','investigating','resolved')),
  reported_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles NOT NULL,
  type text NOT NULL,
  title text,
  message text,
  related_id uuid,
  read bool DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.is_admin());

-- CLIENTS policies
CREATE POLICY "Admins full access to clients" ON public.clients FOR ALL USING (public.is_admin());
CREATE POLICY "Staff can view clients" ON public.clients FOR SELECT USING (
  auth.uid() IN (SELECT staff_id FROM public.shifts WHERE client_id = clients.id)
);

-- SHIFTS policies
CREATE POLICY "Admins full access to shifts" ON public.shifts FOR ALL USING (public.is_admin());
CREATE POLICY "Staff can view own shifts" ON public.shifts FOR SELECT USING (auth.uid() = staff_id);
CREATE POLICY "Staff can update own shift clock times" ON public.shifts FOR UPDATE
  USING (auth.uid() = staff_id) WITH CHECK (auth.uid() = staff_id);

-- DOCUMENTS policies
CREATE POLICY "Admins full access to documents" ON public.documents FOR ALL USING (public.is_admin());
CREATE POLICY "Staff can view and upload own documents" ON public.documents FOR ALL
  USING (auth.uid() = owner_id AND owner_type = 'staff');

-- INCIDENTS policies
CREATE POLICY "Admins full access to incidents" ON public.incidents FOR ALL USING (public.is_admin());
CREATE POLICY "Staff can insert incidents" ON public.incidents FOR INSERT WITH CHECK (auth.uid() = staff_id);
CREATE POLICY "Staff can view own incidents" ON public.incidents FOR SELECT USING (auth.uid() = staff_id);

-- NOTIFICATIONS policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can mark own notifications read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
