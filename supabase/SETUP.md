# VividCare Supabase Production Setup

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Next.js App (App Router)                       │
│  ├── Server Components → createClient(server)   │
│  ├── Client Components → createClient(client)   │
│  └── API Routes → service_role for admin ops    │
├─────────────────────────────────────────────────┤
│  Supabase                                       │
│  ├── Auth (email/password, JWT)                 │
│  ├── Database (Postgres + RLS)                  │
│  ├── Storage (documents, agreements buckets)    │
│  ├── Realtime (notifications, shifts)           │
│  └── Edge Functions (cron, geofence, etc.)      │
└─────────────────────────────────────────────────┘
```

---

## Tables Summary

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | Extends auth.users — role, name, phone, email | Yes |
| `clients` | NDIS participants receiving care | Yes |
| `shifts` | Rostered visits (staff ↔ client) | Yes |
| `clock_events` | Audit trail of clock-in/out events | Yes |
| `documents` | Compliance docs (staff + client) | Yes |
| `incidents` | Safety/quality incident reports | Yes |
| `notifications` | In-app notifications (realtime) | Yes |
| `agreements` | Service agreements with signatures | Yes |
| `agreement_templates` | Reusable agreement templates | Yes |
| `organization_settings` | Singleton org configuration | Yes |
| `document_type_configs` | Document type definitions | Yes |
| `ndis_support_types` | NDIS line-item categories | Yes |
| `ndis_doc_requirements` | Required forms per support type | Yes |
| `ndis_form_fields` | Form field definitions | Yes |
| `shift_documentation` | Submitted shift paperwork | Yes |
| `shift_documentation_audit` | Audit trail for documentation | Yes |
| `audit_events` | General audit log | Yes |

---

## RLS Policy Explanation

### Design Principles

1. **Admin = full access** — The `is_admin()` helper function checks `profiles.role = 'admin'` for the current JWT user. Admins get `FOR ALL` policies on every table.

2. **Staff = scoped access** — Staff can only see/modify their own data:
   - `shifts`: SELECT where `staff_id = auth.uid()`, UPDATE for clock times
   - `documents`: ALL where `owner_id = auth.uid() AND owner_type = 'staff'`
   - `notifications`: SELECT/UPDATE where `user_id = auth.uid()`
   - `incidents`: INSERT where `staff_id = auth.uid()`, SELECT own incidents
   - `clock_events`: SELECT own, INSERT only for own shifts
   - `clients`: SELECT only clients they have shifts with (prevents browsing all clients)

3. **Unauthenticated = no access** — All tables have RLS enabled. No `anon` policies exist except:
   - Agreements with `signing_token` can be read publicly (for the `/sign/[token]` page)
   - Storage buckets are public-read for document URLs (files are keyed by UUID path)

4. **Service role** — Used only in:
   - `/api/admin/create-user` (creating auth users)
   - `/api/agreements/sign` (updating agreement status + uploading signed PDF)
   - Edge functions (cron jobs, geofence validation)

### Key Security Notes

- `is_admin()` is `SECURITY DEFINER` — it runs with the function owner's privileges to read `profiles`, avoiding circular RLS issues.
- Staff cannot escalate their own role (no UPDATE policy on `profiles.role`).
- The `handle_new_user()` trigger is `SECURITY DEFINER` to insert into `profiles` before the user has any RLS access.
- Notifications INSERT is open to any authenticated user (staff need to notify admins on clock events).

---

## Storage Policy Explanation

### Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `documents` | Yes (read) | Staff compliance docs, client docs |
| `agreements` | Yes (read) | Signed PDF agreements |

### Why Public Read?

> ⚠️ **Staging/demo trade-off.** Public buckets are acceptable for staging because file paths contain UUID segments that are unguessable. For a production deployment handling real NDIS participant records, switch to **private buckets with signed URLs** (see Backend TODOs). Public read means anyone with a file URL can access it without authentication — acceptable for unguessable demo PDFs, not for real participant documents.

The app uses `getPublicUrl()` which returns a direct URL. Files are stored with UUID-based paths (`staff/{userId}/{docType}/{timestamp}_{filename}`) making them unguessable. Public read simplifies the frontend — no signed URLs needed for staging.

### Upload Restrictions

- **Documents**: Staff can only upload to `staff/{their-own-uid}/...` path. Admins can upload anywhere.
- **Agreements**: Only service role (API route) can write. Admins can manage via RLS.
- **Size limits**: 10MB for documents, 5MB for agreements.
- **MIME types**: PDF, JPEG, PNG, WebP for documents; PDF only for agreements.

---

## Setup Instructions

### Local Development

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Start local Supabase
cd vivid_care_web
supabase start

# 3. Apply migrations
supabase db reset
# This runs all migrations in order + seed.sql

# 4. Create test users via Supabase Studio
# Open http://localhost:54323 (Studio)
# Go to Authentication > Users > Create User
# Create these users with "Auto Confirm" checked:
#
# admin@vividcare.test / Password123!
#   User metadata: {"role": "admin", "full_name": "Sarah Mitchell"}
#
# staff1@vividcare.test / Password123!
#   User metadata: {"role": "staff", "full_name": "James Okonkwo"}
#
# staff2@vividcare.test / Password123!
#   User metadata: {"role": "staff", "full_name": "Priya Sharma"}
#
# staff3@vividcare.test / Password123!
#   User metadata: {"role": "staff", "full_name": "Tom Nguyen"}
#
# staff4@vividcare.test / Password123!
#   User metadata: {"role": "staff", "full_name": "Elena Vasquez"}

# 5. Run seed data
supabase db reset  # or manually run seed.sql in SQL Editor

# 6. Set env vars in .env.local
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>

# 7. Enable Realtime
# In Studio > Database > Replication, enable:
# - notifications (INSERT)
# - shifts (UPDATE)

# 8. Start the app
npm run dev
```

