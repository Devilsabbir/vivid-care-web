import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  createServiceClient,
  handleOptions,
  jsonResponse,
  parseJsonBody,
  relationRow,
  uniqueValues,
} from '../_shared/utils.ts'

type ComplianceRequest = {
  shiftId?: string
  lookbackHours?: number
  dryRun?: boolean
  currentTime?: string
}

type ShiftRow = {
  id: string
  staff_id: string | null
  end_time: string
  support_type_key: string | null
  documentation_status: 'not_required' | 'pending' | 'in_progress' | 'documented' | 'overdue'
  clients:
    | {
        full_name: string | null
      }
    | Array<{
        full_name: string | null
      }>
    | null
}

type RequirementRow = {
  support_type_key: string
  form_key: string
  required: boolean
}

type DocumentationRow = {
  shift_id: string
  form_key: string
  status: 'draft' | 'submitted' | 'approved' | 'amended'
}

serve(async request => {
  const optionsResponse = handleOptions(request)
  if (optionsResponse) return optionsResponse

  try {
    const payload = await parseJsonBody<ComplianceRequest>(request)
    const supabase = createServiceClient()
    const now = payload.currentTime ? new Date(payload.currentTime) : new Date()
    const lookbackHours = payload.lookbackHours ?? 24 * 7
    const lookbackStart = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000)
    const dryRun = payload.dryRun ?? false

    let shiftQuery = supabase
      .from('shifts')
      .select('id, staff_id, end_time, support_type_key, documentation_status, clients(full_name)')
      .lte('end_time', now.toISOString())
      .gte('end_time', lookbackStart.toISOString())
      .neq('status', 'cancelled')

    if (payload.shiftId) {
      shiftQuery = shiftQuery.eq('id', payload.shiftId)
    }

    const [{ data: shifts, error: shiftsError }, { data: admins, error: adminsError }] =
      await Promise.all([
        shiftQuery,
        supabase.from('profiles').select('id').eq('role', 'admin'),
      ])

    if (shiftsError || adminsError) {
      return jsonResponse(
        { ok: false, error: shiftsError?.message ?? adminsError?.message ?? 'Failed to load compliance inputs.' },
        500,
      )
    }

    const shiftIds = (shifts ?? []).map(shift => shift.id)
    const supportTypeKeys = uniqueValues(
      (shifts ?? []).map(shift => shift.support_type_key ?? 'general_support'),
    )

    const [{ data: requirements, error: requirementsError }, { data: docs, error: docsError }, { data: existingNotifications, error: notificationsError }] =
      await Promise.all([
        shiftIds.length
          ? supabase
              .from('ndis_doc_requirements')
              .select('support_type_key, form_key, required')
              .in('support_type_key', supportTypeKeys)
          : Promise.resolve({ data: [], error: null }),
        shiftIds.length
          ? supabase
              .from('shift_documentation')
              .select('shift_id, form_key, status')
              .in('shift_id', shiftIds)
          : Promise.resolve({ data: [], error: null }),
        shiftIds.length
          ? supabase
              .from('notifications')
              .select('user_id, type, related_id, title')
              .in('type', [
                'documentation_reminder_4h',
                'documentation_escalation_24h',
                'documentation_overdue_48h',
                'documentation_completed',
              ])
              .gte('created_at', lookbackStart.toISOString())
          : Promise.resolve({ data: [], error: null }),
      ])

    const downstreamError = requirementsError ?? docsError ?? notificationsError
    if (downstreamError) {
      return jsonResponse({ ok: false, error: downstreamError.message }, 500)
    }

    const adminIds = (admins ?? []).map(admin => admin.id)
    const requirementsBySupportType = new Map<string, RequirementRow[]>()
    ;(requirements as RequirementRow[] | null)?.forEach(requirement => {
      const current = requirementsBySupportType.get(requirement.support_type_key) ?? []
      current.push(requirement)
      requirementsBySupportType.set(requirement.support_type_key, current)
    })

    const docsByShift = new Map<string, DocumentationRow[]>()
    ;(docs as DocumentationRow[] | null)?.forEach(doc => {
      const current = docsByShift.get(doc.shift_id) ?? []
      current.push(doc)
      docsByShift.set(doc.shift_id, current)
    })

    const sentNotifications = new Set(
      (existingNotifications ?? []).map(
        notification =>
          `${notification.user_id}:${notification.type}:${notification.related_id ?? 'none'}:${notification.title ?? ''}`,
      ),
    )

    const shiftUpdates: Array<{
      id: string
      documentation_status: ShiftRow['documentation_status']
    }> = []
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

    ;(shifts as ShiftRow[] | null)?.forEach(shift => {
      const supportTypeKey = shift.support_type_key ?? 'general_support'
      const requiredForms = (requirementsBySupportType.get(supportTypeKey) ?? []).filter(
        requirement => requirement.required,
      )
      const submittedForms = new Set(
        (docsByShift.get(shift.id) ?? [])
          .filter(doc => doc.status === 'submitted' || doc.status === 'approved')
          .map(doc => doc.form_key),
      )

      const requiredCount = requiredForms.length
      const submittedCount = requiredForms.filter(requirement =>
        submittedForms.has(requirement.form_key),
      ).length

      const hoursSinceEnd = (now.getTime() - new Date(shift.end_time).getTime()) / 3_600_000
      let desiredStatus: ShiftRow['documentation_status']

      if (requiredCount === 0) {
        desiredStatus = 'not_required'
      } else if (submittedCount >= requiredCount) {
        desiredStatus = 'documented'
      } else if (hoursSinceEnd >= 48) {
        desiredStatus = 'overdue'
      } else if (submittedCount > 0) {
        desiredStatus = 'in_progress'
      } else {
        desiredStatus = 'pending'
      }

      if (shift.documentation_status !== desiredStatus) {
        shiftUpdates.push({
          id: shift.id,
          documentation_status: desiredStatus,
        })
        auditRows.push({
          entity_type: 'shift',
          entity_key: shift.id,
          action: `documentation_status:${desiredStatus}`,
          metadata: {
            support_type_key: supportTypeKey,
            required_count: requiredCount,
            submitted_count: submittedCount,
            hours_since_end: Number(hoursSinceEnd.toFixed(2)),
          },
        })
      }

      const clientName = relationRow(shift.clients)?.full_name ?? 'the client'
      const staffRecipients = shift.staff_id ? [shift.staff_id] : []
      const adminRecipients = adminIds

      if (desiredStatus === 'documented') {
        queueNotification(
          uniqueValues([...staffRecipients, ...adminRecipients]),
          'documentation_completed',
          'Shift documentation completed',
          `All required service documentation has been submitted for ${clientName}.`,
          shift.id,
        )
        return
      }

      if (requiredCount === 0) {
        return
      }

      if (hoursSinceEnd >= 48) {
        queueNotification(
          uniqueValues([...staffRecipients, ...adminRecipients]),
          'documentation_overdue_48h',
          'Service documentation overdue',
          `Shift documentation for ${clientName} is now overdue and requires immediate attention.`,
          shift.id,
        )
      } else if (hoursSinceEnd >= 24) {
        queueNotification(
          uniqueValues([...staffRecipients, ...adminRecipients]),
          'documentation_escalation_24h',
          'Service documentation pending for 24 hours',
          `Shift documentation for ${clientName} is still incomplete after 24 hours.`,
          shift.id,
        )
      } else if (hoursSinceEnd >= 4) {
        queueNotification(
          staffRecipients,
          'documentation_reminder_4h',
          'Complete your post-shift documentation',
          `Please complete the remaining service documentation for ${clientName}.`,
          shift.id,
        )
      }
    })

    if (!dryRun) {
      const updateResults = await Promise.all(
        shiftUpdates.map(update =>
          supabase
            .from('shifts')
            .update({ documentation_status: update.documentation_status })
            .eq('id', update.id),
        ),
      )

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
      processedAt: now.toISOString(),
      shiftsChecked: shifts?.length ?? 0,
      shiftsUpdated: shiftUpdates.length,
      notificationsQueued: notificationRows.length,
      auditEventsQueued: auditRows.length,
    })
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected NDIS compliance error.',
      },
      500,
    )
  }
})
