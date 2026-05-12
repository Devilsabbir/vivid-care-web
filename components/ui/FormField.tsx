'use client'

import { type ReactNode, useId } from 'react'

interface FormFieldProps {
  label: string
  type?: 'text' | 'email' | 'tel' | 'date' | 'time' | 'datetime-local' | 'number' | 'password' | 'url'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
  className?: string
}

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
  disabled?: boolean
  children: ReactNode
  className?: string
}

interface TextareaFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
  disabled?: boolean
  rows?: number
  className?: string
}

const baseInput = 'mt-2 w-full rounded-2xl border bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91] focus-visible:ring-offset-1'
const normalBorder = 'border-[#e6e8ec]'
const errorBorder = 'border-[#ef4444]'

export function FormField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  error,
  disabled,
  className = '',
}: FormFieldProps) {
  const id = useId()
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
        {label}
        {required && <span className="text-[#ef4444]" aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`${baseInput} ${error ? errorBorder : normalBorder} ${disabled ? 'opacity-60' : ''}`}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-[#ef4444]" role="alert">{error}</p>
      )}
    </div>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  required,
  error,
  disabled,
  children,
  className = '',
}: SelectFieldProps) {
  const id = useId()
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
        {label}
        {required && <span className="text-[#ef4444]" aria-hidden="true"> *</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`${baseInput} ${error ? errorBorder : normalBorder} ${disabled ? 'opacity-60' : ''}`}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-[#ef4444]" role="alert">{error}</p>
      )}
    </div>
  )
}

export function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  disabled,
  rows = 3,
  className = '',
}: TextareaFieldProps) {
  const id = useId()
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
        {label}
        {required && <span className="text-[#ef4444]" aria-hidden="true"> *</span>}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`${baseInput} ${error ? errorBorder : normalBorder} ${disabled ? 'opacity-60' : ''} resize-none`}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-[#ef4444]" role="alert">{error}</p>
      )}
    </div>
  )
}
