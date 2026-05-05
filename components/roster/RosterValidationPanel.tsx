import AlertPanel from '@/components/ui/AlertPanel'
import { type ValidationResult } from '@/lib/utils/roster-validation'

export default function RosterValidationPanel({
  results,
}: {
  results: ValidationResult[]
}) {
  const errors = results.filter(r => r.type === 'error')
  const warnings = results.filter(r => r.type === 'warning')

  if (results.length === 0) return null

  return (
    <div className="space-y-2">
      {errors.map((result, i) => (
        <AlertPanel key={`error-${i}`} variant="error" icon={result.icon}>
          <p>{result.message}</p>
        </AlertPanel>
      ))}
      {warnings.map((result, i) => (
        <AlertPanel key={`warning-${i}`} variant="warning" icon={result.icon}>
          <p>{result.message}</p>
        </AlertPanel>
      ))}
    </div>
  )
}
