// One-off: build a demo Service Agreement PDF with the VividCare logo
// and a signature block, upload it to the `agreements` Supabase bucket,
// and create the matching agreement row for Shivali (the NDIS demo
// client) so she can sign it from the mobile app.
//
// Usage (Node 20+):
//   node --env-file=.env.local scripts/create-demo-agreement.mjs
//
// Env required:
//   - NEXT_PUBLIC_SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//
// Constants are hard-coded for the demo flow — adjust if reusing.

import fs from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Constants ───────────────────────────────────────────────────────
const SHIVALI_CLIENT_ID = '22222222-3333-4444-5555-666666666666'
const ADMIN_USER_ID = '02866a89-bee9-452f-8dea-b29cc3d78db8' // Sabbir Hossain
const LOGO_PATH = path.resolve(__dirname, '..', 'public', 'logo.png')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
}

// ── Read the logo as a data URL the PDF can embed ───────────────────
const logoBytes = await fs.readFile(LOGO_PATH)
const logoDataUrl = `data:image/png;base64,${logoBytes.toString('base64')}`

// ── PDF styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 56,
    backgroundColor: '#FFFFFF',
    fontSize: 11,
    color: '#1A1320',
    fontFamily: 'Helvetica',
  },

  // Header band with logo + brand block on the right
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E1E8',
  },
  logo: { width: 130, height: 56, objectFit: 'contain' },
  orgBlock: { alignItems: 'flex-end' },
  orgName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1A1320' },
  orgSub:  { fontSize: 9, color: '#6B6371', marginTop: 4 },

  // Eyebrow + title
  eyebrow: {
    fontSize: 9,
    color: '#6B2C91',
    letterSpacing: 1.6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1A1320',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: { fontSize: 11, color: '#6B6371', marginBottom: 22 },

  // Section
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#54206F',
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: { fontSize: 10.5, color: '#3F3548', lineHeight: 1.5, marginBottom: 8 },

  // Two-column meta block
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 14,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8F6FA',
    borderRadius: 8,
  },
  metaCol: { width: '50%', marginBottom: 8 },
  metaLabel: {
    fontSize: 8,
    color: '#97909C',
    letterSpacing: 0.8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  metaValue: { fontSize: 11, color: '#1A1320', fontFamily: 'Helvetica-Bold' },

  // Bulleted list
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bullet: { width: 12, color: '#6B2C91', fontFamily: 'Helvetica-Bold' },
  bulletText: { flex: 1, fontSize: 10.5, color: '#3F3548', lineHeight: 1.5 },

  // Signature block
  sigBlock: {
    marginTop: 28,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#E5E1E8',
  },
  sigGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  sigCol: { width: '46%' },
  sigLine: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1320',
    marginBottom: 6,
  },
  sigCap: {
    fontSize: 9,
    color: '#6B6371',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sigName: { fontSize: 10.5, color: '#1A1320', marginTop: 2 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 26,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8.5,
    color: '#97909C',
  },
})

// ── PDF document ────────────────────────────────────────────────────
function Bullet({ children }) {
  return React.createElement(
    View,
    { style: styles.bulletRow },
    React.createElement(Text, { style: styles.bullet }, '•'),
    React.createElement(Text, { style: styles.bulletText }, children),
  )
}

function Meta({ label, value }) {
  return React.createElement(
    View,
    { style: styles.metaCol },
    React.createElement(Text, { style: styles.metaLabel }, label),
    React.createElement(Text, { style: styles.metaValue }, value),
  )
}

