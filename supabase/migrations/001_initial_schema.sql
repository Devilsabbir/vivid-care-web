-- ============================================================
-- Vivid Care — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Automatically create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'staff'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- CLIENTS
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
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
  created_by uuid references public.profiles,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SHIFTS
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.profiles not null,
  client_id uuid references public.clients not null,
  title text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'scheduled' check (status in ('scheduled', 'active', 'completed', 'cancelled')),
  clock_in_time timestamptz,
  clock_in_lat float8,
  clock_in_lng float8,
  clock_out_time timestamptz,
  clock_out_lat float8,
  clock_out_lng float8,
  notes text,
  created_by uuid references public.profiles,
  created_at timestamptz default now()
);

-- DOCUMENTS
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  owner_type text not null check (owner_type in ('staff', 'client')),
  doc_type text not null,
  file_url text,
  file_name text,
  expiry_date date,
  status text default 'active' check (status in ('active', 'near_expiry', 'expired')),
  uploaded_by uuid references public.profiles,
  created_at timestamptz default now()
);

-- INCIDENTS
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid references public.shifts,
  staff_id uuid references public.profiles not null,
  client_id uuid references public.clients,
  title text not null,
  description text,
  severity text default 'medium' check (severity in ('low', 'medium', 'high', 'emergency')),
  status text default 'open' check (status in ('open', 'investigating', 'resolved')),
  reported_at timestamptz default now(),
  created_at timestamptz default now()
);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  type text not null,
  title text,
  message text,
  related_id uuid,
  read bool default false,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.shifts enable row level security;
alter table public.documents enable row level security;
alter table public.incidents enable row level security;
alter table public.notifications enable row level security;

-- Helper: is current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- PROFILES policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Admins can insert profiles" on public.profiles
  for insert with check (public.is_admin());

-- CLIENTS policies
create policy "Admins full access to clients" on public.clients
  for all using (public.is_admin());
create policy "Staff can view clients" on public.clients
  for select using (auth.uid() in (select staff_id from public.shifts where client_id = clients.id));

-- SHIFTS policies
create policy "Admins full access to shifts" on public.shifts
  for all using (public.is_admin());
create policy "Staff can view own shifts" on public.shifts
  for select using (auth.uid() = staff_id);
create policy "Staff can update own shift clock times" on public.shifts
  for update using (auth.uid() = staff_id)
  with check (auth.uid() = staff_id);

-- DOCUMENTS policies
create policy "Admins full access to documents" on public.documents
  for all using (public.is_admin());
create policy "Staff can view and upload own documents" on public.documents
  for all using (auth.uid() = owner_id and owner_type = 'staff');

-- INCIDENTS policies
create policy "Admins full access to incidents" on public.incidents
  for all using (public.is_admin());
create policy "Staff can insert incidents" on public.incidents
  for insert with check (auth.uid() = staff_id);
create policy "Staff can view own incidents" on public.incidents
  for select using (auth.uid() = staff_id);

-- NOTIFICATIONS policies
create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);
create policy "Users can mark own notifications read" on public.notifications
  for update using (auth.uid() = user_id);
create policy "Authenticated users can insert notifications" on public.notifications
  for insert with check (auth.uid() is not null);

-- ============================================================
-- STORAGE BUCKET (run in Supabase dashboard or via CLI)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);

-- Storage policy — users can only access their own files
-- create policy "Users access own files" on storage.objects
--   for all using (auth.uid()::text = (storage.foldername(name))[2]);

-- ============================================================
-- REALTIME (enable in Supabase dashboard > Database > Replication)
-- Enable: notifications, shifts
-- ============================================================
