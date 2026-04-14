-- supabase/migrations/004_digital_signatures.sql

alter table public.agreements
  add column if not exists signing_token uuid unique default gen_random_uuid(),
  add column if not exists signer_name text,
  add column if not exists advocate_name text,
  add column if not exists supports_description text,
  add column if not exists funding_type text
    check (funding_type in ('self', 'nominee', 'ndia', 'plan_manager')),
  add column if not exists payment_method text
    check (payment_method in ('eft', 'cheque', 'cash'));

-- Backfill signing_token for any existing rows that got null
update public.agreements
set signing_token = gen_random_uuid()
where signing_token is null;
