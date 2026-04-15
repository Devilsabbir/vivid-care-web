# Provider Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store Vivid Care provider details in the existing `organization_settings` DB table and wire the PDF generation route to always use the latest saved values instead of hardcoded constants.

**Architecture:** Add 3 missing columns (`abn`, `contact_name`, `website`) to `organization_settings` via migration. Extend `SettingsClient.tsx` with those fields in the existing Organisation form. Update `AgreementPDF` to accept an optional `provider` prop that overrides the constant fallback. Update the sign API route to read `organization_settings` and pass a provider object to the PDF renderer.

**Tech Stack:** Next.js 14 App Router, Supabase Postgres, TypeScript, `@react-pdf/renderer`

---

### File map

| File | Action | What changes |
|------|--------|-------------|
| `supabase/migrations/005_provider_settings.sql` | Create | Add `abn`, `contact_name`, `website` columns |
| `lib/agreements/constants.ts` | Modify | Fill in real values |
| `components/agreements/AgreementPDF.tsx` | Modify | Accept optional `provider` prop, merge with constant |
| `app/admin/settings/SettingsClient.tsx` | Modify | Add 3 new `Input` fields + include in upsert |
| `app/api/agreements/sign/route.ts` | Modify | Read `organization_settings`, build provider object, pass to PDF |

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/005_provider_settings.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/005_provider_settings.sql

alter table public.organization_settings
  add column if not exists abn text,
  add column if not exists contact_name text,
  add column if not exists website text;
```

- [ ] **Step 2: Push the migration**

```bash
npm run supabase:db:push
```

Expected: migration applies without error.

- [ ] **Step 3: Verify in Supabase SQL editor**

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'organization_settings'
order by ordinal_position;
```

Expected: columns `abn`, `contact_name`, `website` appear in the list.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/005_provider_settings.sql
git commit -m "feat: add abn, contact_name, website columns to organization_settings"
```

---

### Task 2: Update constants with real values

**Files:**
- Modify: `lib/agreements/constants.ts`

- [ ] **Step 1: Replace placeholder values with real data**

Replace the entire file content with:

```ts
// lib/agreements/constants.ts

export const VIVID_CARE = {
  name: 'Vivid Care',
  abn: '12 345 678 910',
  address: '41 Eddystone Ave',
  phone: '123456789',
  email: 'kemaked@gmail.com',
  contactName: 'Kemake Dissanayaka',
  website: 'www.vividcare@demo.com',
  ndisRegistration: '12345678910',
}

export const AGREEMENT_VERSION = '1.0'
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/agreements/constants.ts
git commit -m "chore: update Vivid Care provider details in agreement constants"
```

---

### Task 3: Update AgreementPDF to accept provider prop

**Files:**
- Modify: `components/agreements/AgreementPDF.tsx`

- [ ] **Step 1: Add ProviderDetails type and update props**

Find the `export type AgreementPDFProps` block (currently around line 408) and replace it with:

```tsx
export type ProviderDetails = {
  name: string
  abn: string
  address: string
  phone: string
  email: string
  contactName: string
  website: string
  ndisRegistration: string
}

