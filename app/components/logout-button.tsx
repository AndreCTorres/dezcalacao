'use client'

// app/components/logout-button.tsx
// Botão de logout reutilizável.

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LogoutButton({ className = '' }: { className?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/login')
        router.refresh()
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`px-4 py-2 text-sm font-medium text-gray-900 bg-gray-300 hover:bg-gray-400 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? 'Saindo...' : 'Sair'}
    </button>
  )
}
