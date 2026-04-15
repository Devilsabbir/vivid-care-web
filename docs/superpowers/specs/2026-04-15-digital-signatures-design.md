# Digital Signatures — Design Spec

## Goal

Enable clients (or their advocates/representatives) to sign NDIS Service Agreements electronically — either in-person on a handed device or via a unique link — and generate a signed PDF stored in Supabase Storage.

## Architecture

Three new pieces plug into the existing agreements system:

1. **Public signing page** (`/sign/[token]`) — no login required. Accessed via a unique link containing a `signing_token` UUID. Shows the full Vivid Care Service Agreement, a signature canvas, and generates + uploads the PDF on submit.
2. **In-person signing view** (`/admin/agreements/[id]/sign`) — admin-authenticated route. Admin hands device to client; client signs; PDF generated and uploaded. Hides the admin nav for a clean client-facing experience.
3. **PDF component** (`components/agreements/AgreementPDF.tsx`) — a `@react-pdf/renderer` document that renders the full Vivid Care service agreement with participant details and signature image embedded. Generated client-side, uploaded to Supabase Storage `documents` bucket, URL saved to `agreements.pdf_url`.

### Database changes

One new migration (`005_digital_signatures.sql`):

```sql
ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS signing_token uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS signer_name text,
  ADD COLUMN IF NOT EXISTS advocate_name text,
  ADD COLUMN IF NOT EXISTS supports_description text,
  ADD COLUMN IF NOT EXISTS funding_type text CHECK (funding_type IN ('self', 'nominee', 'ndia', 'plan_manager')),
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('eft', 'cheque', 'cash'));
```

Existing columns already cover: `title`, `target_id`, `expires_on`, `signed_at`, `signature_data_url`, `pdf_url`, `status`.

### Storage

PDFs are uploaded to the existing `documents` Supabase Storage bucket at path `agreements/{agreement_id}.pdf`. The signed URL is saved to `agreements.pdf_url`.

---

## Vivid Care Service Agreement Template

The PDF renders a complete 15-section NDIS-compliant service agreement branded for Vivid Care.

**Provider details (hardcoded in PDF component):**
- Company: Vivid Care
- Role: NDIS Registered Service Provider
- ABN, address, phone, email — configurable via env vars or constants file

**Auto-populated from database:**
- Participant full name
- Advocate/representative name (if provided)
- Agreement commencement date and expiry date
- Description of supports
- Funding management type and payment method
- Signed date/time
- Participant signature image (PNG data URL from canvas)

**Sections rendered in PDF:**

| # | Section |
|---|---------|
| 1 | Parties — participant, advocate, provider, commencement/period |
| 2 | The NDIS and this Service Agreement — compliance clauses |
| 3 | Schedule of Supports — supports description |
| 4 | Responsibilities of Vivid Care — 18 provider obligations |
| 5 | Responsibilities of the Participant — 22 participant obligations |
| 6 | Payments — funding type and payment method clause |
| 7 | Changes to this Service Agreement |
| 8 | Ending this Service Agreement — 30 days notice |
| 9 | Feedback, Complaints and Disputes — internal contact + NDIS 1800 035 544 |
| 10 | GST — standard NDIS GST clause |
| 11 | Access to Records — NDIS auditor access clause |
| 12 | Information Storage — Privacy Act / NDIS Commission clause |
| 13 | Contact Details — participant and Vivid Care contact tables |
| 14 | Participant's Copy — acknowledgement clause |
| 15 | Agreement Signatures — participant signature image, printed name, date |

**Out of scope for Phase 2:**
- Schedule of Supports table with hourly rates (admin attaches separately)
- Access to Records checkboxes (paper form)
- Counter-signature from Vivid Care (admin signs paper copy)

---

## Signing Flows

### In-person flow

1. Admin opens an agreement with `status: pending_signature` in the agreements register
2. Clicks **"Sign in person"** button
3. Navigates to `/admin/agreements/[id]/sign` — full-screen view, admin nav hidden
4. Page shows: agreement title, participant name, scrollable agreement body, signature canvas
5. Client draws signature on canvas → taps **"Submit signature"**
6. Client-side: `@react-pdf/renderer` generates PDF blob → uploaded to Supabase Storage
7. Agreement row updated: `status: signed`, `signed_at`, `signature_data_url`, `pdf_url`, `signer_name`
8. Page shows confirmation; admin sees PDF download button in the agreements register

### Email link flow

1. Admin clicks **"Copy signing link"** on any `pending_signature` agreement
2. Link copied to clipboard: `https://{site}/sign/{signing_token}`
3. Admin pastes link into email or SMS and sends to client/guardian manually
4. Client opens link on their own device — no login required
5. Page shows: full agreement body, signature canvas, "Sign Agreement" button
6. Client signs → submits → same PDF generation + upload happens
7. Agreement updates to `signed`; admin sees the change in the register on next load

### Security

- `signing_token` is a random UUID (unguessable, 122 bits of entropy)
- Token is single-use: once `status = signed`, `/sign/[token]` shows "This agreement has already been signed"
- Expired agreements show "This signing link has expired"
- The public `/sign/[token]` route uses a Next.js API route with service-role Supabase client server-side — the `signing_token` is never exposed in the client bundle, only validated on the server

---

## New Fields in "Generate Agreement" Form

Admin fills these in when creating an agreement (additions to the existing modal):

| Field | Type | Required |
|-------|------|----------|
| Advocate / representative name | Text | No |
| Description of supports | Textarea | Yes |
| Funding management | Select (self / nominee / NDIA / plan manager) | Yes |
| Payment method | Select (EFT / cheque / cash) | Yes |

---

## Files Created / Modified

| File | Action |
|------|--------|
| `supabase/migrations/005_digital_signatures.sql` | Create — adds new columns to `agreements` |
| `components/agreements/AgreementPDF.tsx` | Create — `@react-pdf/renderer` document component |
| `lib/agreements/pdf.ts` | Create — PDF generation + Supabase Storage upload logic |
| `app/sign/[token]/page.tsx` | Create — public signing page (no auth) |
| `app/sign/[token]/SignClient.tsx` | Create — client component with canvas + PDF generation |
| `app/admin/agreements/[id]/sign/page.tsx` | Create — in-person signing route |
| `app/admin/agreements/[id]/sign/InPersonSignClient.tsx` | Create — in-person client component |
| `app/admin/agreements/AgreementsClient.tsx` | Modify — add "Sign in person" + "Copy signing link" buttons, add new form fields |

---

## Error Handling

- **Token not found**: `/sign/[token]` returns 404 page
- **Already signed**: Show "This agreement has already been signed" message
- **Expired**: Show "This signing link is no longer valid"
- **Empty signature**: Validate canvas is not blank before allowing submit
- **PDF upload failure**: Show error message, allow retry — agreement status NOT updated until upload succeeds
- **Storage bucket missing**: Graceful error with admin-facing message

---

## Testing

- Create an agreement → copy signing link → open in incognito → sign → verify PDF appears in admin register
- Create an agreement → click "Sign in person" → sign → verify PDF
- Attempt to use a signing link twice → verify blocked
- Attempt to sign an expired agreement → verify blocked
