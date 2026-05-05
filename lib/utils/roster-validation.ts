import { getExpiryStatus } from './expiry'

export interface ValidationResult {
  type: 'error' | 'warning'
  message: string
  icon: string
}

export interface ShiftInput {
  staff_id?: string | null
  client_id?: string | null
  start_time: string
  end_time: string
  overnight?: boolean
}

export interface ExistingShift {
  id: string
  staff_id: string | null
  start_time: string
  end_time: string
}

export interface StaffDocument {
  expiry_date: string | null
  doc_type: string
}

export interface ClientRecord {
  id: string
  status?: string | null
  lat?: number | null
  lng?: number | null
}

export function validateShift(
  shift: ShiftInput,
  existingShifts: ExistingShift[],
  staffDocuments: StaffDocument[],
  client: ClientRecord | null,
  editingShiftId?: string
): ValidationResult[] {
  const results: ValidationResult[] = []

  // Check time range validity
  const timeResult = checkTimeRange(shift.start_time, shift.end_time, shift.overnight)
  if (timeResult) results.push(timeResult)

  // Check inactive client
  if (client) {
    const clientResult = checkClientActive(client)
    if (clientResult) results.push(clientResult)
  }

  // Check staff-related validations
  if (shift.staff_id) {
    // Double booking
    const bookingResult = checkDoubleBooking(existingShifts, shift, editingShiftId)
    if (bookingResult) results.push(bookingResult)

    // Staff documents
    const docResults = checkStaffDocuments(staffDocuments)
    results.push(...docResults)
  } else {
    // Unassigned shift warning
    results.push({
      type: 'warning',
      message: 'This shift has no assigned staff. It will appear in Unassigned shifts.',
      icon: 'person_off',
    })
  }

  // Check geofence
  if (client) {
    const geoResult = checkGeofenceConfigured(client)
    if (geoResult) results.push(geoResult)
  }

  return results
}

export function checkTimeRange(
  startTime: string,
  endTime: string,
  overnight?: boolean
): ValidationResult | null {
  if (!startTime || !endTime) return null

  const start = new Date(startTime)
  const end = new Date(endTime)

  if (end <= start && !overnight) {
    return {
      type: 'error',
      message: 'The end time is before the start time. Enable overnight shift or adjust the time.',
      icon: 'schedule',
    }
  }

  return null
}

export function checkDoubleBooking(
  existingShifts: ExistingShift[],
  newShift: ShiftInput,
  editingShiftId?: string
): ValidationResult | null {
  if (!newShift.staff_id || !newShift.start_time || !newShift.end_time) return null

  const newStart = new Date(newShift.start_time).getTime()
  const newEnd = new Date(newShift.end_time).getTime()

  const conflict = existingShifts.find(shift => {
    if (editingShiftId && shift.id === editingShiftId) return false
    if (shift.staff_id !== newShift.staff_id) return false

    const existStart = new Date(shift.start_time).getTime()
    const existEnd = new Date(shift.end_time).getTime()

    return newStart < existEnd && newEnd > existStart
  })

  if (conflict) {
    return {
      type: 'error',
      message: 'This staff member is already assigned to another shift at this time.',
      icon: 'event_busy',
    }
  }

  return null
}

export function checkStaffDocuments(documents: StaffDocument[]): ValidationResult[] {
  const results: ValidationResult[] = []

  const hasExpired = documents.some(doc => getExpiryStatus(doc.expiry_date) === 'expired')
  if (hasExpired) {
    results.push({
      type: 'error',
      message: 'This staff member has expired documents and is not roster-ready.',
      icon: 'gpp_bad',
    })
  }

  const hasExpiring = documents.some(doc => getExpiryStatus(doc.expiry_date) === 'near_expiry')
  if (hasExpiring && !hasExpired) {
    results.push({
      type: 'warning',
      message: 'This staff member has documents expiring within 45 days.',
      icon: 'warning',
    })
  }

  return results
}

export function checkClientActive(client: ClientRecord): ValidationResult | null {
  if (client.status === 'inactive') {
    return {
      type: 'error',
      message: 'This client is inactive. Reactivate the client before scheduling care.',
      icon: 'person_off',
    }
  }
  return null
}

export function checkGeofenceConfigured(client: ClientRecord): ValidationResult | null {
  if (!client.lat || !client.lng) {
    return {
      type: 'warning',
      message: 'No location set for this client. Geofence validation won\'t apply.',
      icon: 'location_off',
    }
  }
  return null
}
