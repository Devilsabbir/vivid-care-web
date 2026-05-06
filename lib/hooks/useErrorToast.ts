import { useState, useCallback } from 'react'

export function useErrorToast() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const showError = useCallback((message: string) => {
    setErrorMessage(message)
  }, [])

  const dismiss = useCallback(() => {
    setErrorMessage(null)
  }, [])

  return { errorMessage, showError, dismiss }
}