function DemoAgreement() {
  return React.createElement(
    Document,
    { title: 'Demo Service Agreement — Shivali Talwar', author: 'VividCare' },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },

      // Header
      React.createElement(
        View,
        { style: styles.headerRow },
        React.createElement(Image, { src: logoDataUrl, style: styles.logo }),
        React.createElement(
          View,
          { style: styles.orgBlock },
          React.createElement(Text, { style: styles.orgName }, 'VividCare Pty Ltd'),
          React.createElement(Text, { style: styles.orgSub }, 'Perth, Western Australia'),
          React.createElement(Text, { style: styles.orgSub }, 'NDIS Registered Provider'),
        ),
      ),

      // Eyebrow + title
      React.createElement(Text, { style: styles.eyebrow }, 'NDIS · Service Agreement · Demo'),
      React.createElement(Text, { style: styles.title }, 'Daily Living Support Agreement'),
      React.createElement(
        Text,
        { style: styles.subtitle },
        'Between VividCare Pty Ltd ("Provider") and the Participant named below.',
      ),

      // Meta
      React.createElement(
        View,
        { style: styles.metaGrid },
        React.createElement(Meta, { label: 'Participant', value: 'Shivali Talwar' }),
        React.createElement(Meta, { label: 'NDIS Plan', value: 'Funded · Self-managed' }),
        React.createElement(Meta, { label: 'Commencement', value: '16 May 2026' }),
        React.createElement(Meta, { label: 'Expiry', value: '15 May 2027' }),
        React.createElement(Meta, { label: 'Funding management', value: 'Self managed' }),
        React.createElement(Meta, { label: 'Payment method', value: 'EFT (bank transfer)' }),
      ),

      // Section 1
      React.createElement(Text, { style: styles.sectionTitle }, '1. Supports to be provided'),
      React.createElement(
        Text,
        { style: styles.paragraph },
        'VividCare will provide the following NDIS-funded supports to the Participant as part of this agreement:',
      ),
      React.createElement(Bullet, null, 'Daily personal care — assistance with showering, dressing, grooming and toileting at the Participant’s home in Perth, WA.'),
      React.createElement(Bullet, null, 'Community access — accompanied outings, transport coordination and engagement in chosen community activities.'),
      React.createElement(Bullet, null, 'Domestic assistance — light housekeeping, meal preparation, and shopping support.'),
      React.createElement(Bullet, null, 'Capacity building — health and well-being check-ins, goal tracking against the Participant’s active NDIS plan.'),

      // Section 2
      React.createElement(Text, { style: styles.sectionTitle }, '2. Schedule and fees'),
      React.createElement(
        Text,
        { style: styles.paragraph },
        'Supports will be delivered at the times agreed in the Participant’s roster. Fees are charged at the published NDIS Price Guide rates current at the time of service, and claimed against the funding categories above.',
      ),

      // Section 3
      React.createElement(Text, { style: styles.sectionTitle }, '3. Responsibilities'),
      React.createElement(Bullet, null, 'VividCare will treat the Participant with respect, deliver supports as agreed, and protect personal information in line with Australian privacy law.'),
      React.createElement(Bullet, null, 'The Participant agrees to provide reasonable notice of changes or cancellations and to keep VividCare informed of any updates to their plan.'),

      // Section 4 — short
      React.createElement(Text, { style: styles.sectionTitle }, '4. Acknowledgement'),
      React.createElement(
        Text,
        { style: styles.paragraph },
        'By signing below, the Participant confirms they have read this agreement, had the chance to ask questions, and accept the supports as described.',
      ),

      // Signature block
      React.createElement(
        View,
        { style: styles.sigBlock },
        React.createElement(Text, { style: styles.sectionTitle }, 'Signature'),
        React.createElement(
          Text,
          { style: styles.paragraph },
          'Sign in the box on the VividCare mobile app. Your signature will be saved with this document.',
        ),
        React.createElement(
          View,
          { style: styles.sigGrid },
          React.createElement(
            View,
            { style: styles.sigCol },
            React.createElement(View, { style: styles.sigLine }),
            React.createElement(Text, { style: styles.sigCap }, 'Participant signature'),
            React.createElement(Text, { style: styles.sigName }, 'Shivali Talwar'),
          ),
          React.createElement(
            View,
            { style: styles.sigCol },
            React.createElement(View, { style: styles.sigLine }),
            React.createElement(Text, { style: styles.sigCap }, 'Provider signature'),
            React.createElement(Text, { style: styles.sigName }, 'VividCare Pty Ltd'),
          ),
        ),
      ),

      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, null, 'VividCare Pty Ltd · Perth, WA · Demo agreement'),
        React.createElement(Text, null, 'Page 1'),
      ),
    ),
  )
}

// ── Render and upload ───────────────────────────────────────────────
console.log('[demo-agreement] rendering PDF…')
const pdfBuffer = await renderToBuffer(React.createElement(DemoAgreement))
console.log(`[demo-agreement] PDF ready · ${(pdfBuffer.length / 1024).toFixed(1)} KB`)

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// 1) Insert agreement row first so we have an id to namespace storage by
console.log('[demo-agreement] creating agreement row…')
const { data: created, error: insertErr } = await supabase
  .from('agreements')
  .insert({
    template_id: null,
    target_type: 'client',
    target_id: SHIVALI_CLIENT_ID,
    title: 'Demo Service Agreement — Daily Living Support',
    status: 'pending_signature',
    expires_on: '2027-05-15',
    created_by: ADMIN_USER_ID,
    advocate_name: null,
    supports_description:
      'Daily personal care, community access, domestic assistance, and capacity building.',
    funding_type: 'self',
    payment_method: 'eft',
  })
  .select('id')
  .single()
if (insertErr) {
  console.error('[demo-agreement] insert failed:', insertErr)
  process.exit(1)
}
console.log(`[demo-agreement] agreement row id: ${created.id}`)

// 2) Upload PDF to the agreements bucket
const storagePath = `client/${SHIVALI_CLIENT_ID}/${created.id}-demo-agreement.pdf`
console.log(`[demo-agreement] uploading to agreements/${storagePath}…`)
const { error: uploadErr } = await supabase.storage
  .from('agreements')
  .upload(storagePath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  })
if (uploadErr) {
  console.error('[demo-agreement] storage upload failed:', uploadErr)
  process.exit(1)
}

// 3) Patch row with the storage path so the mobile app can resolve it
const { error: patchErr } = await supabase
  .from('agreements')
  .update({ pdf_url: storagePath })
  .eq('id', created.id)
if (patchErr) {
  console.error('[demo-agreement] pdf_url patch failed:', patchErr)
  process.exit(1)
}

console.log('[demo-agreement] ✅ done.')
console.log('')
console.log(`  Agreement id: ${created.id}`)
console.log(`  Storage path: ${storagePath}`)
console.log(`  Target:       Shivali Talwar (NDIS)`)
console.log(`  Status:       pending_signature`)
console.log('')
console.log('  Open https://vivid-care-web.vercel.app/admin/agreements to see it.')
console.log('  Or sign in to the mobile app as demo@shivali.com to sign it.')
