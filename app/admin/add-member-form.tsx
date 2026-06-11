'use client'

// app/admin/add-member-form.tsx
// Formulário para adicionar membros ao grupo.

import { useState } from 'react'
import { addMember } from './actions'

function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast(message, type, 3000)
  }
}

type AddMemberFormProps = {
  groupId: string
}

export function AddMemberForm({ groupId }: AddMemberFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    
    // Capturar referência do form ANTES do await
    // (e.currentTarget vira null após operações assíncronas)
    const form = e.currentTarget
    
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(form)
    formData.append('groupId', groupId)

    const result = await addMember(formData)

    setLoading(false)

    if (result.error) {
      setError(result.error)
      showToast(result.error, 'error')
    } else {
      setSuccess(true)
      if (result.message) {
        showToast(result.message, 'success')
      }
      // Limpar formulário usando a referência capturada
      form.reset()
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">
        Adicionar membro
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
            Nome *
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="Ex: João Silva"
            required
            disabled={loading}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-300 mb-2">
            E-mail (opcional)
          </label>
          <input
            id="inviteEmail"
            name="inviteEmail"
            type="email"
            placeholder="joao@email.com"
            disabled={loading}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">
            O e-mail será usado futuramente para convidar o membro
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20 text-sm">
            Membro adicionado com sucesso!
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-lime-400 hover:bg-lime-500 text-gray-900 font-semibold rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-lime-400"
        >
          {loading ? 'Adicionando...' : 'Adicionar membro'}
        </button>
      </form>
    </div>
  )
}
