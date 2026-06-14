'use client'

import { useState } from 'react'
import { updateMemberProfile } from './profile-actions'

type EditProfileModalProps = {
  memberId: string
  currentDisplayName: string
  currentTeamName?: string | null
  onClose: () => void
  onSuccess: () => void
}

export function EditProfileModal({
  memberId,
  currentDisplayName,
  currentTeamName,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName)
  const [teamName, setTeamName] = useState(currentTeamName || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await updateMemberProfile(memberId, displayName, teamName)

    if (!result.success) {
      setError(result.error || 'Erro ao salvar')
      setLoading(false)
      return
    }

    // Sucesso
    if (typeof window !== 'undefined' && (window as any).showToast) {
      (window as any).showToast('Perfil atualizado com sucesso!', 'success', 3000)
    }

    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full shadow-xl">
        <h2 className="text-xl font-bold text-lime-400 mb-4">Editar Perfil</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome de usuário */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome de Usuário *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: João Silva"
              maxLength={100}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-lime-400 transition"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">
              {displayName.length}/100
            </p>
          </div>

          {/* Nome do time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Seu Time
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Ex: Seleção dos Cracks"
              maxLength={100}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-lime-400 transition"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">
              {teamName.length}/100
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !displayName.trim()}
              className="flex-1 px-4 py-2 bg-lime-400 hover:bg-lime-500 text-gray-900 font-semibold rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
