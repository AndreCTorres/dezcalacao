/**
 * Componente Input reutilizável
 */

import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Input({
  label,
  error,
  helperText,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-gray-200">{label}</label>
      )}

      <input
        {...props}
        className={`
          bg-gray-700 border border-gray-600 rounded-lg px-4 py-2
          text-white placeholder-gray-400
          focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30
          focus:outline-none
          transition-colors duration-200
          disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-400/30' : ''}
          ${className}
        `.trim()}
      />

      {error && <span className="text-sm text-red-400">{error}</span>}
      {helperText && !error && (
        <span className="text-sm text-gray-400">{helperText}</span>
      )}
    </div>
  )
}
