import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  createServiceClient,
  handleOptions,
  jsonResponse,
  parseJsonBody,
  relationRow,
  toIsoDate,
} from '../_shared/utils.ts'

type PaymentsRequest = {
  startDate?: string
  endDate?: string
  staffId?: string
  standardRate?: number
  eveningRate?: number
  weekendRate?: number
  holidayRate?: number
  overtimeRate?: number
  overtimeDailyHours?: number
  holidayDates?: string[]
}

type ShiftRow = {
  id: string
  staff_id: string | null
  start_time: string
  end_time: string
  clock_in_time: string | null
  clock_out_time: string | null
  status: string
  profiles:
    | {
        full_name: string | null
      }
    | Array<{
        full_name: string | null
      }>
    | null
}

type SummaryRow = {
  staffId: string
  staffName: string
  shifts: number
  regularHours: number
  eveningHours: number
  weekendHours: number
  holidayHours: number
  overtimeHours: number
  grossPay: number
}

const DEFAULT_RATES = {
  standardRate: 42,
  eveningRate: 47,
  weekendRate: 52,
  holidayRate: 62,
  overtimeRate: 60,
  overtimeDailyHours: 8,
}

serve(async request => {
  const optionsResponse = handleOptions(request)
  if (optionsResponse) return optionsResponse

  try {
    const payload = await parseJsonBody<PaymentsRequest>(request)
    const supabase = createServiceClient()
    const today = new Date()
    const startDate = payload.startDate
      ? new Date(payload.startDate)
      : new Date(today.getTime() - 13 * 86_400_000)
    const endDate = payload.endDate ? new Date(payload.endDate) : today
    const rates = {
      standardRate: payload.standardRate ?? DEFAULT_RATES.standardRate,
      eveningRate: payload.eveningRate ?? DEFAULT_RATES.eveningRate,
      weekendRate: payload.weekendRate ?? DEFAULT_RATES.weekendRate,
      holidayRate: payload.holidayRate ?? DEFAULT_RATES.holidayRate,
      overtimeRate: payload.overtimeRate ?? DEFAULT_RATES.overtimeRate,
      overtimeDailyHours: payload.overtimeDailyHours ?? DEFAULT_RATES.overtimeDailyHours,
    }
    const holidayDates = new Set((payload.holidayDates ?? []).map(value => value.trim()))

    let query = supabase
      .from('shifts')
      .select('id, staff_id, start_time, end_time, clock_in_time, clock_out_time, status, profiles(full_name)')
      .eq('status', 'completed')
      .gte('start_time', startDate.toISOString())
      .lte('end_time', endDate.toISOString())

    if (payload.staffId) {
      query = query.eq('staff_id', payload.staffId)
    }

    const { data: shifts, error } = await query

    if (error) {
      return jsonResponse({ ok: false, error: error.message }, 500)
    }

    const summaries = new Map<string, SummaryRow>()
    const shiftBreakdown = (shifts as ShiftRow[] | null)?.map(shift => {
      const actualStart = new Date(shift.clock_in_time ?? shift.start_time)
      const actualEnd = new Date(shift.clock_out_time ?? shift.end_time)
      const hours = Math.max((actualEnd.getTime() - actualStart.getTime()) / 3_600_000, 0)
      const overtimeHours = Math.max(hours - rates.overtimeDailyHours, 0)
      const baseHours = Math.max(hours - overtimeHours, 0)
      const weekday = actualStart.getDay()
      const startHour = actualStart.getHours()
      const workDate = toIsoDate(actualStart)

      let bucket: 'regular' | 'evening' | 'weekend' | 'holiday' = 'regular'

      if (holidayDates.has(workDate)) {
        bucket = 'holiday'
      } else if (weekday === 0 || weekday === 6) {
        bucket = 'weekend'
      } else if (startHour >= 20 || startHour < 6) {
        bucket = 'evening'
      }

      const regularHours = bucket === 'regular' ? baseHours : 0
      const eveningHours = bucket === 'evening' ? baseHours : 0
      const weekendHours = bucket === 'weekend' ? baseHours : 0
      const holidayHours = bucket === 'holiday' ? baseHours : 0
      const grossPay =
        regularHours * rates.standardRate +
        eveningHours * rates.eveningRate +
        weekendHours * rates.weekendRate +
        holidayHours * rates.holidayRate +
        overtimeHours * rates.overtimeRate

      const staffId = shift.staff_id ?? 'unassigned'
      const staffName = relationRow(shift.profiles)?.full_name ?? 'Unassigned staff'
      const currentSummary = summaries.get(staffId) ?? {
        staffId,
        staffName,
        shifts: 0,
        regularHours: 0,
        eveningHours: 0,
        weekendHours: 0,
        holidayHours: 0,
        overtimeHours: 0,
        grossPay: 0,
      }

      currentSummary.shifts += 1
      currentSummary.regularHours += regularHours
      currentSummary.eveningHours += eveningHours
      currentSummary.weekendHours += weekendHours
      currentSummary.holidayHours += holidayHours
      currentSummary.overtimeHours += overtimeHours
      currentSummary.grossPay += grossPay
      summaries.set(staffId, currentSummary)

      return {
        shiftId: shift.id,
        staffId,
        staffName,
        workDate,
        actualStart: actualStart.toISOString(),
        actualEnd: actualEnd.toISOString(),
        hours: round(hours),
        regularHours: round(regularHours),
        eveningHours: round(eveningHours),
        weekendHours: round(weekendHours),
        holidayHours: round(holidayHours),
        overtimeHours: round(overtimeHours),
        grossPay: round(grossPay),
      }
    }) ?? []

    return jsonResponse({
      ok: true,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      rates,
      totals: [...summaries.values()]
        .sort((left, right) => right.grossPay - left.grossPay)
        .map(summary => ({
          ...summary,
          regularHours: round(summary.regularHours),
          eveningHours: round(summary.eveningHours),
          weekendHours: round(summary.weekendHours),
          holidayHours: round(summary.holidayHours),
          overtimeHours: round(summary.overtimeHours),
          grossPay: round(summary.grossPay),
        })),
      shifts: shiftBreakdown,
    })
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected payments calculation error.',
      },
      500,
    )
  }
})

function round(value: number) {
  return Math.round(value * 100) / 100
}
