# VividCare — Staging Deployment Guide

**Stack:** Next.js 14 → Vercel · Supabase (Postgres + Auth + Storage + Realtime)  
**Estimated setup time:** ~30 minutes on a clean Supabase + Vercel account

---

## 1. Create the Supabase Staging Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click **New project**.
3. Fill in:
   - **Name:** `vividcare-staging`
   - **Database password:** generate a strong password and save it securely
   - **Region:** `ap-southeast-2` (Sydney) — closest to Australian users
   - **Pricing plan:** Free tier is fine for staging
4. Wait for the project to finish provisioning (~2 minutes).
5. From **Project Settings → API**, copy and save:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ never expose this client-side

---

## 2. Run Migrations 001–006 in Order

Open **SQL Editor** in the Supabase dashboard and run each file in sequence. Do not skip or reorder.

> **Tip:** paste the full file content into the editor and click **Run**. Check for errors before moving to the next file.

| Step | File | What it does |
|------|------|-------------|
| 1 | `supabase/migrations/001_initial_schema.sql` | Core tables: profiles, clients, shifts, documents, incidents, notifications + base RLS |
| 2 | `supabase/migrations/002_reset_policies.sql` | **Skip on a fresh project.** Only needed if step 1 was partially run and left orphan policies. |
| 3 | `supabase/migrations/003_platform_expansion.sql` | Settings, agreements, NDIS documentation engine, audit tables |
| 4 | `supabase/migrations/004_digital_signatures.sql` | Adds signing_token and signature columns to agreements |
| 5 | `supabase/migrations/005_provider_settings.sql` | Adds abn, contact_name, website to organization_settings |
| 6 | `supabase/migrations/006_production_schema.sql` | clock_events table, missing columns (profiles.email, clients.status, shifts.support_type), NULL staff_id on shifts, indexes, storage buckets, updated RLS |

After step 6, verify in **Table Editor** that these tables exist:
`profiles` `clients` `shifts` `clock_events` `documents` `incidents` `notifications` `agreements` `agreement_templates` `organization_settings` `document_type_configs` `ndis_support_types` `ndis_doc_requirements` `ndis_form_fields` `shift_documentation` `audit_events`

---

## 3. Create Supabase Auth Users

The seed script resolves users by email. Create them **before** running the seed.

Go to **Authentication → Users → Add user** (or **Invite user**). For each row below:
- Enable **Auto Confirm Email**
- Set the **user metadata** exactly as shown (JSON)

| Email | Password | User Metadata |
|-------|----------|---------------|
| `admin@vividcare.test` | `Password123!` | `{"role": "admin", "full_name": "Sarah Mitchell"}` |
| `staff1@vividcare.test` | `Password123!` | `{"role": "staff", "full_name": "James Okonkwo"}` |
| `staff2@vividcare.test` | `Password123!` | `{"role": "staff", "full_name": "Priya Sharma"}` |
| `staff3@vividcare.test` | `Password123!` | `{"role": "staff", "full_name": "Tom Nguyen"}` |
| `staff4@vividcare.test` | `Password123!` | `{"role": "staff", "full_name": "Elena Vasquez"}` |

The `handle_new_user` trigger auto-inserts a row into `public.profiles` on each signup using the metadata above. Verify by checking the `profiles` table after creating all five users.

---

## 4. Run seed.sql

Once all five auth users exist, paste the contents of `supabase/seed.sql` into **SQL Editor** and click **Run**.

The script:
- Resolves UUIDs from `auth.users` by email
- Updates profiles with phone numbers and emails
- Inserts 4 clients (3 active, 1 inactive)
- Inserts 14 documents across staff and clients (active / near_expiry / expired states)
- Inserts 8 shifts (scheduled / active / completed / missed / cancelled / unassigned)
- Inserts clock events for completed and active shifts
- Inserts 4 incidents
- Inserts 9 notifications
- Inserts 4 agreements
- Inserts 4 shift documentation records
- Updates organization_settings with demo org data

If the script raises `Admin user not found`, the auth users were not created yet — complete step 3 first.

---

## 5. Enable Realtime

Go to **Database → Replication** and ensure the following tables are enabled for publication `supabase_realtime`:

- ✅ `public.notifications` (INSERT events — drives the live notification bell)
- ✅ `public.shifts` (UPDATE events — drives the active shift monitoring board)

> Migration `006` issues `ALTER PUBLICATION supabase_realtime ADD TABLE` for both. If this ran successfully you can verify under **Database → Replication → Source → Tables**.

---

## 6. Required Environment Variables for Vercel

Set all of these in **Vercel → Project → Settings → Environment Variables**. Apply to the **Preview** environment for staging (not Production).

