import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

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

export default async function SettingsPage() {
  const supabase = await createClient()

  const [
    { data: settings, error: settingsError },
    { data: documentTypes, error: documentTypesError },
    { data: supportTypes, error: supportTypesError },
    { data: requirements, error: requirementsError },
  ] = await Promise.all([
    supabase.from('organization_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('document_type_configs').select('*').order('owner_type', { ascending: true }).order('name', { ascending: true }),
    supabase.from('ndis_support_types').select('*').order('title', { ascending: true }),
    supabase.from('ndis_doc_requirements').select('*').order('support_type_key', { ascending: true }).order('label', { ascending: true }),
  ])

  const schemaReady = !settingsError && !documentTypesError && !supportTypesError && !requirementsError

  return (
    <div className="space-y-6">
      <header>
        <h1
          className="m-0 text-[28px] font-bold leading-[1.15] text-[#1A1320]"
          style={{ letterSpacing: '-0.02em' }}
        >
          Settings
        </h1>
        <p className="mt-1.5 text-[14px] text-[#6B6371]">
          Control organization settings, document rules, and NDIS support type requirements.
        </p>
      </header>

      <SettingsClient
        schemaReady={schemaReady}
        initialSettings={settings ?? DEFAULT_SETTINGS}
        documentTypes={documentTypes ?? []}
        supportTypes={supportTypes ?? []}
        requirements={requirements ?? []}
      />
    </div>
  )
}
