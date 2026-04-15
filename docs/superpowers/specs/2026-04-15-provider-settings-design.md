# Provider Settings — Design Spec

**Date:** 2026-04-15
**Goal:** Store Vivid Care provider details in `organization_settings` so admin can edit them, and wire PDF generation to always use the latest saved values.

---

## Problem

Provider details (ABN, contact name, address, phone, email, website, NDIS registration) are hardcoded in `lib/agreements/constants.ts`. Generated PDFs always reflect the hardcoded values; there is no way for admin to update them without a code deploy.

---

## Solution

Extend the existing `organization_settings` singleton table with 3 missing fields, surface all provider fields in the existing Settings page, and update PDF generation to read from the DB row instead of the constant.

---

## Architecture

### 1. Database — migration

Add to `organization_settings`:
- `abn text` — business ABN
- `contact_name text` — authorised signatory name shown on PDFs
- `website text` — business website URL

The existing columns `org_name`, `business_email`, `business_phone`, `address`, `ndis_provider_number` already cover the remaining provider fields.

### 2. `lib/agreements/constants.ts` — real values + fallback

Update with real values provided by the client. This object remains the fallback used when the DB row is absent (e.g. fresh install before first settings save).

Fields to fill in:
- `abn`: `12 345 678 910`
- `address`: `41 Eddystone Ave`
- `phone`: `123456789`
- `email`: `kemaked@gmail.com`
- `contactName`: `Kemake Dissanayaka`
- `ndisRegistration`: `12345678910`
- `website`: `www.vividcare@demo.com`

### 3. `SettingsClient.tsx` — admin editing

Add a "Provider / Agreement details" sub-section to the existing Organisation settings form. Fields:
- ABN
- Contact name (authorised signatory)
- Website

The existing fields `org_name`, `business_email`, `business_phone`, `address`, `ndis_provider_number` are already in the form — no changes needed for those.

On save, all fields (existing + new) are upserted to `organization_settings` row `id = 1` as today.

### 4. `AgreementPDF.tsx` — accept provider prop

Add an optional `provider` prop of type `Partial<typeof VIVID_CARE>`. When rendering, merge `VIVID_CARE` constant with the passed `provider` object so any field the DB supplies overrides the fallback. This keeps the component self-contained and testable without a DB.

```ts
type ProviderDetails = {
  name: string
  abn: string
  address: string
  phone: string
  email: string
  contactName: string
  website: string
  ndisRegistration: string
}

// In props:
provider?: Partial<ProviderDetails>

// In render:
const providerDetails = { ...VIVID_CARE, ...provider }
```

### 5. `/api/agreements/sign` route — read from DB

After authenticating the request, read `organization_settings` row `id = 1` using the service client. Map the columns to a `provider` object and pass it to `createElement(AgreementPDF, { ..., provider })`.

Column mapping:
| DB column | Provider field |
|-----------|---------------|
| `org_name` | `name` |
| `abn` | `abn` |
| `address` | `address` |
| `business_phone` | `phone` |
| `business_email` | `email` |
| `contact_name` | `contactName` |
| `website` | `website` |
| `ndis_provider_number` | `ndisRegistration` |

If the DB read fails or the row is absent, fall back to `VIVID_CARE` constant (no error thrown).

---

## Error handling

- If `organization_settings` read fails, log the error and proceed with the constant fallback — PDF generation should never fail due to missing settings.
- Settings form: show inline error message on save failure (already handled by existing `SettingsClient` pattern).

---

## Out of scope

- Per-agreement provider overrides
- Multi-tenant or multi-provider support
- Logo upload (address separately if needed)
