# Digital Signatures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable clients to sign Vivid Care NDIS Service Agreements electronically (in-person or via email link) and generate a signed PDF stored in Supabase Storage.

**Architecture:** A Next.js API route (`/api/agreements/sign`) handles all signing logic server-side using the Supabase service role — it validates the request, generates a PDF with `@react-pdf/renderer`, uploads to the `documents` Storage bucket, and updates the agreement row. Two signing surfaces: a public page at `/sign/[token]` (no auth, email link flow) and an admin-only page at `/sign-inperson/[id]` (in-person flow, no admin nav). Both POST to the same API route.

**Tech Stack:** Next.js 14 App Router, `@react-pdf/renderer` (server-side PDF), Supabase Storage, `react-signature-canvas` (already installed), TypeScript

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/004_digital_signatures.sql`

- [ ] **Step 1: Create the migration file**

```sql
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
```

- [ ] **Step 2: Push the migration**

```bash
npm run supabase:db:push
```

Expected: migration applies without error. If you see "column already exists", the migration is idempotent — ignore the notice.

- [ ] **Step 3: Verify in Supabase SQL editor**

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'agreements'
order by ordinal_position;
```

Expected: columns `signing_token`, `signer_name`, `advocate_name`, `supports_description`, `funding_type`, `payment_method` all appear.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_digital_signatures.sql
git commit -m "feat: add digital signature columns to agreements"
```

---

### Task 2: Install @react-pdf/renderer

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install @react-pdf/renderer
```

Expected: package added to `dependencies` in `package.json`. No build errors.

- [ ] **Step 2: Verify installation**

```bash
node -e "const r = require('@react-pdf/renderer'); console.log('ok', Object.keys(r).slice(0,5))"
```

Expected output: `ok [ 'Document', 'Page', ... ]` (list of exports).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @react-pdf/renderer for agreement PDF generation"
```

---

### Task 3: Provider constants and service role client

**Files:**
- Create: `lib/agreements/constants.ts`
- Create: `lib/supabase/service.ts`

- [ ] **Step 1: Create provider constants**

```ts
// lib/agreements/constants.ts

export const VIVID_CARE = {
  name: 'Vivid Care',
  abn: 'XX XXX XXX XXX',         // Update with real ABN
  address: '123 Example Street, Melbourne VIC 3000',
  phone: '03 XXXX XXXX',
  email: 'admin@vividcare.com.au',
  contactName: 'Vivid Care Administration',
  website: 'www.vividcare.com.au',
  ndisRegistration: 'XXXXXXXXX',  // Update with real NDIS registration number
}

export const AGREEMENT_VERSION = '1.0'
```

- [ ] **Step 2: Create service role Supabase client**

This client bypasses RLS — only use it in server-side API routes, never in the browser.

```ts
// lib/supabase/service.ts

import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
```

- [ ] **Step 3: Verify the service client builds**

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add lib/agreements/constants.ts lib/supabase/service.ts
git commit -m "feat: add provider constants and service role Supabase client"
```

---

### Task 4: AgreementPDF component

**Files:**
- Create: `components/agreements/AgreementPDF.tsx`

This is the `@react-pdf/renderer` document that renders the full 15-section Vivid Care NDIS Service Agreement. Do NOT add `'use client'` — it runs server-side in the API route.

- [ ] **Step 1: Create the component**

