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

// Input recipe aligned with the design's .login-input + .vc-input-native:
//  - 44px height (textarea grows from there), 10px radius
//  - 1.5px slate-200 border, warm white background
//  - 13.5px / 400 slate-900 text, 14.5px slate-400 placeholder
//  - Focus: purple border + soft purple glow (matches the login + modal pattern)
const baseInput =
  'mt-2 w-full rounded-[10px] border-[1.5px] bg-white px-3.5 text-[13.5px] text-[#1A1320] outline-none transition-all placeholder:text-[#97909C] focus:border-[#6B2C91] focus:shadow-[0_0_0_3px_#F4ECF8]'
const baseInputHeight = 'h-[44px]'
const normalBorder = 'border-[#E5E1E8]'
const errorBorder = 'border-[#DC2626]'
const labelStyle = 'block text-[11px] font-semibold uppercase text-[#3F3548]'

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
      <label
        htmlFor={id}
        className={labelStyle}
        style={{ letterSpacing: '0.08em' }}
      >
        {label}
        {required && <span className="text-[#DC2626]" aria-hidden="true"> *</span>}
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
        className={`${baseInput} ${baseInputHeight} ${error ? errorBorder : normalBorder} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-[12px] font-medium text-[#DC2626]" role="alert">
          {error}
        </p>
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
      <label
        htmlFor={id}
        className={labelStyle}
        style={{ letterSpacing: '0.08em' }}
      >
        {label}
        {required && <span className="text-[#DC2626]" aria-hidden="true"> *</span>}
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
        className={`${baseInput} ${baseInputHeight} ${error ? errorBorder : normalBorder} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 text-[12px] font-medium text-[#DC2626]" role="alert">
          {error}
        </p>
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
      <label
        htmlFor={id}
        className={labelStyle}
        style={{ letterSpacing: '0.08em' }}
      >
        {label}
        {required && <span className="text-[#DC2626]" aria-hidden="true"> *</span>}
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
        className={`${baseInput} py-3 ${error ? errorBorder : normalBorder} ${disabled ? 'cursor-not-allowed opacity-60' : ''} resize-none`}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-[12px] font-medium text-[#DC2626]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
