'use client'

import { useState } from 'react'
import { updateMemberProfile } from './profile-actions'

interface FirstEntryDialogProps {
  memberId: string
  currentDisplayName: string
  currentTeamName: string | null
  onComplete: () => void
}

export function FirstEntryDialog({
  memberId,
  currentDisplayName,
  currentTeamName,
  onComplete,
}: FirstEntryDialogProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName)
  const [teamName, setTeamName] = useState(currentTeamName || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await updateMemberProfile(memberId, displayName, teamName || '')

      if (!result.success) {
        setError(result.error || 'Erro ao atualizar perfil')
        return
      }

      // Fechar o dialog marcando como visto
      localStorage.setItem(`first-entry-${memberId}`, 'true')
      onComplete()
    } catch (err) {
      setError('Erro ao atualizar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl border border-white/10 p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-black text-lime-400 mb-2" style={{ fontFamily: 'Anton, sans-serif' }}>
          Bem-vindo! 👋
        </h2>
        <p className="text-gray-300 text-sm mb-6">
          Vamos configurar seu perfil antes de começar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome de Usuário */}
          <div>
            <label className="block text-gray-400 text-sm font-semibold mb-2">
              Seu Nome
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: Lucas"
              className="w-full px-4 py-2.5 bg-gray-900 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 transition"
              disabled={isLoading}
            />
            <p className="text-gray-500 text-xs mt-1">
              Você pode editar depois usando o botão 🎨 Editar Perfil
            </p>
          </div>

          {/* Nome do Time */}
          <div>
            <label className="block text-gray-400 text-sm font-semibold mb-2">
              Nome do Seu Time
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Ex: FC Dragões, Os Invencíveis..."
              className="w-full px-4 py-2.5 bg-gray-900 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-lime-400 transition"
              disabled={isLoading}
            />
            <p className="text-gray-500 text-xs mt-1">
              Aparecerá no seu campinho. Pode deixar em branco se quiser.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-gray-900 font-bold py-3 rounded-lg transition mt-6"
          >
            {isLoading ? 'Salvando...' : 'Continuar'}
          </button>
        </form>

        <p className="text-gray-500 text-xs text-center mt-4">
          Estes dados podem ser alterados a qualquer momento.
        </p>
      </div>
    </div>
  )
}
