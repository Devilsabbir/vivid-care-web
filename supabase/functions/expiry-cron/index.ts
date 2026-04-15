import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  createServiceClient,
  differenceInWholeDays,
  handleOptions,
  jsonResponse,
  parseJsonBody,
  startOfDay,
  uniqueValues,
} from '../_shared/utils.ts'

type ExpiryCronRequest = {
  dryRun?: boolean
  runDate?: string
  warningDays?: number[]
}

type DocumentRow = {
  id: string
  owner_id: string
  owner_type: 'staff' | 'client'
  doc_type: string
  file_name: string | null
  expiry_date: string | null
  status: 'active' | 'near_expiry' | 'expired'
}

type AgreementRow = {
  id: string
  target_id: string
  target_type: 'staff' | 'client'
  title: string
  expires_on: string | null
  status: 'draft' | 'pending_signature' | 'signed' | 'expired'
}

serve(async request => {
  const optionsResponse = handleOptions(request)
  if (optionsResponse) return optionsResponse

  try {
    const payload = await parseJsonBody<ExpiryCronRequest>(request)
    const supabase = createServiceClient()
    const runDate = payload.runDate ? new Date(payload.runDate) : new Date()
    const today = startOfDay(runDate)
    const todayIso = today.toISOString()
    const dryRun = payload.dryRun ?? false

    const [
      { data: settings, error: settingsError },
      { data: documentConfigs, error: documentConfigError },
      { data: documents, error: documentsError },
      { data: agreements, error: agreementsError },
      { data: admins, error: adminsError },
      { data: existingNotifications, error: notificationsError },
    ] = await Promise.all([
      supabase
        .from('organization_settings')
        .select('doc_warning_days')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .from('document_type_configs')
        .select('name, warning_days')
        .eq('active', true),
      supabase
        .from('documents')
        .select('id, owner_id, owner_type, doc_type, file_name, expiry_date, status')
        .not('expiry_date', 'is', null),
      supabase
        .from('agreements')
        .select('id, target_id, target_type, title, expires_on, status')
        .not('expires_on', 'is', null),
      supabase.from('profiles').select('id').eq('role', 'admin'),
      supabase
        .from('notifications')
        .select('user_id, type, related_id, title')
        .in('type', [
          'document_expiry_warning',
          'document_expired',
          'agreement_expiry_warning',
          'agreement_expired',
        ])
        .gte('created_at', todayIso),
    ])

    const firstError = [
      settingsError,
      documentConfigError,
      documentsError,
      agreementsError,
      adminsError,
      notificationsError,
    ].find(Boolean)

    if (firstError) {
      return jsonResponse({ ok: false, error: firstError.message }, 500)
    }

    const defaultWarningDays =
      payload.warningDays?.length
        ? payload.warningDays
        : settings?.doc_warning_days?.length
          ? settings.doc_warning_days
          : [45, 30, 14, 7]

    const adminIds = (admins ?? []).map(admin => admin.id)
    const documentWarningMap = new Map(
      (documentConfigs ?? []).map(config => [config.name, config.warning_days ?? defaultWarningDays]),
    )
    const sentNotifications = new Set(
      (existingNotifications ?? []).map(
        notification =>
          `${notification.user_id}:${notification.type}:${notification.related_id ?? 'none'}:${notification.title ?? ''}`,
      ),
    )

    const documentUpdates: Array<{ id: string; status: DocumentRow['status'] }> = []
    const agreementUpdates: Array<{ id: string; status: AgreementRow['status'] }> = []
    const notificationRows: Array<{
      user_id: string
      type: string
      title: string
      message: string
      related_id: string
    }> = []
    const auditRows: Array<{
      entity_type: string
      entity_key: string
      action: string
      metadata: Record<string, unknown>
    }> = []

    const queueNotification = (
      userIds: string[],
      type: string,
      title: string,
      message: string,
      relatedId: string,
    ) => {
      userIds.forEach(userId => {
        const key = `${userId}:${type}:${relatedId}:${title}`
        if (sentNotifications.has(key)) return

        sentNotifications.add(key)
        notificationRows.push({
          user_id: userId,
          type,
          title,
          message,
          related_id: relatedId,
        })
      })
    }

    ;(documents as DocumentRow[] | null)?.forEach(document => {
      if (!document.expiry_date) return

      const daysUntilExpiry = differenceInWholeDays(document.expiry_date, today)
      const warningDays = documentWarningMap.get(document.doc_type) ?? defaultWarningDays
      const desiredStatus: DocumentRow['status'] =
        daysUntilExpiry < 0
          ? 'expired'
          : warningDays.includes(daysUntilExpiry)
            ? 'near_expiry'
            : 'active'

      if (document.status !== desiredStatus) {
        documentUpdates.push({ id: document.id, status: desiredStatus })
        auditRows.push({
          entity_type: 'document',
          entity_key: document.id,
          action: `status:${desiredStatus}`,
          metadata: {
            doc_type: document.doc_type,
            expiry_date: document.expiry_date,
            days_until_expiry: daysUntilExpiry,
          },
        })
      }

      if (daysUntilExpiry < 0) {
        const recipients = document.owner_type === 'staff'
          ? uniqueValues([...adminIds, document.owner_id])
          : adminIds

        queueNotification(
          recipients,
          'document_expired',
          `${document.doc_type} expired`,
          `${document.file_name ?? document.doc_type} has expired and needs renewal.`,
          document.id,
        )
        return
      }

      if (warningDays.includes(daysUntilExpiry)) {
        const recipients = document.owner_type === 'staff'
          ? uniqueValues([...adminIds, document.owner_id])
          : adminIds

        queueNotification(
          recipients,
          'document_expiry_warning',
          `${document.doc_type} expires in ${daysUntilExpiry} days`,
          `${document.file_name ?? document.doc_type} is approaching expiry and should be renewed.`,
          document.id,
        )
      }
    })

    ;(agreements as AgreementRow[] | null)?.forEach(agreement => {
      if (!agreement.expires_on) return

      const daysUntilExpiry = differenceInWholeDays(agreement.expires_on, today)
      const desiredStatus: AgreementRow['status'] =
        daysUntilExpiry < 0 ? 'expired' : agreement.status

      if (agreement.status !== desiredStatus) {
        agreementUpdates.push({ id: agreement.id, status: desiredStatus })
        auditRows.push({
          entity_type: 'agreement',
          entity_key: agreement.id,
          action: `status:${desiredStatus}`,
          metadata: {
            target_type: agreement.target_type,
            expires_on: agreement.expires_on,
            days_until_expiry: daysUntilExpiry,
          },
        })
      }

      const recipients = agreement.target_type === 'staff'
        ? uniqueValues([...adminIds, agreement.target_id])
        : adminIds

      if (daysUntilExpiry < 0) {
        queueNotification(
          recipients,
          'agreement_expired',
          `${agreement.title} expired`,
          `${agreement.title} has expired and needs a renewal workflow.`,
          agreement.id,
        )
        return
      }

      if (defaultWarningDays.includes(daysUntilExpiry)) {
        queueNotification(
          recipients,
          'agreement_expiry_warning',
          `${agreement.title} expires in ${daysUntilExpiry} days`,
          `${agreement.title} is within the renewal window.`,
          agreement.id,
        )
      }
    })

    if (!dryRun) {
      const updateResults = await Promise.all([
        ...documentUpdates.map(update =>
          supabase.from('documents').update({ status: update.status }).eq('id', update.id),
        ),
        ...agreementUpdates.map(update =>
          supabase.from('agreements').update({ status: update.status }).eq('id', update.id),
        ),
      ])

      const updateError = updateResults.find(result => result.error)?.error
      if (updateError) {
        return jsonResponse({ ok: false, error: updateError.message }, 500)
      }

      if (notificationRows.length > 0) {
        const { error } = await supabase.from('notifications').insert(notificationRows)
        if (error) {
          return jsonResponse({ ok: false, error: error.message }, 500)
        }
      }

      if (auditRows.length > 0) {
        const { error } = await supabase.from('audit_events').insert(auditRows)
        if (error) {
          return jsonResponse({ ok: false, error: error.message }, 500)
        }
      }
    }

    return jsonResponse({
      ok: true,
      dryRun,
      processedAt: runDate.toISOString(),
      warningDays: defaultWarningDays,
      documentsChecked: documents?.length ?? 0,
      documentUpdates: documentUpdates.length,
      agreementsChecked: agreements?.length ?? 0,
      agreementUpdates: agreementUpdates.length,
      notificationsQueued: notificationRows.length,
      auditEventsQueued: auditRows.length,
    })
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected expiry cron error.',
      },
      500,
    )
  }
})