export type AgreementPDFProps = {
  participantName: string
  advocateName?: string | null
  supportDescription: string
  fundingType: 'self' | 'nominee' | 'ndia' | 'plan_manager'
  paymentMethod: 'eft' | 'cheque' | 'cash'
  commencementDate: string
  expiryDate?: string | null
  signerName: string
  signatureDataUrl: string | null
  signedAt: string
  provider?: Partial<ProviderDetails>
}
```

- [ ] **Step 2: Merge provider prop with constant in the component body**

Find the line `export default function AgreementPDF({` and update the function body to merge the provider prop. Replace the function signature and opening lines:

```tsx
export default function AgreementPDF({
  participantName,
  advocateName,
  supportDescription,
  fundingType,
  paymentMethod,
  commencementDate,
  expiryDate,
  signerName,
  signatureDataUrl,
  signedAt,
  provider,
}: AgreementPDFProps) {
  const p = { ...VIVID_CARE, ...provider }
```

- [ ] **Step 3: Replace all VIVID_CARE references in JSX with p**

In the JSX below (the `<Document>` tree), replace every `{VIVID_CARE.xxx}` with `{p.xxx}`. There are 8 references:

| Find | Replace |
|------|---------|
| `{VIVID_CARE.name}` | `{p.name}` |
| `{VIVID_CARE.address}` | `{p.address}` |
| `{VIVID_CARE.phone}` | `{p.phone}` |
| `{VIVID_CARE.email}` (×2) | `{p.email}` |
| `{VIVID_CARE.abn}` (×2) | `{p.abn}` |
| `{VIVID_CARE.contactName}` (×2) | `{p.contactName}` |

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/agreements/AgreementPDF.tsx
git commit -m "feat: AgreementPDF accepts optional provider prop, merges with constant fallback"
```

---

### Task 4: Update SettingsClient with new fields

**Files:**
- Modify: `app/admin/settings/SettingsClient.tsx`

- [ ] **Step 1: Extend SettingsRow type**

Find the `type SettingsRow` block and add 3 fields:

```ts
type SettingsRow = {
  id: number
  org_name: string
  business_email: string | null
  business_phone: string | null
  address: string | null
  timezone: string
  geofence_radius_meters: number
  clock_in_window_minutes: number
  doc_warning_days: number[]
  pay_period: string
  compliance_email: string | null
  ndis_provider_number: string | null
  abn: string | null
  contact_name: string | null
  website: string | null
}
```

- [ ] **Step 2: Update DEFAULT_SETTINGS in page.tsx**

Open `app/admin/settings/page.tsx` and add the 3 new fields to `DEFAULT_SETTINGS`:

```ts
const DEFAULT_SETTINGS = {
  id: 1,
  org_name: 'Vivid Care',
  business_email: '',
  business_phone: '',
  address: '',
  timezone: 'Australia/Perth',
  geofence_radius_meters: 300,
  clock_in_window_minutes: 15,
  doc_warning_days: [45, 30, 14, 7],
  pay_period: 'fortnightly',
  compliance_email: '',
  ndis_provider_number: '',
  abn: '',
  contact_name: '',
  website: '',
}
```

- [ ] **Step 3: Add new fields to the form grid in SettingsClient.tsx**

In the Organisation form grid (the `<div className="mt-5 grid gap-4 md:grid-cols-2">` block), add 3 new `Input` fields after the existing `NDIS provider number` input and before the `Timezone` input:

```tsx
<Input label="ABN" value={settingsForm.abn ?? ''} onChange={value => setSettingsForm(current => ({ ...current, abn: value }))} />
<Input label="Contact name (authorised signatory)" value={settingsForm.contact_name ?? ''} onChange={value => setSettingsForm(current => ({ ...current, contact_name: value }))} />
<Input label="Website" value={settingsForm.website ?? ''} onChange={value => setSettingsForm(current => ({ ...current, website: value }))} />
```

- [ ] **Step 4: Include new fields in the upsert call**

Inside `handleSaveSettings`, add the 3 new fields to the object passed to `.upsert()`:

```ts
const { error } = await supabase.from('organization_settings').upsert({
  id: 1,
  org_name: settingsForm.org_name,
  business_email: settingsForm.business_email || null,
  business_phone: settingsForm.business_phone || null,
  address: settingsForm.address || null,
  timezone: settingsForm.timezone,
  geofence_radius_meters: Number(settingsForm.geofence_radius_meters) || 300,
  clock_in_window_minutes: Number(settingsForm.clock_in_window_minutes) || 15,
  doc_warning_days: warningDays.length ? warningDays : [45, 30, 14, 7],
  pay_period: settingsForm.pay_period,
  compliance_email: settingsForm.compliance_email || null,
  ndis_provider_number: settingsForm.ndis_provider_number || null,
  abn: settingsForm.abn || null,
  contact_name: settingsForm.contact_name || null,
  website: settingsForm.website || null,
})
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/admin/settings/SettingsClient.tsx app/admin/settings/page.tsx
git commit -m "feat: add ABN, contact name, website fields to settings form"
```

---

### Task 5: Wire sign API route to read provider from DB

**Files:**
- Modify: `app/api/agreements/sign/route.ts`

- [ ] **Step 1: Add provider fetch at the start of the POST handler**

After the `const service = createServiceClient()` line (before `let agreement`), add:

```ts
// Read provider details from organization_settings; fall back to constant if absent
const { data: orgSettings } = await service
  .from('organization_settings')
  .select('org_name, abn, address, business_phone, business_email, contact_name, website, ndis_provider_number')
  .eq('id', 1)
  .maybeSingle()

const provider = orgSettings
  ? {
      name: orgSettings.org_name ?? undefined,
      abn: orgSettings.abn ?? undefined,
      address: orgSettings.address ?? undefined,
      phone: orgSettings.business_phone ?? undefined,
      email: orgSettings.business_email ?? undefined,
      contactName: orgSettings.contact_name ?? undefined,
      website: orgSettings.website ?? undefined,
      ndisRegistration: orgSettings.ndis_provider_number ?? undefined,
    }
  : undefined
```

- [ ] **Step 2: Pass provider to createElement**

In the `createElement(AgreementPDF, { ... })` call, add `provider` as a prop:

```ts
pdfBuffer = await renderToBuffer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createElement(AgreementPDF, {
    participantName,
    advocateName: agreement.advocate_name ?? null,
    supportDescription: agreement.supports_description ?? 'As discussed and agreed between the parties.',
    fundingType: agreement.funding_type ?? 'ndia',
    paymentMethod: agreement.payment_method ?? 'eft',
    commencementDate: agreement.created_at ? formatDate(agreement.created_at) : formatDate(signedAt),
    expiryDate: agreement.expires_on ? formatDate(agreement.expires_on) : null,
    signerName: signerName.trim(),
    signatureDataUrl,
    signedAt: formatDateTime(signedAt),
    provider,
  }) as any
)
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/agreements/sign/route.ts
git commit -m "feat: sign API route reads provider details from organization_settings"
```

---

### Task 6: Push and verify

- [ ] **Step 1: Push the branch**

```bash
git push
```

Expected: branch pushes cleanly, Netlify build starts.

- [ ] **Step 2: Seed settings via Admin UI**

1. Log in as admin → go to **Settings**
2. Fill in: ABN `12 345 678 910`, Contact name `Kemake Dissanayaka`, Website `www.vividcare@demo.com`
3. Verify the existing fields (org name, email, phone, address, NDIS number) still save correctly
4. Click **Save settings** → expected: "Settings saved."

- [ ] **Step 3: Verify PDF reflects DB values**

1. Go to **Agreements** → create a new agreement for any client
2. Click **Sign in person** → draw a signature → submit
3. Click **Download PDF**
4. Verify the PDF header shows the correct ABN, contact name, address, phone, email from the DB — not the old placeholder values