```tsx
// components/agreements/AgreementPDF.tsx

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import { VIVID_CARE, AGREEMENT_VERSION } from '@/lib/agreements/constants'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a18',
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  headerBar: {
    backgroundColor: '#1a1a18',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    borderRadius: 4,
  },
  headerTitle: {
    color: '#cdff52',
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    letterSpacing: 2,
  },
  headerSub: {
    color: '#a8a49d',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },
  providerBlock: {
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#cdff52',
    paddingLeft: 10,
  },
  providerRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  providerLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    width: 90,
    color: '#4f4c45',
  },
  providerValue: {
    fontSize: 9,
    color: '#1a1a18',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: '#8a877f',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9,
    color: '#1a1a18',
    fontFamily: 'Helvetica-Bold',
  },
  sectionHeading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#1a1a18',
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e4dc',
    paddingBottom: 4,
  },
  subHeading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#1a1a18',
    marginTop: 8,
    marginBottom: 4,
  },
  body: {
    fontSize: 9.5,
    lineHeight: 1.6,
    color: '#3a3832',
    marginBottom: 6,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  listBullet: {
    width: 16,
    fontSize: 9.5,
    color: '#3a3832',
  },
  listText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.6,
    color: '#3a3832',
  },
  infoBox: {
    backgroundColor: '#f4f2ed',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  infoBoxText: {
    fontSize: 9,
    color: '#4f4c45',
    lineHeight: 1.5,
    fontFamily: 'Helvetica-Oblique',
  },
  partiesTable: {
    borderWidth: 1,
    borderColor: '#e0dbd3',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  partiesRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0dbd3',
  },
  partiesRowLast: {
    flexDirection: 'row',
  },
  partiesLabel: {
    backgroundColor: '#1a1a18',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    width: 140,
    padding: 8,
  },
  partiesValue: {
    flex: 1,
    fontSize: 9.5,
    color: '#1a1a18',
    padding: 8,
  },
  signatureSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e8e4dc',
    paddingTop: 16,
  },
  signatureRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  signatureBox: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#8a877f',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  signatureImage: {
    width: '100%',
    height: 70,
    borderWidth: 1,
    borderColor: '#dfd9cf',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    objectFit: 'contain',
  },
  signatureName: {
    fontSize: 9,
    color: '#1a1a18',
    marginTop: 6,
    fontFamily: 'Helvetica-Bold',
  },
  signatureDate: {
    fontSize: 9,
    color: '#8a877f',
    marginTop: 2,
  },
  footerNote: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 7.5,
    color: '#a8a49d',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e0dbd3',
    paddingTop: 8,
  },
})

function Clause({ letter, text }: { letter: string; text: string }) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.listBullet}>({letter})</Text>
      <Text style={styles.listText}>{text}</Text>
    </View>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.listBullet}>•</Text>
      <Text style={styles.listText}>{text}</Text>
    </View>
  )
}

export type AgreementPDFProps = {
  participantName: string
  advocateName?: string | null
  supportDescription: string
  fundingType: 'self' | 'nominee' | 'ndia' | 'plan_manager'
  paymentMethod: 'eft' | 'cheque' | 'cash'
  commencementDate: string   // formatted date string e.g. "15 April 2026"
  expiryDate?: string | null // formatted date string
  signerName: string
  signatureDataUrl: string
  signedAt: string           // formatted date/time string
}

const FUNDING_CLAUSES: Record<string, string> = {
  self: 'The participant has chosen to self-manage the funding for NDIS supports provided under this Service Agreement. After providing supports, Vivid Care will send the participant an invoice for those supports. The participant will pay by EFT/cheque/cash within 7 days.',
  nominee: "The participant's Nominee manages the funding for supports under this Service Agreement. After providing supports, Vivid Care will send the Nominee an invoice. The Nominee will pay by EFT within 7 days.",
  ndia: 'The participant has nominated the NDIA to manage the funding for supports under this Service Agreement. After providing supports, Vivid Care will claim payment directly from the NDIS.',
  plan_manager: 'The participant has nominated a Registered Plan Management Provider to manage the funding for NDIS supports under this Service Agreement. After providing supports, Vivid Care will claim payment from the Plan Management Provider.',
}

const PAYMENT_LABELS: Record<string, string> = {
  eft: 'Electronic Funds Transfer (EFT)',
  cheque: 'Cheque',
  cash: 'Cash',
}

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
}: AgreementPDFProps) {
  return (
    <Document
      title={`Vivid Care Service Agreement — ${participantName}`}
      author="Vivid Care"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>SERVICE AGREEMENT</Text>
          <Text style={styles.headerSub}>Vivid Care · NDIS Registered Service Provider</Text>
        </View>

        {/* Provider details */}
        <View style={styles.providerBlock}>
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>Company Name:</Text>
            <Text style={styles.providerValue}>{VIVID_CARE.name}</Text>
          </View>
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>Address:</Text>
            <Text style={styles.providerValue}>{VIVID_CARE.address}</Text>
          </View>
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>Phone:</Text>
            <Text style={styles.providerValue}>{VIVID_CARE.phone}</Text>
          </View>
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>Email:</Text>
            <Text style={styles.providerValue}>{VIVID_CARE.email}</Text>
          </View>
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>ABN:</Text>
            <Text style={styles.providerValue}>{VIVID_CARE.abn}</Text>
          </View>
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>Version:</Text>
            <Text style={styles.providerValue}>{AGREEMENT_VERSION}</Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date Prepared</Text>
            <Text style={styles.metaValue}>{commencementDate}</Text>
          </View>
          {expiryDate ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Review Date</Text>
              <Text style={styles.metaValue}>{expiryDate}</Text>
            </View>
          ) : null}
        </View>

        {/* Note box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxText}>
            NOTE: A Service Agreement can be made between a participant and a provider or a participant's representative and a provider. A participant's representative is someone close to the participant, such as a family member or friend, or someone who manages the funding for supports under a participant's NDIS plan.
          </Text>
        </View>

        {/* Section 1 */}
        <Text style={styles.sectionHeading}>1. Parties</Text>
        <Text style={styles.body}>
          This Service Agreement is for {participantName}, a participant in the National Disability Insurance Scheme and is made between:
        </Text>

        <View style={styles.partiesTable}>
          <View style={styles.partiesRow}>
            <Text style={styles.partiesLabel}>Participant</Text>
            <Text style={styles.partiesValue}>{participantName}</Text>
          </View>
          <View style={styles.partiesRowLast}>
            <Text style={styles.partiesLabel}>Advocate / Participant's Representative</Text>
            <Text style={styles.partiesValue}>{advocateName ?? '—'}</Text>
          </View>
        </View>

        <Text style={[styles.body, { marginBottom: 4, marginTop: 4 }]}>and</Text>

        <View style={styles.partiesTable}>
          <View style={styles.partiesRowLast}>
            <Text style={styles.partiesLabel}>Provider</Text>
            <Text style={styles.partiesValue}>{VIVID_CARE.name}</Text>
          </View>
        </View>

        <Text style={styles.body}>
          This Service Agreement will commence on {commencementDate}{expiryDate ? ` for the period ${commencementDate} to ${expiryDate}` : ''}.
        </Text>

        {/* Section 2 */}
        <Text style={styles.sectionHeading}>2. The NDIS and this Service Agreement</Text>
        <Clause letter="a" text="This Agreement is made according to the rules and goals of the National Disability Insurance Scheme (NDIS)." />
        <Clause letter="b" text="The participant and Vivid Care agree that this Agreement is in line with the main ideas of the NDIS, including having more choices, achieving goals, and taking part in the community." />
        <Clause letter="c" text="The parties agree that this Service Agreement is made in the context of the NDIS, which is a scheme that aims to:" />
        <Bullet text="support the independence and social and economic participation of people with disability; and" />
        <Bullet text="enable people with a disability to exercise choice and control in the pursuit of their goals and the planning and delivery of their supports." />
        <Clause letter="d" text="A copy of the participant's NDIS plan may be attached to this Service Agreement where the participant consents." />
      </Page>

      <Page size="A4" style={styles.page}>
        {/* Section 3 */}
        <Text style={styles.sectionHeading}>3. Schedule of Supports</Text>
        <Text style={styles.body}>
          Vivid Care agrees to provide the following supports to the participant:
        </Text>
        <View style={styles.infoBox}>
          <Text style={[styles.body, { marginBottom: 0 }]}>{supportDescription}</Text>
        </View>
        <Text style={styles.body}>
          The supports will be provided according to the participant's preferred times and schedule, as agreed between the parties. All prices are inclusive of GST (if applicable) and are in line with the NDIS Price Guide current at the time of delivery. Additional expenses not included as part of the participant's NDIS supports (such as entrance fees, meals, transport costs, and personal care products) are the responsibility of the participant or their representative.
        </Text>

        {/* Section 4 */}
        <Text style={styles.sectionHeading}>4. Responsibilities of Vivid Care</Text>
        <Text style={[styles.subHeading, { marginTop: 4 }]}>Vivid Care agrees to:</Text>
        <Clause letter="a" text="Review the provision of supports at least monthly with the participant or their representative." />
        <Clause letter="b" text="Complete an individual evacuation plan if required — this plan will be added as an appendix to this agreement." />
        <Clause letter="c" text="Once agreed, provide supports that meet the participant's needs at the participant's preferred times." />
        <Clause letter="d" text="Communicate openly and honestly in a timely manner." />
        <Clause letter="e" text="Treat the participant with courtesy and respect at all times." />
        <Clause letter="f" text="Consult the participant on decisions about how supports are provided." />
        <Clause letter="g" text="Ensure that there is no conflict of interest and inform the participant if there is any potential for this." />
        <Clause letter="h" text="Provide supports that meet the participant's needs at the preferred times." />
        <Clause letter="i" text="Review the provision of supports at least monthly." />
        <Clause letter="j" text="Provide information about managing any complaints or disagreements and details of the cancellation policy." />
        <Clause letter="k" text="Listen to the participant's feedback and resolve problems quickly." />
        <Clause letter="l" text="Give the participant a minimum of 24 hours' notice if Vivid Care has to change a scheduled appointment." />
        <Clause letter="m" text="Keep all personal information private and confidential." />
        <Clause letter="n" text="Keep the participant safe and ensure the safety of all others during service delivery." />
        <Clause letter="o" text="Give the participant the required notice if Vivid Care needs to end the Service Agreement (see Section 8)." />
        <Clause letter="p" text="Protect the participant's privacy and confidential information, including personal data, health information, and other personal details gathered during the intake process. This information remains private during the delivery of services." />
        <Clause letter="q" text="Provide supports in a manner consistent with all relevant laws, including the National Disability Insurance Scheme Act 2013 and the Australian Consumer Law; keep accurate records on the supports provided." />
        <Clause letter="r" text="Issue regular invoices and statements of the supports delivered to the participant." />
        <Text style={[styles.body, { marginTop: 6, fontFamily: 'Helvetica-Bold' }]}>
          Zero Tolerance Policy: Vivid Care has policies and procedures built on human rights. Where allegations of abuse, neglect, violence, exploitation, or discrimination are made, Vivid Care employs a Zero Tolerance policy.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        {/* Section 5 */}
        <Text style={styles.sectionHeading}>5. Responsibilities of the Participant / Participant's Representative</Text>
        <Text style={[styles.subHeading, { marginTop: 4 }]}>The participant/participant's representative agrees to:</Text>
        <Clause letter="a" text="Respect the rights of staff, ensuring their workplace is safe, healthy, and free from harassment." />
        <Clause letter="b" text="Abide by the terms of this Service Agreement." />
        <Clause letter="c" text="Understand that needs may change and, with this, services may need to change to meet those needs." />
        <Clause letter="d" text="Accept responsibility for their own actions and choices, even though some choices may involve risk." />
        <Clause letter="e" text="Tell Vivid Care if there are problems with the care and services being received." />
        <Clause letter="f" text="Give Vivid Care enough information to develop, deliver, and review the support plan." />
        <Clause letter="g" text="Care for their own health and wellbeing as much as they are able." />
        <Clause letter="h" text="Provide Vivid Care with information that will help better meet the participant's needs." />
        <Clause letter="i" text="Provide a minimum of 24 hours' notice when the participant will not be home for their service." />
        <Clause letter="j" text="Be aware that Vivid Care staff are only authorised to perform the agreed number of hours and tasks outlined in this Service Agreement." />
        <Clause letter="k" text="Participate in safety assessments of the participant's home." />
        <Clause letter="l" text="Ensure pets are controlled during service provision." />
        <Clause letter="m" text="Provide a smoke-free working environment during support delivery." />
        <Clause letter="n" text="Pay the agreed amount for the services provided." />
        <Clause letter="o" text="Tell Vivid Care in writing and give notice prior to the day they intend to stop receiving services." />
        <Clause letter="p" text="Inform staff if they wish to opt out of any support activity when asked." />
        <Clause letter="q" text="Inform Vivid Care about how they wish the supports to be delivered to meet the participant's needs." />
        <Clause letter="r" text="Treat Vivid Care staff with courtesy and respect." />
        <Clause letter="s" text="Talk to Vivid Care if the participant has any concerns about the supports being provided." />
        <Clause letter="t" text="Give Vivid Care a minimum of 24 hours' notice if the participant cannot make a scheduled appointment; if notice is not provided by then, the cancellation policy will apply." />
        <Clause letter="u" text="Give Vivid Care the required notice if the participant needs to end the Service Agreement (see Section 8)." />
        <Clause letter="v" text="Let Vivid Care know immediately if the participant's NDIS plan is suspended, replaced by a new NDIS plan, or the participant stops being a participant in the NDIS." />

        {/* Section 6 */}
        <Text style={styles.sectionHeading}>6. Payments</Text>
        <Text style={styles.body}>
          Vivid Care will seek payment for the provision of supports after the participant or their representative confirms satisfactory delivery.
        </Text>
        <Text style={styles.body}>{FUNDING_CLAUSES[fundingType]}</Text>
        <Text style={styles.body}>
          Preferred payment method: {PAYMENT_LABELS[paymentMethod]}.
        </Text>
        <Text style={styles.body}>
          A supply of supports under this Service Agreement is a supply of one or more reasonable and necessary supports specified in the statement of supports included, under subsection 33(2) of the National Disability Insurance Scheme Act 2013 (NDIS Act), in the participant's NDIS Plan currently in effect under section 37 of the NDIS Act.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        {/* Section 7 */}
        <Text style={styles.sectionHeading}>7. Changes to this Service Agreement</Text>
        <Text style={styles.body}>
          If changes to the supports or their delivery are required, the parties agree to discuss and review this Service Agreement. Any changes to this Service Agreement will be in writing, signed, and dated by both parties.
        </Text>

        {/* Section 8 */}
        <Text style={styles.sectionHeading}>8. Ending this Service Agreement</Text>
        <Text style={styles.body}>
          Should either party wish to end this Service Agreement they must give 30 days' notice in writing. If either party seriously breaches this Service Agreement the requirement of notice will be waived.
        </Text>

        {/* Section 9 */}
        <Text style={styles.sectionHeading}>9. Feedback, Complaints and Disputes</Text>
        <Text style={styles.body}>
          If the participant wishes to give feedback or make a complaint, they can contact: {VIVID_CARE.contactName} at {VIVID_CARE.phone} or {VIVID_CARE.email}.
        </Text>
        <Text style={styles.body}>
          If the participant is not satisfied or does not wish to talk to Vivid Care, they can contact the National Disability Insurance Scheme by calling 1800 035 544, visiting one of their offices in person, or visiting ndis.gov.au for further information.
        </Text>

        {/* Section 10 */}
        <Text style={styles.sectionHeading}>10. Goods and Services Tax (GST)</Text>
        <Text style={styles.body}>For the purposes of GST legislation, the parties confirm that:</Text>
        <Clause letter="a" text="A supply of supports under this Service Agreement is a supply of one or more of the reasonable and necessary supports specified in the statement included under subsection 33(2) of the NDIS Act in the participant's NDIS plan currently in effect under section 37 of the NDIS Act;" />
        <Clause letter="b" text="The participant's NDIS plan is expected to remain in effect during the period the supports are provided; and" />
        <Clause letter="c" text="The participant or their representative will immediately notify Vivid Care if the participant's NDIS Plan is replaced by a new plan or the participant stops being a participant in the NDIS." />

        {/* Section 11 */}
        <Text style={styles.sectionHeading}>11. Access to Records</Text>
        <Text style={styles.body}>
          The participant's file may be accessed by a NDIS Registered Auditor for audit purposes only, with the participant's consent. Access to participant records by other parties (such as support coordinators, plan managers, family members, or other practitioners) is granted only as agreed in writing between the participant and Vivid Care.
        </Text>

        {/* Section 12 */}
        <Text style={styles.sectionHeading}>12. Information Storage</Text>
        <Text style={styles.body}>
          Vivid Care may collect personal information about the participant from the participant, their representative, or a third party, using forms, online portals, and other electronic or paper correspondence. Vivid Care will not ask for any personal information which is not needed. All personal information is collected and stored in accordance with the Privacy Act 1988 and the Australian Privacy Principles. Information is collected for purposes that are reasonably necessary for, or directly related to, the delivery of NDIS supports.
        </Text>

        {/* Section 13 */}
        <Text style={styles.sectionHeading}>13. Contact Details</Text>
        <Text style={[styles.subHeading, { marginTop: 4 }]}>Participant / Representative:</Text>
        <View style={styles.partiesTable}>
          <View style={styles.partiesRow}>
            <Text style={styles.partiesLabel}>Name</Text>
            <Text style={styles.partiesValue}>{participantName}</Text>
          </View>
          {advocateName ? (
            <View style={styles.partiesRow}>
              <Text style={styles.partiesLabel}>Representative</Text>
              <Text style={styles.partiesValue}>{advocateName}</Text>
            </View>
          ) : null}
          <View style={styles.partiesRowLast}>
            <Text style={styles.partiesLabel}>Phone / Email</Text>
            <Text style={styles.partiesValue}></Text>
          </View>
        </View>

        <Text style={[styles.subHeading, { marginTop: 8 }]}>Provider (Vivid Care):</Text>
        <View style={styles.partiesTable}>
          <View style={styles.partiesRow}>
            <Text style={styles.partiesLabel}>Contact Name</Text>
            <Text style={styles.partiesValue}>{VIVID_CARE.contactName}</Text>
          </View>
          <View style={styles.partiesRow}>
            <Text style={styles.partiesLabel}>Phone</Text>
            <Text style={styles.partiesValue}>{VIVID_CARE.phone}</Text>
          </View>
          <View style={styles.partiesRow}>
            <Text style={styles.partiesLabel}>Email</Text>
            <Text style={styles.partiesValue}>{VIVID_CARE.email}</Text>
          </View>
          <View style={styles.partiesRowLast}>
            <Text style={styles.partiesLabel}>Address</Text>
            <Text style={styles.partiesValue}>{VIVID_CARE.address}</Text>
          </View>
        </View>

        {/* Section 14 */}
        <Text style={styles.sectionHeading}>14. Participant's Copy of Service Agreement</Text>
        <Text style={styles.body}>
          The participant confirms they have been offered a copy of this signed Service Agreement upon completion. A digital copy (PDF) is available upon request from Vivid Care.
        </Text>

        {/* Section 15 - Signatures */}
        <Text style={styles.sectionHeading}>15. Agreement Signatures</Text>
        <Text style={styles.body}>
          The parties agree to the terms and conditions of this Service Agreement. This agreement has been explained verbally and the participant has had the opportunity to ask questions.
        </Text>

        <View style={styles.signatureSection}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Signature of Participant / Representative</Text>
              {signatureDataUrl ? (
                <Image src={signatureDataUrl} style={styles.signatureImage} />
              ) : (
                <View style={styles.signatureImage} />
              )}
              <Text style={styles.signatureName}>{signerName}</Text>
              <Text style={styles.signatureDate}>Date: {signedAt}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Authorised Person from Vivid Care</Text>
              <View style={styles.signatureImage} />
              <Text style={styles.signatureName}>{VIVID_CARE.contactName}</Text>
              <Text style={styles.signatureDate}>Date: ___________________</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Vivid Care · ABN {VIVID_CARE.abn} · {VIVID_CARE.address} · {VIVID_CARE.email}
          {'\n'}This document was digitally signed on {signedAt}. Generated by Vivid Care platform.
        </Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see "'Document' cannot be used as a JSX component", ensure `@react-pdf/renderer` is installed and `tsconfig.json` includes `"jsx": "preserve"` (Next.js default).

- [ ] **Step 3: Commit**

```bash
git add components/agreements/AgreementPDF.tsx
git commit -m "feat: add Vivid Care NDIS Service Agreement PDF component"
```

---

### Task 5: Signing API route

**Files:**
- Create: `app/api/agreements/sign/route.ts`

This route handles both the public email-link flow (identified by `token`) and the admin in-person flow (identified by `id`). It validates the request, generates the PDF server-side, uploads to Supabase Storage, and updates the agreement row.

- [ ] **Step 1: Create the route**

```ts
// app/api/agreements/sign/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import AgreementPDF from '@/components/agreements/AgreementPDF'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function POST(request: NextRequest) {
  let body: {
    token?: string
    id?: string
    signerName: string
    signatureDataUrl: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { token, id, signerName, signatureDataUrl } = body

  if (!signerName?.trim()) {
    return NextResponse.json({ error: 'signerName is required' }, { status: 400 })
  }
  if (!signatureDataUrl?.startsWith('data:image/')) {
    return NextResponse.json({ error: 'signatureDataUrl is required' }, { status: 400 })
  }
  if (!token && !id) {
    return NextResponse.json({ error: 'token or id is required' }, { status: 400 })
  }

  const service = createServiceClient()
  let agreement: Record<string, any>

  if (token) {
    // Public flow — look up by signing_token (no auth required)
    const { data, error } = await service
      .from('agreements')
      .select('*, clients(full_name)')
      .eq('signing_token', token)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }
    if (data.status === 'signed') {
      return NextResponse.json({ error: 'Already signed' }, { status: 409 })
    }
    if (data.status === 'expired') {
      return NextResponse.json({ error: 'This agreement has expired' }, { status: 410 })
    }
    agreement = data
  } else {
    // Admin in-person flow — verify admin session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await service
      .from('agreements')
      .select('*, clients(full_name)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 })
    }
    agreement = data
  }

  const signedAt = new Date().toISOString()
  const participantName: string = agreement.clients?.full_name ?? signerName

  // Generate PDF
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(
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
      })
    )
  } catch (err) {
    console.error('PDF generation failed:', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }

  // Upload to Supabase Storage
  const filePath = `agreements/${agreement.id}.pdf`
  const { error: uploadError } = await service.storage
    .from('documents')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('Storage upload failed:', uploadError)
    return NextResponse.json({ error: 'PDF upload failed' }, { status: 500 })
  }

  // Generate signed URL valid for ~20 years
  const { data: signedData, error: signedUrlError } = await service.storage
    .from('documents')
    .createSignedUrl(filePath, 630_720_000)

  if (signedUrlError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate download URL' }, { status: 500 })
  }

  // Update agreement row
  const { error: updateError } = await service
    .from('agreements')
    .update({
      status: 'signed',
      signed_at: signedAt,
      signature_data_url: signatureDataUrl,
      signer_name: signerName.trim(),
      pdf_url: signedData.signedUrl,
    })
    .eq('id', agreement.id)

  if (updateError) {
    console.error('Agreement update failed:', updateError)
    return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 })
  }

  return NextResponse.json({ success: true, pdfUrl: signedData.signedUrl })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/agreements/sign/route.ts
