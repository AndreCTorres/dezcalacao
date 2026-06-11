'use client'

// app/admin/create-group-form.tsx
// Formulário para criar um novo grupo.

import { useState } from 'react'
import { createGroup } from './actions'

function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast(message, type, 3000)
  }
}

export function CreateGroupForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await createGroup(formData)

    setLoading(false)

    if (result.error) {
      setError(result.error)
      showToast(result.error, 'error')
    } else if (result.success && result.message) {
      showToast(result.message, 'success')
      // Resetar formulário após sucesso
      const form = e.currentTarget as HTMLFormElement
      if (form) {
        form.reset()
      }
    }
    // Se sucesso, a página será revalidada automaticamente pelo revalidatePath
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
        <h2 className="text-2xl font-bold text-lime-400 mb-2">
          Criar grupo
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          Crie um grupo para começar seu bolão da Copa do Mundo
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Nome do grupo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Ex: Bolão da Firma"
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
            />
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-lime-400 hover:bg-lime-500 text-gray-900 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-lime-400"
          >
            {loading ? 'Criando...' : 'Criar grupo'}
          </button>
        </form>
      </div>
    </div>
  )
}
