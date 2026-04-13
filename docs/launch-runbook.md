# Vivid Care Launch Runbook

This repo is now set up so the remaining go-live work is operational rather than architectural. The app builds locally, the Supabase migrations are present, and the Edge Functions are implemented in `supabase/functions`.

## 1. Authenticate Supabase CLI

From `C:\Users\sabbi\vivid_care_web`:

```powershell
npx supabase login
```

If you prefer an environment variable instead of interactive login:

```powershell
$env:SUPABASE_ACCESS_TOKEN="your-token-here"
```

## 2. Link the hosted project

The current hosted Supabase project ref is `qkywluziqjokvypghquu`.

```powershell
npm run supabase:link
```

## 3. Apply database migrations

```powershell
npm run supabase:db:push
```

Expected migrations:

- `001_initial_schema.sql`
- `002_reset_policies.sql`
- `003_platform_expansion.sql`

## 4. Configure Edge Function secrets

At minimum, set:

```powershell
npx supabase secrets set SUPABASE_URL=https://qkywluziqjokvypghquu.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Before doing that, update [C:\Users\sabbi\vivid_care_web\.env.local](C:/Users/sabbi/vivid_care_web/.env.local) so it matches the same hosted project. The current file still points at a different Supabase project and must be replaced with the API URL, anon key, and service-role key for `qkywluziqjokvypghquu`.

Optional integrations:

- `RESEND_API_KEY` or `SENDGRID_API_KEY` for email fan-out
- `EXPO_ACCESS_TOKEN` or `FCM_SERVER_KEY` for push dispatch planning

## 5. Deploy Edge Functions

```powershell
npm run supabase:functions:deploy:geofence
npm run supabase:functions:deploy:expiry
npm run supabase:functions:deploy:ndis
npm run supabase:functions:deploy:payments
npm run supabase:functions:deploy:notifications
```

## 6. Verify the app

Start the app:

```powershell
npm run dev
```

Then check these routes:

- `/`
- `/admin/dashboard`
- `/admin/settings`
- `/admin/agreements`
- `/admin/service-documentation`
- `/staff/home`
- `/staff/clock`
- `/staff/documentation`

## 7. Production notes

- `middleware.ts` includes a localhost-only dashboard bypass for local review. Production auth remains role-gated.
- The new Edge Functions are service-role functions. They are intended for cron jobs, privileged workflows, or trusted server-to-server calls.
- The payments function returns a pre-payroll summary and rate breakdown. If final payroll export formats are required, add the export adapter after your real rates are confirmed.
- The notifications function currently persists in-app notifications and reports whether email/push providers are configured. It does not yet send provider-specific payloads directly.