### Staging

```bash
# 1. Create a new Supabase project at https://supabase.com
# Choose region: ap-southeast-2 (Sydney) for Australian users

# 2. Link project
supabase link --project-ref <your-project-ref>

# 3. Push migrations
supabase db push

# 4. Create users via Dashboard
# Authentication > Users > Invite User (or Create User)
# Same 5 users as local, OR use real emails for staging testers

# 5. Run seed data
# SQL Editor > paste contents of supabase/seed.sql > Run

# 6. Verify storage buckets were created
# Storage > should see 'documents' and 'agreements' buckets

# 7. Enable Realtime
# Database > Replication > Source > Enable for:
# - public.notifications
# - public.shifts

# 8. Deploy Edge Functions
supabase functions deploy expiry-cron
supabase functions deploy geofence
supabase functions deploy notifications
supabase functions deploy ndis-compliance
supabase functions deploy payments

# 9. Set up cron (for expiry-cron function)
# Database > Extensions > Enable pg_cron
# SQL Editor:
SELECT cron.schedule(
  'expiry-check-daily',
  '0 6 * * *',  -- 6am daily (AWST)
  $$SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/expiry-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);

# 10. Set environment variables on your hosting platform
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from project settings>
SUPABASE_SERVICE_ROLE_KEY=<service role key — NEVER expose client-side>
```

### Production

Same as staging, plus:

