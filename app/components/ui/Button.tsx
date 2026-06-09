/**
 * Componente Button reutilizável
 * Variantes: primary (verde-limão), secondary (cinza), danger (vermelho)
 */

import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  children: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-lime-400 text-gray-900 hover:bg-lime-500 active:bg-lime-600 disabled:bg-gray-500',
  secondary:
    'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-800 disabled:bg-gray-600',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-gray-500',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm font-medium rounded',
  md: 'px-4 py-2 text-base font-medium rounded-lg',
  lg: 'px-6 py-3 text-lg font-semibold rounded-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'font-medium transition-colors duration-200 disabled:cursor-not-allowed'
  const widthStyles = fullWidth ? 'w-full' : ''
  const loadingStyles = loading ? 'opacity-75 cursor-wait' : ''

  const combinedClasses = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${widthStyles}
    ${loadingStyles}
    ${className}
  `.trim()

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={combinedClasses}
    >
      {loading ? (
        <>
          <span className="inline-block animate-spin mr-2">⟳</span>
          {children}
        </>
      ) : (
        children
      )}
    </button>
  )
}