| Variable | Where to find it | Required |
|----------|-----------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key | ✅ |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Optional — enables `/staff/support` AI assistant |

> `SUPABASE_SECRET_KEY` is an alias for `SUPABASE_SERVICE_ROLE_KEY` accepted by some internal routes. You only need one — the app checks both with `??`.

**Do not set** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` unless Supabase provides one for your project. The client lib falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY` automatically.

---

## 7. Configure Supabase Auth Redirect URLs

Go to **Authentication → URL Configuration** and set:

**Site URL:**
```
https://your-staging-deployment.vercel.app
```

**Additional Redirect URLs** (add all of these):
```
https://your-staging-deployment.vercel.app/**
https://your-staging-deployment.vercel.app/admin/dashboard
https://your-staging-deployment.vercel.app/staff/home
```

> Replace `your-staging-deployment.vercel.app` with the actual Vercel preview URL. You can find it after the first Vercel deployment (step 8).
>
> If the URL isn't set correctly, users will get `redirect_uri_mismatch` errors after login.

---

## 8. Deploy to Vercel

```bash
# Option A — Vercel CLI (recommended for first deploy)
npm install -g vercel
cd vivid_care_web
vercel --env NEXT_PUBLIC_SUPABASE_URL=... \
       --env NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
       --env SUPABASE_SERVICE_ROLE_KEY=...

# Option B — GitHub integration
# 1. Push the repo to GitHub
# 2. Go to vercel.com → New Project → Import Git Repository
# 3. Select the repo
# 4. Add all environment variables in the Vercel UI
# 5. Click Deploy
```

**Framework preset:** Next.js (auto-detected)  
**Build command:** `next build` (default)  
**Output directory:** `.next` (default)  
**Node version:** 18.x or 20.x (set under Project Settings → General if needed)

After deploy, copy the staging URL and update the Supabase redirect URLs in step 7.

---

## 9. Admin Smoke Test Checklist

Log in as `admin@vividcare.test` / `Password123!` and verify each item:

### Auth & Navigation
- [ ] Login redirects to `/admin/dashboard`
- [ ] Sidebar shows all nav items: Dashboard, Clients, Staff, Roster, Compliance, Active Shifts, Shift History, Incidents, Payments, Settings, Notifications

### Dashboard
- [ ] Staff count card shows `4`
- [ ] Client count card shows `4` (3 active + 1 inactive)
- [ ] Live roster board shows the 1 active shift (James / Ahmed)
- [ ] Compliance watch shows expiring/expired documents for Priya, Tom, and Elena
- [ ] Clicking a compliance watch item deep-links to the staff profile `?tab=documents`
- [ ] Payroll pill navigates to `/admin/payments`
- [ ] Settings pill navigates to `/admin/settings`

### Clients
- [ ] Client list shows 4 clients
- [ ] Margaret Thompson profile loads with documents, shifts, agreements tabs
- [ ] Robert Williams shows status badge "Inactive"

### Staff
- [ ] Staff list shows 4 workers
- [ ] James Okonkwo profile: all documents valid, Overview shows "Roster ready"
- [ ] Priya Sharma profile: Documents tab shows 2 near-expiry badges
- [ ] Tom Nguyen profile: Documents tab shows 2 expired badges
- [ ] Clicking the calendar icon on any staff profile routes to `/admin/roster`

### Shifts
- [ ] Shift list page (`/admin/shifts`) shows all 8 shifts
- [ ] Clicking any shift row opens the shift detail page
- [ ] Active shift shows clock-in time and progress bar
- [ ] Completed shifts show clock-in + clock-out times and clock events timeline
- [ ] Unassigned shift shows "Unassigned staff" in the staff column

### Roster
- [ ] Weekly calendar renders with shifts on correct days
- [ ] Create Shift modal opens, validation panel fires for double-booking test:
  - Set staff to James, pick a time that overlaps his active shift → error should appear
- [ ] Unassigned shift visible in "Unassigned" category

### Compliance
- [ ] Document list shows expiring/expired documents
- [ ] Clicking a staff name links to the staff profile

### Active Shifts
- [ ] Live board shows the 1 active shift
- [ ] Scheduled watchlist shows upcoming shifts
- [ ] Realtime updates: in a second tab, update a shift status in the SQL editor → board should refresh without a page reload

### Incidents
- [ ] 4 incidents listed with correct severity badges
- [ ] Incident detail page shows linked shift and client
- [ ] Status can be changed (Open → Investigating → Resolved)

### Payments
- [ ] Shows completed shifts as "Billable"
- [ ] Clicking a row routes to the shift detail page
- [ ] "Payment processing integration pending" notice is visible

