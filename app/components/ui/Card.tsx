/**
 * Componente Card reutilizável
 * Container com estilos padrão (fundo cinza, borda sutil)
 */

import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  padding?: 'sm' | 'md' | 'lg'
  highlight?: boolean
}

const paddingStyles = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({
  children,
  padding = 'md',
  highlight = false,
  className = '',
  ...props
}: CardProps) {
  const baseStyles =
    'bg-gray-800 border border-gray-700 rounded-lg transition-colors duration-200'
  const highlightStyles = highlight
    ? 'border-lime-400 shadow-lg shadow-lime-400/20'
    : 'hover:border-gray-600'

  const combinedClasses = `
    ${baseStyles}
    ${paddingStyles[padding]}
    ${highlightStyles}
    ${className}
  `.trim()

  return (
    <div {...props} className={combinedClasses}>
      {children}
    </div>
  )
}
