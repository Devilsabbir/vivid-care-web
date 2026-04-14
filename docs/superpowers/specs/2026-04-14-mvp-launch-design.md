# MVP Launch — Design Spec

**Date:** 2026-04-14
**Scope:** Deploy VividCare MVP to production using Supabase (new project) + Netlify

---

## Context

The MVP codebase is fully built. All admin and staff routes exist, 3 Supabase migrations are ready, and 5 Edge Functions are implemented. The app has never been deployed to production. This spec covers the complete launch sequence from a fresh Supabase project to a live Netlify URL.

---

## Hosting

| Layer | Platform |
|-------|----------|
| Next.js app | Netlify (free tier) |
| Database + Auth + Storage + Realtime | Supabase (new project) |
| Edge Functions | Supabase Edge Functions |

---

## Supabase Project

- **Project ref:** `rvkoxsnjcazhdveaylm`
- **URL:** `https://rvkoxsnjcazhdveaylm.supabase.co`

---

## Environment Variables

These go into `.env.local` locally and into Netlify's environment variable settings for production.

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rvkoxsnjcazhdveaylm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon JWT (provided) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role JWT (provided) |
| `SUPABASE_SECRET_KEY` | `[REDACTED_SECRET_KEY]` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `[REDACTED_PUBLISHABLE_KEY]` |

---

## Launch Sequence

### Stage 1 — Update `.env.local`

Replace the existing `.env.local` with the 5 variables above pointing at `rvkoxsnjcazhdveaylm`.

### Stage 2 — Update project ref in package.json

The `supabase:link` script still points at the old project. Update it:

```json
"supabase:link": "npx supabase link --project-ref rvkoxsnjcazhdveaylm"
```

Then link:

```bash
npm run supabase:link
```

Requires `SUPABASE_ACCESS_TOKEN` set in the shell or interactive `npx supabase login` first.

### Stage 3 — Push database migrations

```bash
npm run supabase:db:push
```

Applies in order:
- `001_initial_schema.sql`
- `002_reset_policies.sql`
- `003_platform_expansion.sql`

### Stage 4 — Create storage buckets

Create 5 private buckets in the Supabase dashboard (Storage tab) or via CLI:
- `staff-documents`
- `client-documents`
- `agreements`
- `incident-attachments`
- `policy-hub`

### Stage 5 — Configure Edge Function secrets

```bash
npx supabase secrets set SUPABASE_URL=https://rvkoxsnjcazhdveaylm.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_jwt
npx supabase secrets set SUPABASE_SECRET_KEY=[REDACTED_SECRET_KEY]
```

Optional (for email/push — can be added post-launch):
```bash
npx supabase secrets set RESEND_API_KEY=<key>
```

### Stage 6 — Deploy Edge Functions

```bash
npm run supabase:functions:deploy:geofence
npm run supabase:functions:deploy:expiry
npm run supabase:functions:deploy:ndis
npm run supabase:functions:deploy:payments
npm run supabase:functions:deploy:notifications
```

### Stage 7 — Add Netlify plugin and config

Add `@netlify/plugin-nextjs` as a dev dependency:

```bash
npm install -D @netlify/plugin-nextjs
```

Add `netlify.toml` to the repo root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Commit both changes.

### Stage 8 — Connect repo to Netlify and set env vars

1. In Netlify dashboard: New site → Import from GitHub → select this repo
2. Build command: `npm run build` (auto-detected)
3. Add all 5 environment variables from the table above under Site settings → Environment variables
4. Deploy site

### Stage 9 — Create first admin user

After deploy, use the Supabase Auth dashboard to create the first admin user:
1. Authentication → Users → Invite user (or Add user)
2. After user is created, run a SQL snippet in the Supabase SQL editor to set their role:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
where email = 'your-admin@email.com';
```

### Stage 10 — Verify

Hit these routes on the live Netlify URL:

| Route | Expected |
|-------|----------|
| `/login` | Auth screen loads |
| `/admin/dashboard` | Admin portal loads after login |
| `/admin/settings` | Settings page loads |
| `/staff/home` | Staff portal loads |
| `/staff/clock` | Clock-in screen loads |

---

## Netlify Compatibility Notes

- `@netlify/plugin-nextjs` handles Server Actions, Route Handlers, and middleware correctly
- Edge Functions run on Supabase infrastructure — not Netlify — so no Netlify Edge config needed for them
- The localhost-only admin bypass in `middleware.ts` will not activate in production (it checks `NODE_ENV`)

---

## Out of Scope

- Custom domain (add post-launch via Netlify domain settings)
- Email provider integration (`RESEND_API_KEY`) — in-app notifications work without it
- Push notifications — Phase 2
- Seed data beyond first admin user
