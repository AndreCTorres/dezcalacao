'use client'

// app/components/toast.tsx
// Notificações toast para feedback de ações

import { useState, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps extends Toast {
  onClose: (id: string) => void
}

function Toast({ id, message, type, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => onClose(id), duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  const bgColor = {
    success: 'bg-green-900/80 border-green-600',
    error: 'bg-red-900/80 border-red-600',
    warning: 'bg-yellow-900/80 border-yellow-600',
    info: 'bg-blue-900/80 border-blue-600',
  }[type]

  const textColor = {
    success: 'text-green-100',
    error: 'text-red-100',
    warning: 'text-yellow-100',
    info: 'text-blue-100',
  }[type]

  const icon = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }[type]

  return (
    <div
      className={`${bgColor} ${textColor} px-4 py-3 rounded-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200`}
      role="alert"
    >
      <span className="text-lg font-bold">{icon}</span>
      <span className="text-sm">{message}</span>
      <button
        onClick={() => onClose(id)}
        className="ml-auto text-sm hover:opacity-70 transition"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  // Expor método global para adicionar toasts
  useEffect(() => {
    ;(window as any).showToast = (message: string, type: ToastType = 'info', duration?: number) => {
      const id = Math.random().toString(36).substr(2, 9)
      setToasts((prev) => [...prev, { id, message, type, duration }])
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={removeToast} />
        </div>
      ))}
    </div>
  )
}
