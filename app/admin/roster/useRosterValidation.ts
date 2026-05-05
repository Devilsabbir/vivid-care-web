'use client'

import { useMemo } from 'react'
import {
  validateShift,
  type ValidationResult,
  type ExistingShift,
  type StaffDocument,
  type ClientRecord,
} from '@/lib/utils/roster-validation'

interface UseRosterValidationProps {
  staffId: string
  clientId: string
  startTime: string
  endTime: string
  existingShifts: ExistingShift[]
  staffDocuments: StaffDocument[]
  client: ClientRecord | null
}

export function useRosterValidation({
  staffId,
  clientId,
  startTime,
  endTime,
  existingShifts,
  staffDocuments,
  client,
}: UseRosterValidationProps): ValidationResult[] {
  return useMemo(() => {
    // Don't validate until minimum required data exists
    if (!clientId || !startTime || !endTime) return []

    return validateShift(
      {
        staff_id: staffId || null,
        client_id: clientId,
        start_time: startTime,
        end_time: endTime,
      },
      existingShifts,
      staffDocuments,
      client,
    )
  }, [staffId, clientId, startTime, endTime, existingShifts, staffDocuments, client])
}