git commit -m "feat: add /api/agreements/sign route for PDF generation and signing"
```

---

### Task 6: Public signing page /sign/[token]

**Files:**
- Create: `app/sign/[token]/page.tsx`
- Create: `app/sign/[token]/SignClient.tsx`

This page is accessible without login. The server component looks up the agreement by `signing_token` using the service role, then passes the data to the client component.

- [ ] **Step 1: Create the server component**

```tsx
// app/sign/[token]/page.tsx

import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import SignClient from './SignClient'

export default async function PublicSignPage({
  params,
}: {
  params: { token: string }
}) {
  const service = createServiceClient()

  const { data: agreement, error } = await service
    .from('agreements')
    .select('id, title, status, expires_on, signing_token, clients(full_name)')
    .eq('signing_token', params.token)
    .single()

  if (error || !agreement) return notFound()

  const participantName =
    (agreement.clients as any)?.full_name ?? 'Participant'

  return (
    <div className="min-h-screen bg-[#edecea]">
      <SignClient
        token={params.token}
        agreementId={agreement.id}
        agreementTitle={agreement.title}
        participantName={participantName}
        status={agreement.status}
        expiresOn={agreement.expires_on ?? null}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create the client component**

```tsx
// app/sign/[token]/SignClient.tsx
'use client'

import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

export default function SignClient({
  token,
  agreementId,
  agreementTitle,
  participantName,
  status,
  expiresOn,
}: {
  token: string
  agreementId: string
  agreementTitle: string
  participantName: string
  status: string
  expiresOn: string | null
}) {
  const [signerName, setSignerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signatureRef = useRef<SignatureCanvas | null>(null)

  if (status === 'signed') {
    return <StatusScreen title="Already signed" message="This agreement has already been signed. Thank you." icon="check_circle" />
  }

  if (status === 'expired') {
    return <StatusScreen title="Link expired" message="This signing link is no longer valid. Please contact Vivid Care." icon="schedule" />
  }

  if (done) {
    return <StatusScreen title="Signed successfully" message="Thank you for signing. Your signed agreement has been saved. You may close this window." icon="verified" />
  }

  async function handleSubmit() {
    if (!signerName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError('Please draw your signature above.')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      const signatureDataUrl = signatureRef.current.toDataURL('image/png')
      const res = await fetch('/api/agreements/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signerName, signatureDataUrl }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      setDone(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a1a18]">
          <span className="material-symbols-outlined material-symbols-filled text-[22px] text-[#cdff52]">favorite</span>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a877f]">Vivid Care · NDIS Service Provider</p>
          <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#1a1a18]">Service Agreement</h1>
        </div>
      </div>

      <div className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.06)]">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Agreement for</p>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#1a1a18]">{participantName}</h2>
        <p className="mt-1 text-sm text-[#67635c]">{agreementTitle}</p>
        {expiresOn ? (
          <p className="mt-1 text-xs text-[#8a877f]">
            Expires: {new Date(expiresOn).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        ) : null}
      </div>

      <div className="mt-6 rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.06)]">
        <p className="mb-4 text-sm leading-6 text-[#4f4c45]">
          By signing below, you confirm that you have read and agree to the terms of this Vivid Care NDIS Service Agreement. A signed PDF copy will be generated and stored securely.
        </p>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">
            Full name of signee *
          </label>
          <input
            type="text"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            placeholder="Enter your full name"
            className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">
            Signature *
          </label>
          <div className="mt-2 overflow-hidden rounded-[20px] border border-[#dfd9cf] bg-white">
            <SignatureCanvas
              ref={signatureRef}
              penColor="#1a1a18"
              canvasProps={{ className: 'h-[200px] w-full' }}
            />
          </div>
          <button
            type="button"
            onClick={() => signatureRef.current?.clear()}
            className="mt-2 text-xs text-[#8a877f] underline"
          >
            Clear signature
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Signing and generating PDF...' : 'Sign Agreement'}
        </button>
      </div>
    </div>
  )
}

function StatusScreen({ title, message, icon }: { title: string; message: string; icon: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[28px] border border-[#e8e4dc] bg-white p-10 text-center shadow-[0_20px_50px_rgba(26,26,24,0.08)]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1a1a18]">
          <span className="material-symbols-outlined material-symbols-filled text-[30px] text-[#cdff52]">{icon}</span>
        </div>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#1a1a18]">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#67635c]">{message}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/sign/
git commit -m "feat: add public /sign/[token] agreement signing page"
```

---

### Task 7: Admin in-person signing page /sign-inperson/[id]

**Files:**
- Create: `app/sign-inperson/[id]/page.tsx`
- Create: `app/sign-inperson/[id]/InPersonSignClient.tsx`

Admin-authenticated page. Server component verifies admin session, looks up agreement, passes data to client. No admin sidebar — clean full-screen view for handing to client.

- [ ] **Step 1: Create the server component**

```tsx
// app/sign-inperson/[id]/page.tsx

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import InPersonSignClient from './InPersonSignClient'

export default async function InPersonSignPage({
  params,
}: {
  params: { id: string }
}) {
  // Verify admin session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/login')

  // Load agreement with service role so we get all fields
  const service = createServiceClient()
  const { data: agreement, error } = await service
    .from('agreements')
    .select('id, title, status, expires_on, clients(full_name)')
    .eq('id', params.id)
    .single()

  if (error || !agreement) return notFound()

  const participantName =
    (agreement.clients as any)?.full_name ?? 'Participant'

  return (
    <div className="min-h-screen bg-[#edecea]">
      <InPersonSignClient
        agreementId={agreement.id}
        agreementTitle={agreement.title}
        participantName={participantName}
        status={agreement.status}
        expiresOn={agreement.expires_on ?? null}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create the client component**

```tsx
// app/sign-inperson/[id]/InPersonSignClient.tsx
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'

export default function InPersonSignClient({
  agreementId,
  agreementTitle,
  participantName,
  status,
  expiresOn,
}: {
  agreementId: string
  agreementTitle: string
  participantName: string
  status: string
  expiresOn: string | null
}) {
  const [signerName, setSignerName] = useState(participantName)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const router = useRouter()

  if (status === 'signed') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[28px] border border-[#e8e4dc] bg-white p-10 text-center shadow-[0_20px_50px_rgba(26,26,24,0.08)]">
          <p className="text-sm text-[#67635c]">This agreement has already been signed.</p>
          <button
            type="button"
            onClick={() => router.push('/admin/agreements')}
            className="mt-6 rounded-2xl bg-[#1a1a18] px-6 py-3 text-sm font-semibold text-white"
          >
            Back to agreements
          </button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[28px] border border-[#e8e4dc] bg-white p-10 text-center shadow-[0_20px_50px_rgba(26,26,24,0.08)]">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1a1a18]">
            <span className="material-symbols-outlined material-symbols-filled text-[30px] text-[#cdff52]">verified</span>
          </div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#1a1a18]">Signed successfully</h2>
          <p className="mt-3 text-sm leading-6 text-[#67635c]">
            The agreement has been signed and the PDF has been generated.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-2xl bg-[#cdff52] px-4 py-3 text-sm font-semibold text-[#1a1a18] text-center"
              >
                Download PDF
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => router.push('/admin/agreements')}
              className="w-full rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white"
            >
              Back to agreements
            </button>
          </div>
        </div>
      </div>
    )
  }

  async function handleSubmit() {
    if (!signerName.trim()) {
      setError('Please confirm the signer name.')
      return
    }
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError('Please draw the signature above.')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      const signatureDataUrl = signatureRef.current.toDataURL('image/png')
      const res = await fetch('/api/agreements/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agreementId, signerName, signatureDataUrl }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      setPdfUrl(data.pdfUrl ?? null)
      setDone(true)
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a1a18]">
          <span className="material-symbols-outlined material-symbols-filled text-[22px] text-[#cdff52]">favorite</span>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a877f]">Vivid Care · In-Person Signing</p>
          <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#1a1a18]">Service Agreement</h1>
        </div>
      </div>

      <div className="mb-6 rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.06)]">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Agreement for</p>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#1a1a18]">{participantName}</h2>
        <p className="mt-1 text-sm text-[#67635c]">{agreementTitle}</p>
        {expiresOn ? (
          <p className="mt-1 text-xs text-[#8a877f]">
            Expires: {new Date(expiresOn).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.06)]">
        <div className="mb-4 rounded-[20px] bg-[#f4f2ed] p-4 text-sm text-[#67635c]">
          Please hand this device to the participant or their representative to sign below.
        </div>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">
            Full name of signee *
          </label>
          <input
            type="text"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">
            Signature *
          </label>
          <div className="mt-2 overflow-hidden rounded-[20px] border border-[#dfd9cf] bg-white">
            <SignatureCanvas
              ref={signatureRef}
              penColor="#1a1a18"
              canvasProps={{ className: 'h-[220px] w-full' }}
            />
          </div>
          <button
            type="button"
            onClick={() => signatureRef.current?.clear()}
            className="mt-2 text-xs text-[#8a877f] underline"
          >
            Clear signature
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Signing and generating PDF...' : 'Submit Signature'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/sign-inperson/
git commit -m "feat: add admin in-person /sign-inperson/[id] signing page"
```

---

### Task 8: Update AgreementsClient

**Files:**
- Modify: `app/admin/agreements/AgreementsClient.tsx`

Add: new form fields (advocate name, supports description, funding type, payment method), "Sign in person" button, "Copy signing link" button, "Download PDF" button. Remove: the old signature canvas modal (replaced by the new signing pages).

- [ ] **Step 1: Update the AgreementRow type and form state**

At the top of `AgreementsClient.tsx`, update the `AgreementRow` type and add new form fields. Replace the existing type definition with:

```ts
type AgreementRow = {
  id: string
  template_id: string | null
  target_type: 'staff' | 'client'
  target_id: string
  title: string
  status: 'draft' | 'pending_signature' | 'signed' | 'expired'
  expires_on: string | null
  signed_at: string | null
  signature_data_url: string | null
  pdf_url: string | null
  signing_token: string | null
  signer_name: string | null
  advocate_name: string | null
  supports_description: string | null
  funding_type: 'self' | 'nominee' | 'ndia' | 'plan_manager' | null
  payment_method: 'eft' | 'cheque' | 'cash' | null
}
```

- [ ] **Step 2: Update the createForm state**

Replace `const [createForm, setCreateForm]` with:

```ts
const [createForm, setCreateForm] = useState({
  template_id: templates[0]?.id ?? '',
  target_type: 'client',
  target_id: clients[0]?.id ?? '',
  title: '',
  expires_on: '',
  advocate_name: '',
  supports_description: '',
  funding_type: 'ndia',
  payment_method: 'eft',
})
```

- [ ] **Step 3: Remove old signature state**

Remove these lines entirely:
```ts
const [signatureAgreementId, setSignatureAgreementId] = useState<string | null>(null)
const signatureRef = useRef<SignatureCanvas | null>(null)
```

Remove the `handleSaveSignature` function entirely.

Remove the `SignatureCanvas` import and the `Modal` import for the signature modal (keep the `Modal` import if the create/template modals still use it).

- [ ] **Step 4: Update handleCreateAgreement to include new fields**

Replace the `handleCreateAgreement` function with:

```ts
async function handleCreateAgreement() {
  if (!createForm.target_id) return
  if (!createForm.supports_description.trim()) {
    setMessage('Please enter a description of supports.')
    return
  }
  setSaving('agreement')
  setMessage(null)

  const template = templateMap.get(createForm.template_id)

  const { error } = await supabase.from('agreements').insert({
    template_id: createForm.template_id || null,
    target_type: createForm.target_type,
    target_id: createForm.target_id,
    title: createForm.title.trim() || template?.name || 'Agreement',
    status: 'pending_signature',
    expires_on: createForm.expires_on || null,
    created_by: adminId,
    advocate_name: createForm.advocate_name.trim() || null,
    supports_description: createForm.supports_description.trim(),
    funding_type: createForm.funding_type,
    payment_method: createForm.payment_method,
  })

  setSaving(null)

  if (error) {
    setMessage(error.message)
    return
  }

  setCreateOpen(false)
  setMessage('Agreement created.')
  router.refresh()
}
```

- [ ] **Step 5: Update the agreement card buttons**

In the JSX, find the `agreements.map(agreement => ...)` section. Replace the button group with:

```tsx
<div className="flex flex-wrap items-center gap-2">
  {agreement.status === 'pending_signature' ? (
    <>
      <button
        type="button"
        onClick={() => router.push(`/sign-inperson/${agreement.id}`)}
        className="rounded-2xl bg-[#cdff52] px-4 py-2 text-sm font-semibold text-[#1a1a18]"
      >
        Sign in person
      </button>
      <button
        type="button"
        onClick={() => {
          const url = `${window.location.origin}/sign/${agreement.signing_token}`
          navigator.clipboard.writeText(url)
          setMessage('Signing link copied to clipboard.')
        }}
        className="rounded-2xl border border-[#dcd7cf] bg-white px-4 py-2 text-sm font-semibold text-[#1a1a18]"
      >
        Copy link
      </button>
    </>
  ) : null}
  {agreement.pdf_url ? (
    <a
      href={agreement.pdf_url}
      target="_blank"
      rel="noreferrer"
      className="rounded-2xl border border-[#dcd7cf] bg-white px-4 py-2 text-sm font-semibold text-[#1a1a18]"
    >
      Download PDF
    </a>
  ) : null}
</div>
```

- [ ] **Step 6: Add new fields to the Generate Agreement modal**

Inside the `<Modal open={createOpen} ...>` form grid, add these fields after the existing ones:

```tsx
<div className="md:col-span-2">
  <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Advocate / Representative name (optional)</label>
  <input
    type="text"
    value={createForm.advocate_name}
    onChange={e => setCreateForm(c => ({ ...c, advocate_name: e.target.value }))}
    placeholder="Leave blank if not applicable"
    className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
  />
</div>
<div className="md:col-span-2">
  <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Description of supports *</label>
  <textarea
    rows={3}
    value={createForm.supports_description}
    onChange={e => setCreateForm(c => ({ ...c, supports_description: e.target.value }))}
    placeholder="e.g. Daily living assistance, community access, and personal care supports."
    className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
  />
</div>
<SelectField
  label="Funding management *"
  value={createForm.funding_type}
  onChange={value => setCreateForm(c => ({ ...c, funding_type: value }))}
  options={[
    ['ndia', 'NDIA managed'],
    ['plan_manager', 'Plan manager'],
    ['nominee', "Participant's nominee"],
    ['self', 'Self managed'],
  ]}
/>
<SelectField
  label="Payment method *"
  value={createForm.payment_method}
  onChange={value => setCreateForm(c => ({ ...c, payment_method: value }))}
  options={[
    ['eft', 'EFT (bank transfer)'],
    ['cheque', 'Cheque'],
    ['cash', 'Cash'],
  ]}
/>
```

- [ ] **Step 7: Remove the old signature capture modal**

Delete the entire `<Modal open={!!signatureAgreementId} ...>` block (the one with SignatureCanvas). Also remove the `import SignatureCanvas from 'react-signature-canvas'` and `import { useRef } from 'react'` if useRef is no longer used.

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add app/admin/agreements/AgreementsClient.tsx
git commit -m "feat: update agreements UI with signing buttons and new form fields"
```

---

### Task 9: Push to remote and smoke test

- [ ] **Step 1: Push branch**

```bash
git push
```

Expected: branch pushes cleanly. Netlify build starts.

- [ ] **Step 2: Wait for Netlify build**

Check the Netlify dashboard for build status. Build should succeed — `@react-pdf/renderer` is a regular npm package and will be bundled normally.

- [ ] **Step 3: Test email link flow**

1. Log in as admin → go to **Agreements**
2. Click **Generate agreement** → fill in all fields including "Description of supports" and select funding type
3. Click **Create agreement**
4. On the new pending agreement card, click **Copy link**
5. Open an incognito window → paste the link → enter signer name → draw signature → click **Sign Agreement**
6. Expected: confirmation screen appears
7. Back in admin → refresh Agreements page → agreement should show status "Signed" and a **Download PDF** button
8. Click **Download PDF** → verify the PDF opens and shows the correct participant name, agreement text, and signature image

- [ ] **Step 4: Test in-person flow**

1. Create another agreement
2. Click **Sign in person** on the pending agreement card
3. Expected: navigates to `/sign-inperson/[id]` — full screen, no admin sidebar
4. Enter signer name → draw signature → click **Submit Signature**
5. Expected: success screen with **Download PDF** and **Back to agreements** buttons
6. Click **Download PDF** → verify PDF

- [ ] **Step 5: Test guard rails**

1. Open the signing link from the email flow test in a new incognito window → expected: "Already signed" message
2. Create an agreement → in Supabase SQL editor set `status = 'expired'` for that agreement → open its signing link → expected: "Link expired" message

- [ ] **Step 6: Update ABN and provider details**

Open `lib/agreements/constants.ts` and fill in the real values:
- `abn` — Vivid Care's ABN
- `address` — real business address
- `phone` — real phone
- `email` — real admin email
- `ndisRegistration` — NDIS registration number

```bash
git add lib/agreements/constants.ts
git commit -m "chore: update Vivid Care provider details in agreement constants"
git push
```
