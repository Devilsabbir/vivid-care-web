# MVP Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy VividCare MVP to production using a fresh Supabase project (`rvkoxsnjcazhdveaylfm`) and Netlify free tier.

**Architecture:** Next.js 14 App Router deployed to Netlify via `@netlify/plugin-nextjs`. Database, auth, storage, and Edge Functions all run on Supabase. No custom domain — live on Netlify subdomain for now.

**Tech Stack:** Next.js 14, Supabase CLI, Netlify CLI (optional), `@netlify/plugin-nextjs`

---

## New Supabase project credentials

| Variable | Value |
|----------|-------|
| Project ref | `rvkoxsnjcazhdveaylfm` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rvkoxsnjcazhdveaylfm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `[REDACTED_ANON_KEY]` |
| `SUPABASE_SERVICE_ROLE_KEY` | `[REDACTED_SERVICE_ROLE_KEY]` |
| `SUPABASE_SECRET_KEY` | `[REDACTED_SECRET_KEY]` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `[REDACTED_PUBLISHABLE_KEY]` |

---

## File map

| File | Action | Purpose |
|------|--------|---------|
| `.env.local` | Modify | Point all Supabase vars at new project |
| `package.json` | Modify | Update `supabase:link` project ref |
| `netlify.toml` | Create | Netlify build config + Next.js plugin |
| `package.json` devDependencies | Modify | Add `@netlify/plugin-nextjs` |

---

## Task 1: Update `.env.local`

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Replace `.env.local` content**

Overwrite the entire file with:

```
NEXT_PUBLIC_SUPABASE_URL=https://rvkoxsnjcazhdveaylfm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[REDACTED_PUBLISHABLE_KEY]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[REDACTED_ANON_KEY]
SUPABASE_SECRET_KEY=[REDACTED_SECRET_KEY]
SUPABASE_SERVICE_ROLE_KEY=[REDACTED_SERVICE_ROLE_KEY]
```

- [ ] **Step 2: Verify**

```bash
grep "rvkoxsnjcazhdveaylfm" .env.local
```

Expected output: 2 lines (URL and anon key both reference the new ref).

> `.env.local` is gitignored — do not commit it.

---

## Task 2: Update `package.json` supabase:link script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update the project ref in the link script**

In `package.json`, change:

```json
"supabase:link": "npx supabase link --project-ref qkywluziqjokvypghquu",
```

to:

```json
"supabase:link": "npx supabase link --project-ref rvkoxsnjcazhdveaylfm",
```

- [ ] **Step 2: Verify**

```bash
grep "rvkoxsnjcazhdveaylfm" package.json
```

Expected: `"supabase:link": "npx supabase link --project-ref rvkoxsnjcazhdveaylfm"`

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "Update Supabase project ref to rvkoxsnjcazhdveaylfm"
```

---

## Task 3: Authenticate Supabase CLI and link project

**Files:** none (CLI state only)

- [ ] **Step 1: Log in to Supabase CLI**

Run in terminal:

```bash
npx supabase login
```

This opens a browser. Approve the login. You should see:
`You are now logged in. Welcome <your-email>`

- [ ] **Step 2: Link to the new project**

```bash
npm run supabase:link
```

When prompted for database password, enter your Supabase project's database password (found in Supabase dashboard → Project Settings → Database → Database password).

Expected output:
```
Finished supabase link.
```

---

## Task 4: Push database migrations

**Files:** none (applies SQL to hosted DB)

- [ ] **Step 1: Push all 3 migrations**

```bash
npm run supabase:db:push
```

Expected output (all 3 applied with no errors):
```
Applying migration 001_initial_schema.sql...ok
Applying migration 002_reset_policies.sql...ok
Applying migration 003_platform_expansion.sql...ok
```

If you see `Already applied`, that means the migration ran previously — this is fine.

- [ ] **Step 2: Verify in Supabase dashboard**

Go to Supabase dashboard → Table Editor. Confirm these tables exist:
- `profiles`
- `shifts`
- `attendance_events`
- `incidents`
- `notifications`

---

## Task 5: Create storage buckets

**Files:** none (Supabase dashboard action)

- [ ] **Step 1: Create 5 private buckets**

Go to Supabase dashboard → Storage → New bucket. Create each:

| Bucket name | Public? |
|-------------|---------|
| `staff-documents` | No |
| `client-documents` | No |
| `agreements` | No |
| `incident-attachments` | No |
| `policy-hub` | No |

- [ ] **Step 2: Verify**

After creation, the Storage tab should list all 5 buckets.

---

## Task 6: Set Edge Function secrets

**Files:** none (Supabase CLI secrets)

- [ ] **Step 1: Set required secrets**

Run each command:

```bash
npx supabase secrets set SUPABASE_URL=https://rvkoxsnjcazhdveaylfm.supabase.co
```

```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[REDACTED_SERVICE_ROLE_KEY]
```

```bash
npx supabase secrets set SUPABASE_SECRET_KEY=[REDACTED_SECRET_KEY]
```

- [ ] **Step 2: Verify**

```bash
npx supabase secrets list
```

Expected: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_SECRET_KEY` all listed.