### Settings
- [ ] Organization tab shows demo org data (Vivid Care, Perth address)
- [ ] Document types tab shows seeded types
- [ ] NDIS support types tab shows 4 seeded types

### Agreements
- [ ] 4 agreements listed with correct status badges
- [ ] Margaret's agreement shows "Signed"
- [ ] Ahmed's agreement shows "Pending Signature" with a copy-link button
- [ ] Robert's agreement shows "Expired"

### Notifications
- [ ] Bell icon shows unread count
- [ ] Notifications list shows history tab with seeded notifications
- [ ] Marking one as read clears it from the unread count

---

## 10. Staff Smoke Test Checklist

Log out of admin, then log in as `staff1@vividcare.test` (James Okonkwo) / `Password123!`:

- [ ] Login redirects to `/staff/home`
- [ ] Calendar shows James's shifts only (not other staff)
- [ ] "Next up" card shows tomorrow's morning personal care shift
- [ ] Active shift card shows "Clock out" CTA (shift is currently active)
- [ ] Clicking a shift card on the calendar routes to `/staff/shifts/[id]`
- [ ] Shift detail shows client name, address, time, support type, clock history
- [ ] Clock page (`/staff/clock`) loads with the active shift pre-selected
- [ ] Documents page shows James's 4 documents (no other staff documents visible)
- [ ] Incidents page: can file a new incident; sees own past incidents
- [ ] Notifications page shows only James's notifications
- [ ] Profile page shows James Okonkwo

Log out, log in as `staff3@vividcare.test` (Tom Nguyen):
- [ ] Home calendar shows only Tom's shifts
- [ ] Shift detail for the missed shift shows status "Scheduled" (past, no clock-in)
- [ ] Documents tab shows 2 expired documents

---

## 11. RLS Security Smoke Test Checklist

Run these in **SQL Editor** using the `anon` role to verify nothing leaks unauthenticated:

```sql
-- Should return 0 rows (anon has no access)
set role anon;
select count(*) from public.profiles;
select count(*) from public.clients;
select count(*) from public.shifts;
select count(*) from public.documents;
select count(*) from public.notifications;
reset role;
```

All four queries must return `0`. If any return rows, RLS is not enabled on that table.

**Staff isolation test** — run in the SQL editor after obtaining James's UUID from auth.users:

```sql
-- Simulate James's JWT context
set request.jwt.claims = '{"sub": "<james-uuid>", "role": "authenticated"}';
set role authenticated;

-- Should only return James's shifts
select count(*) from public.shifts;

-- Should only return James's documents
select count(*) from public.documents;

-- Should return 0 (can't see other users' notifications)
select count(*) from public.notifications where user_id != '<james-uuid>';

reset role;
```

**Agreement signing page test** — paste this URL in a private/incognito browser window (not logged in):

```
https://your-staging-deployment.vercel.app/sign/<ahmed-signing-token>
```

- Ahmed's signing token can be found via: `select signing_token from agreements where title like '%Ahmed%'`
- The page should load and show the agreement for signature
- Any other URL (dashboard, clients, staff) should redirect to `/login`

---

## 12. Known Staging-Only Limitations

These are intentional trade-offs for staging. **Do not use this configuration for real participant data.**

| Limitation | Staging behaviour | Required before production |
|-----------|------------------|--------------------------|
| **Public-read storage** | Document and agreement files are publicly accessible by URL. Paths are UUID-based (unguessable) but unauthenticated. | Switch to private buckets + `createSignedUrl()` for all file reads |
| **Payments are display-only** | The payments page reads completed shift hours as a proxy for billing. No real payment processing occurs. | Implement a `payments` table, NDIS bulk upload export, or payment gateway integration |
| **Staff availability is a placeholder** | The Availability tab on staff profiles shows a coming-soon state. No availability data is stored. | Build a `staff_availability` table and availability picker UI |
| **Push notifications are not integrated** | Notifications are stored in the `notifications` table and surfaced in-app via Realtime. No push to mobile/email occurs. | Integrate FCM, OneSignal, or similar for mobile push; wire Supabase webhooks for email alerts |
| **Cron jobs are not scheduled** | The `expiry-cron` edge function exists but is not scheduled on staging. Document expiry status changes only happen if triggered manually. | Run `supabase functions deploy expiry-cron` and set up a pg_cron schedule (see SETUP.md) |
| **Geofence validation is passive** | The geofence edge function exists but is not called from the ClockClient — clock-in succeeds regardless of location. | Wire the ClockClient to call the `geofence` edge function before completing a clock-in |
| **Fake seed data only** | All seeded records use fictional names, addresses, NDIS numbers, and document URLs. No real participant information is present. | Remove seed data entirely before connecting to real participant records |
