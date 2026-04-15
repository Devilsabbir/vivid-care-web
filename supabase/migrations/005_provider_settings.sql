-- supabase/migrations/005_provider_settings.sql

alter table public.organization_settings
  add column if not exists abn text,
  add column if not exists contact_name text,
  add column if not exists website text;