---

## Task 7: Deploy Edge Functions

**Files:** none (deploys from `supabase/functions/`)

- [ ] **Step 1: Deploy all 5 functions**

```bash
npm run supabase:functions:deploy:geofence
npm run supabase:functions:deploy:expiry
npm run supabase:functions:deploy:ndis
npm run supabase:functions:deploy:payments
npm run supabase:functions:deploy:notifications
```

Each should output:
```
Deployed Functions <name> on project rvkoxsnjcazhdveaylfm
```

- [ ] **Step 2: Verify in Supabase dashboard**

Go to Supabase dashboard → Edge Functions. All 5 should appear with status `Active`:
- `geofence`
- `expiry-cron`
- `ndis-compliance`
- `payments`
- `notifications`

---

## Task 8: Add Netlify plugin and config

**Files:**
- Modify: `package.json` (devDependencies)
- Create: `netlify.toml`

- [ ] **Step 1: Install `@netlify/plugin-nextjs`**

```bash
npm install -D @netlify/plugin-nextjs
```

Expected: package added to `devDependencies` in `package.json`.

- [ ] **Step 2: Create `netlify.toml`**

Create `netlify.toml` in the repo root with:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

- [ ] **Step 3: Verify local build works**

```bash
npm run build
```

Expected: Build completes with no errors. Output ends with:
```
Route (app)                              Size     First Load JS
...
✓ Compiled successfully
```

- [ ] **Step 4: Commit**

```bash
git add netlify.toml package.json package-lock.json
git commit -m "Add Netlify plugin and build config"
```

---

## Task 9: Push to GitHub

- [ ] **Step 1: Push branch to GitHub**

```bash
git push origin claude/vividcare-platform-design-cV21z
```

Expected:
```
Branch 'claude/vividcare-platform-design-cV21z' set up to track remote branch.
```

---

## Task 10: Deploy to Netlify

**Files:** none (Netlify dashboard)

- [ ] **Step 1: Create new Netlify site**

Go to [app.netlify.com](https://app.netlify.com) → Add new site → Import an existing project → GitHub.

Select this repo. Set:
- **Branch to deploy:** `claude/vividcare-platform-design-cV21z`
- **Build command:** `npm run build` (auto-detected)
- **Publish directory:** `.next` (auto-detected)

- [ ] **Step 2: Add environment variables**

Before deploying, go to Site configuration → Environment variables → Add a variable. Add all 5:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rvkoxsnjcazhdveaylfm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `[REDACTED_ANON_KEY]` |
| `SUPABASE_SERVICE_ROLE_KEY` | `[REDACTED_SERVICE_ROLE_KEY]` |
| `SUPABASE_SECRET_KEY` | `[REDACTED_SECRET_KEY]` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `[REDACTED_PUBLISHABLE_KEY]` |

- [ ] **Step 3: Trigger deploy**

Click **Deploy site**. Wait for the build to complete (3–5 min). Build log should end with:
```
Site is live ✓
```

---

## Task 11: Create first admin user

**Files:** none (Supabase dashboard)

**How it works:** When a user is created in Supabase Auth, a trigger (`on_auth_user_created`) automatically inserts a row into `public.profiles` with `role = 'staff'` by default. The middleware reads role from `profiles.role`. To make a user admin, update `profiles.role` after creation.

- [ ] **Step 1: Create user in Auth dashboard**

Go to Supabase dashboard → Authentication → Users → Add user → Create new user.

Enter the email and password for the admin account.

- [ ] **Step 2: Set admin role via SQL**

Go to Supabase dashboard → SQL Editor → New query. Run:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'YOUR_ADMIN_EMAIL_HERE'
);
```

Replace `YOUR_ADMIN_EMAIL_HERE` with the email you used in Step 1.

Expected output: `1 row updated`

---

## Task 12: Verify live app

- [ ] **Step 1: Check login page**

Open the Netlify URL (e.g. `https://vividcare.netlify.app`). Expected: login screen loads with no errors.

- [ ] **Step 2: Log in as admin**

Use the credentials from Task 11. Expected: redirect to `/admin/dashboard`.

- [ ] **Step 3: Check key admin routes**

| Route | Expected |
|-------|----------|
| `/admin/dashboard` | KPI cards visible |
| `/admin/settings` | Settings form loads |
| `/admin/roster` | Calendar loads |
| `/admin/staff` | Staff table loads (empty) |
| `/admin/clients` | Client table loads (empty) |

- [ ] **Step 4: Check staff route**

Create a staff user via Supabase Auth dashboard (Authentication → Users → Add user). No SQL update needed — the trigger defaults new users to `role = 'staff'` automatically. Log in with those credentials. Expected: redirect to `/staff/home`.

- [ ] **Step 5: Confirm Edge Function reachability**

Go to Supabase dashboard → Edge Functions → `geofence` → Logs. If it has never been called the log will be empty — that is expected. Confirm it shows `Active` status.