```bash
# 1. Use a dedicated Supabase Pro project (not free tier)
# Pro tier provides: daily backups, no pausing, higher limits

# 2. Enable Point-in-Time Recovery (PITR)
# Dashboard > Database > Backups > Enable PITR

# 3. Set up custom domain (optional)
# Settings > Custom Domains

# 4. Security hardening
# - Restrict dashboard access to specific IPs
# - Enable MFA for dashboard login
# - Review API settings: disable unused auth methods
# - Set JWT expiry to 1 hour (Settings > Auth > JWT Expiry)

# 5. Monitoring
# - Enable Database Webhooks for critical events
# - Set up Supabase Log Drain to your monitoring tool
# - Configure alerts for: high error rate, auth failures, storage quota

# 6. Performance
# - Review slow query log after 1 week of usage
# - Consider read replicas if >1000 concurrent users
# - The indexes in migration 006 cover all hot query paths

# 7. Create production admin user
# Use a real email address (not @vividcare.test)
# Authentication > Create User:
#   email: admin@yourcompany.com
#   password: <strong unique password>
#   metadata: {"role": "admin", "full_name": "Your Name"}
#
# IMPORTANT: After first login, change password immediately.
```

---

## First Admin Setup

After deploying to a fresh Supabase project:

1. Apply all migrations (`supabase db push`)
2. Go to Authentication > Users > Create User
3. Enter your admin email and a strong password
4. Set user metadata: `{"role": "admin", "full_name": "Your Name"}`
5. Check "Auto Confirm Email"
6. Click Create
7. Login to the app at `/login`
8. You'll be redirected to `/admin/dashboard`
9. Go to Settings to configure organization details
10. Use Staff > New Staff to create staff accounts (uses service role internally)

---

## Assumptions

1. **No separate `staff_profiles` table** — The app uses `profiles` with `role = 'staff'` for all staff data. The plan mentioned `staff_profiles` but the codebase never queries it. Staff-specific data (documents, shifts) is linked via `profiles.id`.

2. **No `payments` table** — The app's payments page reads from `shifts` (completed shifts = billable). A real payments table would be needed for invoicing integration but is marked as TODO in the UI.

3. **`clients.status`** — Added as `active`/`inactive` with default `active`. Used only by roster-validation to prevent scheduling inactive clients.

4. **`shifts.staff_id` nullable** — Required for unassigned shifts. The original migration had `NOT NULL`; migration 006 drops that constraint.

5. **`clock_events` populated by trigger** — A DB trigger on `shifts` UPDATE automatically creates clock_event rows when `clock_in_time` or `clock_out_time` transitions from NULL to a value.

6. **Storage is public-read** — Files are accessed via `getPublicUrl()`. Security is path-based (UUID segments make URLs unguessable). For higher security, switch to signed URLs.

7. **`agreements.signing_token`** — Allows unauthenticated access to a single agreement for the signing page (`/sign/[token]`). The RLS policy only exposes `pending_signature` agreements via token.

---

## Backend TODOs

These are features referenced in the UI with placeholder/TODO markers:

| Feature | Current State | What's Needed |
|---------|--------------|---------------|
| **Private storage buckets** | Public buckets (staging only) | Switch to private buckets + `createSignedUrl()` before handling real participant documents |
| Payment processing | Shows shift hours as billable | Real `payments` table, NDIS claim integration, invoice generation |
| Staff availability | Placeholder tab in staff detail | `staff_availability` table with day/time slots |
| Push notifications | Inserts to DB table only | Firebase Cloud Messaging or OneSignal integration |
| Geofence validation | Edge function exists | Needs to be called from ClockClient before allowing clock-in |
| Incident attachments | Not implemented | Add `incident_attachments` table + storage bucket |
| Agreement PDF gen | API route generates basic PDF | Consider using a proper template engine (e.g. Puppeteer, PDFKit) |
| Shift reassignment | Button exists but disabled | Add reassignment logic + notification to new staff |
| NDIS claim export | Not started | CSV/XML export matching NDIS bulk upload format |
| Two-factor auth | Not implemented | Enable Supabase Auth MFA for admin users |
| Audit log viewer | `audit_events` table exists | Admin page to browse/filter audit events |

---

## Environment Variables Reference

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional (for edge functions)
OPENAI_API_KEY=sk-...  # Used by /api/chat support assistant
```

**NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` on the client side. It bypasses all RLS.
