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
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">Settings</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#c852ff] px-4 py-1 text-sm font-semibold tracking-normal text-[#1a1a18]">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              configuration
            </span>
          </div>
          <div className="text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">and compliance defaults</span>
          </div>
          <p className="text-sm text-[#6c6b66]">
            Control organization settings, document rules, and NDIS support type requirements.
          </p>
        </div>
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
