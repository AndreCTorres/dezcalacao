'use client'

// app/admin/rodadas/round-list.tsx
// Lista de rodadas com ações

import { useState } from 'react'
import { closeRound } from './actions'

type Round = {
  id: string
  name: string
  status: string
  starts_at: string | null
  locked_at: string | null
  created_at: string
}

type RoundListProps = {
  groupId: string
  rounds: Round[]
}

export function RoundList({ groupId, rounds }: RoundListProps) {
  const [closing, setClosing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClose = async (roundId: string) => {
    if (!window.confirm('Fechar rodada? O sistema calculará as pontuações.')) return

    setClosing(roundId)
    setError(null)

    const res = await closeRound(groupId, roundId)

    if (!res.success) {
      setError(res.error)
    }

    setClosing(null)
  }

  if (rounds.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
        <p className="text-gray-400">Nenhuma rodada criada ainda</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 text-sm">
          {error}
        </div>
      )}

      {rounds.map(round => (
        <div key={round.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-white">{round.name}</h3>
              <div className="text-xs text-gray-400 mt-1">
                {round.starts_at && (
                  <p>📅 {new Date(round.starts_at).toLocaleDateString('pt-BR')}</p>
                )}
              </div>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded ${
                round.status === 'open'
                  ? 'bg-lime-400/20 text-lime-400'
                  : round.status === 'locked'
                    ? 'bg-yellow-400/20 text-yellow-400'
                    : 'bg-gray-600 text-gray-300'
              }`}
            >
              {round.status === 'open'
                ? '🔓 Aberta'
                : round.status === 'locked'
                  ? '🔒 Fechada'
                  : 'Pontuada'}
            </span>
          </div>

          {round.status === 'open' && (
            <button
              onClick={() => handleClose(round.id)}
              disabled={closing === round.id}
              className="w-full py-2 px-3 text-sm bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded transition disabled:opacity-50"
            >
              {closing === round.id ? '⏳ Fechando...' : '🔒 Fechar Rodada'}
            </button>
          )}

          {round.status === 'locked' && (
            <p className="text-xs text-gray-400">
              ✓ Rodada fechada em {new Date(round.locked_at!).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
