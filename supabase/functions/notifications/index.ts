import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  createServiceClient,
  handleOptions,
  jsonResponse,
  parseJsonBody,
  uniqueValues,
} from '../_shared/utils.ts'

type NotificationsRequest = {
  userIds?: string[]
  roles?: Array<'admin' | 'staff'>
  type: string
  title: string
  message: string
  relatedId?: string
  dedupeWindowHours?: number
  dryRun?: boolean
}

serve(async request => {
  const optionsResponse = handleOptions(request)
  if (optionsResponse) return optionsResponse

  try {
    const payload = await parseJsonBody<NotificationsRequest>(request)

    if (!payload.type || !payload.title || !payload.message) {
      return jsonResponse(
        { ok: false, error: 'type, title, and message are required.' },
        400,
      )
    }

    const supabase = createServiceClient()
    const dedupeWindowHours = payload.dedupeWindowHours ?? 24
    const since = new Date(Date.now() - dedupeWindowHours * 3_600_000).toISOString()
    const roleFilters = payload.roles?.length ? payload.roles : []
    let existingNotificationQuery = supabase
      .from('notifications')
      .select('user_id, type, related_id, title')
      .eq('type', payload.type)
      .eq('title', payload.title)
      .gte('created_at', since)

    existingNotificationQuery = payload.relatedId
      ? existingNotificationQuery.eq('related_id', payload.relatedId)
      : existingNotificationQuery.is('related_id', null)

    const [roleUsersResponse, existingNotificationsResponse] = await Promise.all([
      roleFilters.length
        ? supabase.from('profiles').select('id').in('role', roleFilters)
        : Promise.resolve({ data: [], error: null }),
      existingNotificationQuery,
    ])

    if (roleUsersResponse.error || existingNotificationsResponse.error) {
      return jsonResponse(
        {
          ok: false,
          error:
            roleUsersResponse.error?.message ??
            existingNotificationsResponse.error?.message ??
            'Failed to prepare notifications.',
        },
        500,
      )
    }

    const recipientIds = uniqueValues([
      ...(payload.userIds ?? []),
      ...((roleUsersResponse.data ?? []).map(user => user.id)),
    ])

    if (recipientIds.length === 0) {
      return jsonResponse({
        ok: true,
        dryRun: payload.dryRun ?? false,
        recipientsResolved: 0,
        notificationsInserted: 0,
        emailDispatchPlanned: false,
        pushDispatchPlanned: false,
      })
    }

    const existingKeys = new Set(
      (existingNotificationsResponse.data ?? []).map(
        notification =>
          `${notification.user_id}:${notification.type}:${notification.related_id ?? 'none'}:${notification.title}`,
      ),
    )

    const rows = recipientIds
      .filter(userId => {
        const key = `${userId}:${payload.type}:${payload.relatedId ?? 'none'}:${payload.title}`
        return !existingKeys.has(key)
      })
      .map(userId => ({
        user_id: userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        related_id: payload.relatedId ?? null,
      }))

    if (!(payload.dryRun ?? false) && rows.length > 0) {
      const { error } = await supabase.from('notifications').insert(rows)
      if (error) {
        return jsonResponse({ ok: false, error: error.message }, 500)
      }
    }

    return jsonResponse({
      ok: true,
      dryRun: payload.dryRun ?? false,
      recipientsResolved: recipientIds.length,
      notificationsInserted: rows.length,
      emailDispatchPlanned: Boolean(Deno.env.get('RESEND_API_KEY') || Deno.env.get('SENDGRID_API_KEY')),
      pushDispatchPlanned: Boolean(Deno.env.get('EXPO_ACCESS_TOKEN') || Deno.env.get('FCM_SERVER_KEY')),
    })
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected notifications dispatch error.',
      },
      500,
    )
  }
})
