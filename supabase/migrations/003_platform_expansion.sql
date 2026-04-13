-- ============================================================
-- Vivid Care - Platform Expansion
-- Settings, Agreements, NDIS documentation engine, and audit
-- ============================================================

-- ------------------------------------------------------------
-- Utility functions
-- ------------------------------------------------------------
create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Organization settings
-- ------------------------------------------------------------
create table if not exists public.organization_settings (
  id integer primary key default 1 check (id = 1),
  org_name text not null default 'Vivid Care',
  business_email text,
  business_phone text,
  address text,
  timezone text not null default 'Australia/Perth',
  geofence_radius_meters integer not null default 300,
  clock_in_window_minutes integer not null default 15,
  doc_warning_days integer[] not null default array[45, 30, 14, 7],
  pay_period text not null default 'fortnightly',
  compliance_email text,
  ndis_provider_number text,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_organization_settings_updated_at on public.organization_settings;
create trigger trg_organization_settings_updated_at
before update on public.organization_settings
for each row execute procedure public.set_row_updated_at();

insert into public.organization_settings (
  id,
  org_name,
  business_email,
  timezone,
  geofence_radius_meters,
  clock_in_window_minutes,
  compliance_email
)
values (
  1,
  'Vivid Care',
  'operations@vividcare.com',
  'Australia/Perth',
  300,
  15,
  'compliance@vividcare.com'
)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Document type configuration
-- ------------------------------------------------------------
create table if not exists public.document_type_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_type text not null check (owner_type in ('staff', 'client')),
  category text not null default 'compliance',
  requires_expiry boolean not null default false,
  warning_days integer[] not null default array[45, 30, 14, 7],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_document_type_configs_owner_type
  on public.document_type_configs (owner_type, active);

drop trigger if exists trg_document_type_configs_updated_at on public.document_type_configs;
create trigger trg_document_type_configs_updated_at
before update on public.document_type_configs
for each row execute procedure public.set_row_updated_at();

insert into public.document_type_configs (name, owner_type, category, requires_expiry)
values
  ('Passport', 'staff', 'identity', false),
  ('Police Clearance', 'staff', 'screening', true),
  ('Working With Children Check', 'staff', 'screening', true),
  ('CPR Certificate', 'staff', 'qualification', true),
  ('Manual Handling Certificate', 'staff', 'qualification', true),
  ('NDIS Service Agreement', 'client', 'agreement', true),
  ('Risk Assessment', 'client', 'care-plan', true)
on conflict do nothing;

-- ------------------------------------------------------------
-- Agreement engine
-- ------------------------------------------------------------
create table if not exists public.agreement_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_type text not null check (target_type in ('staff', 'client')),
  body text not null,
  active boolean not null default true,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_agreement_templates_updated_at on public.agreement_templates;
create trigger trg_agreement_templates_updated_at
before update on public.agreement_templates
for each row execute procedure public.set_row_updated_at();

create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.agreement_templates on delete set null,
  target_type text not null check (target_type in ('staff', 'client')),
  target_id uuid not null,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_signature', 'signed', 'expired')),
  expires_on date,
  signed_at timestamptz,
  signature_data_url text,
  pdf_url text,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agreements_target
  on public.agreements (target_type, target_id, status);

create index if not exists idx_agreements_expiry
  on public.agreements (expires_on, status);

drop trigger if exists trg_agreements_updated_at on public.agreements;
create trigger trg_agreements_updated_at
before update on public.agreements
for each row execute procedure public.set_row_updated_at();

insert into public.agreement_templates (name, target_type, body)
values
  (
    'Client Service Agreement',
    'client',
    'This agreement outlines supports, attendance expectations, privacy obligations, and incident escalation requirements for Vivid Care service delivery.'
  ),
  (
    'Staff Employment Pack',
    'staff',
    'This pack confirms roster obligations, clock-in rules, document compliance, and the incident reporting standard required by Vivid Care.'
  )
on conflict do nothing;

-- ------------------------------------------------------------
-- NDIS service documentation engine
-- ------------------------------------------------------------
create table if not exists public.ndis_support_types (
  key text primary key,
  title text not null,
  item_number text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_ndis_support_types_updated_at on public.ndis_support_types;
create trigger trg_ndis_support_types_updated_at
before update on public.ndis_support_types
for each row execute procedure public.set_row_updated_at();

create table if not exists public.ndis_doc_requirements (
  id uuid primary key default gen_random_uuid(),
  support_type_key text not null references public.ndis_support_types(key) on delete cascade,
  form_key text not null,
  label text not null,
  required boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_ndis_doc_requirements_unique
  on public.ndis_doc_requirements (support_type_key, form_key);

create table if not exists public.ndis_form_fields (
  id uuid primary key default gen_random_uuid(),
  support_type_key text references public.ndis_support_types(key) on delete cascade,
  form_key text not null,
  field_key text not null,
  label text not null,
  field_type text not null
    check (field_type in ('text', 'textarea', 'select', 'checkbox', 'number', 'datetime')),
  placeholder text,
  options jsonb not null default '[]'::jsonb,
  required boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_ndis_form_fields_lookup
  on public.ndis_form_fields (form_key, support_type_key, display_order);

alter table public.shifts
  add column if not exists support_type_key text,
  add column if not exists documentation_status text not null default 'pending'
    check (documentation_status in ('not_required', 'pending', 'in_progress', 'documented', 'overdue')),
  add column if not exists published_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'shifts_support_type_key_fkey'
      and table_name = 'shifts'
      and table_schema = 'public'
  ) then
    alter table public.shifts
      add constraint shifts_support_type_key_fkey
      foreign key (support_type_key) references public.ndis_support_types(key) on delete set null;
  end if;
end
$$;

create table if not exists public.shift_documentation (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts on delete cascade,
  support_type_key text not null references public.ndis_support_types(key),
  form_key text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'submitted'
    check (status in ('draft', 'submitted', 'approved', 'amended')),
  version integer not null default 1,
  submitted_by uuid references public.profiles,
  approved_by uuid references public.profiles,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shift_documentation_shift_form
  on public.shift_documentation (shift_id, form_key, status);

drop trigger if exists trg_shift_documentation_updated_at on public.shift_documentation;
create trigger trg_shift_documentation_updated_at
before update on public.shift_documentation
for each row execute procedure public.set_row_updated_at();

create table if not exists public.shift_documentation_audit (
  id uuid primary key default gen_random_uuid(),
  shift_documentation_id uuid not null references public.shift_documentation on delete cascade,
  shift_id uuid not null references public.shifts on delete cascade,
  action text not null,
  payload_snapshot jsonb not null default '{}'::jsonb,
  acted_by uuid references public.profiles,
  acted_at timestamptz not null default now()
);

create index if not exists idx_shift_documentation_audit_shift
  on public.shift_documentation_audit (shift_id, acted_at desc);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_key text not null,
  action text not null,
  actor_id uuid references public.profiles,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_events_entity
  on public.audit_events (entity_type, entity_key, created_at desc);

create or replace function public.refresh_shift_documentation_status(p_shift_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_support_type text;
  required_count integer;
  submitted_count integer;
begin
  select coalesce(support_type_key, 'general_support')
  into resolved_support_type
  from public.shifts
  where id = p_shift_id;

  if resolved_support_type is null then
    update public.shifts
      set documentation_status = 'not_required'
    where id = p_shift_id;
    return;
  end if;

  select count(*)
  into required_count
  from public.ndis_doc_requirements
  where support_type_key = resolved_support_type
    and required = true;

  if required_count = 0 then
    update public.shifts
      set documentation_status = 'not_required'
    where id = p_shift_id;
    return;
  end if;

  select count(distinct form_key)
  into submitted_count
  from public.shift_documentation
  where shift_id = p_shift_id
    and status in ('submitted', 'approved');

  update public.shifts
    set documentation_status =
      case
        when submitted_count >= required_count then 'documented'
        when submitted_count > 0 then 'in_progress'
        else 'pending'
      end
  where id = p_shift_id;
end;
$$;

create or replace function public.handle_shift_documentation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_shift_id uuid;
begin
  affected_shift_id := coalesce(new.shift_id, old.shift_id);

  insert into public.shift_documentation_audit (
    shift_documentation_id,
    shift_id,
    action,
    payload_snapshot,
    acted_by
  )
  values (
    coalesce(new.id, old.id),
    affected_shift_id,
    tg_op,
    coalesce(new.payload, old.payload, '{}'::jsonb),
    coalesce(new.submitted_by, new.approved_by, old.submitted_by, old.approved_by)
  );

  perform public.refresh_shift_documentation_status(affected_shift_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_shift_documentation_change on public.shift_documentation;
create trigger trg_shift_documentation_change
after insert or update or delete on public.shift_documentation
for each row execute procedure public.handle_shift_documentation_change();

insert into public.ndis_support_types (key, title, item_number, description)
values
  ('general_support', 'General Daily Support', '01_011_0107_1_1', 'Default support type used when a shift has not been categorised yet.'),
  ('community_access', 'Community Access', '04_104_0125_6_1', 'Community participation, appointments, and social access.'),
  ('personal_care', 'Personal Care', '01_011_0107_1_1', 'Personal care and daily living support.'),
  ('medication_support', 'Medication Support', '01_013_0120_1_1', 'Medication administration and medication prompts.')
on conflict (key) do nothing;

insert into public.ndis_doc_requirements (support_type_key, form_key, label, required)
values
  ('general_support', 'support_log', 'Support log', true),
  ('general_support', 'roster_confirmation', 'Roster confirmation', true),
  ('community_access', 'support_log', 'Support log', true),
  ('community_access', 'case_note', 'Case note', true),
  ('community_access', 'roster_confirmation', 'Roster confirmation', true),
  ('personal_care', 'support_log', 'Support log', true),
  ('personal_care', 'roster_confirmation', 'Roster confirmation', true),
  ('medication_support', 'support_log', 'Support log', true),
  ('medication_support', 'medication_admin', 'Medication administration', true),
  ('medication_support', 'roster_confirmation', 'Roster confirmation', true)
on conflict do nothing;

insert into public.ndis_form_fields (
  support_type_key,
  form_key,
  field_key,
  label,
  field_type,
  placeholder,
  options,
  required,
  display_order
)
values
  (null, 'support_log', 'support_summary', 'Support summary', 'textarea', 'Describe supports delivered during the shift.', '[]'::jsonb, true, 10),
  (null, 'support_log', 'goals_progress', 'Progress against goals', 'textarea', 'Record outcomes, engagement, or progress.', '[]'::jsonb, true, 20),
  (null, 'support_log', 'travel_minutes', 'Travel minutes', 'number', 'Travel time for the visit', '[]'::jsonb, false, 30),
  (null, 'case_note', 'case_note', 'Case note', 'textarea', 'Document important events, behaviours, or decisions.', '[]'::jsonb, true, 10),
  (null, 'case_note', 'follow_up_required', 'Follow-up required', 'checkbox', null, '[]'::jsonb, false, 20),
  (null, 'roster_confirmation', 'arrival_confirmed', 'Arrival confirmed', 'checkbox', null, '[]'::jsonb, true, 10),
  (null, 'roster_confirmation', 'departure_confirmed', 'Departure confirmed', 'checkbox', null, '[]'::jsonb, true, 20),
  (null, 'roster_confirmation', 'client_signature_note', 'Client confirmation note', 'text', 'Who confirmed the roster completion?', '[]'::jsonb, false, 30),
  (null, 'medication_admin', 'medication_name', 'Medication name', 'text', 'Name of medication administered', '[]'::jsonb, true, 10),
  (null, 'medication_admin', 'dose', 'Dose', 'text', 'Dose administered', '[]'::jsonb, true, 20),
  (null, 'medication_admin', 'administered_at', 'Administered at', 'datetime', null, '[]'::jsonb, true, 30)
on conflict do nothing;

update public.shifts
set documentation_status = case
  when coalesce(support_type_key, 'general_support') = 'general_support' then documentation_status
  else documentation_status
end
where documentation_status is null;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.organization_settings enable row level security;
alter table public.document_type_configs enable row level security;
alter table public.agreement_templates enable row level security;
alter table public.agreements enable row level security;
alter table public.ndis_support_types enable row level security;
alter table public.ndis_doc_requirements enable row level security;
alter table public.ndis_form_fields enable row level security;
alter table public.shift_documentation enable row level security;
alter table public.shift_documentation_audit enable row level security;
alter table public.audit_events enable row level security;

create policy "Admins manage organization settings" on public.organization_settings
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins manage document type configs" on public.document_type_configs
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated users can read document type configs" on public.document_type_configs
  for select using (auth.uid() is not null);

create policy "Admins manage agreement templates" on public.agreement_templates
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated users can read agreement templates" on public.agreement_templates
  for select using (auth.uid() is not null);

create policy "Admins manage agreements" on public.agreements
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff can view own agreements" on public.agreements
  for select using (target_type = 'staff' and target_id = auth.uid());

create policy "Authenticated users can read support types" on public.ndis_support_types
  for select using (auth.uid() is not null);
create policy "Admins manage support types" on public.ndis_support_types
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Authenticated users can read doc requirements" on public.ndis_doc_requirements
  for select using (auth.uid() is not null);
create policy "Admins manage doc requirements" on public.ndis_doc_requirements
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Authenticated users can read NDIS form fields" on public.ndis_form_fields
  for select using (auth.uid() is not null);
create policy "Admins manage NDIS form fields" on public.ndis_form_fields
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins manage shift documentation" on public.shift_documentation
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Staff manage own shift documentation" on public.shift_documentation
  for all using (
    exists (
      select 1
      from public.shifts
      where shifts.id = shift_documentation.shift_id
        and shifts.staff_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.shifts
      where shifts.id = shift_documentation.shift_id
        and shifts.staff_id = auth.uid()
    )
  );

create policy "Admins view documentation audit" on public.shift_documentation_audit
  for select using (public.is_admin());
create policy "Staff view own documentation audit" on public.shift_documentation_audit
  for select using (
    exists (
      select 1
      from public.shifts
      where shifts.id = shift_documentation_audit.shift_id
        and shifts.staff_id = auth.uid()
    )
  );

create policy "Admins manage audit events" on public.audit_events
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Authenticated users can insert audit events" on public.audit_events
  for insert with check (auth.uid() is not null);
create policy "Authenticated users can read related audit events" on public.audit_events
  for select using (auth.uid() is not null);
