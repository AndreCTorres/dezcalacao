'use client'

// app/app/player-ratings-view.tsx
// Exibe as notas dos jogadores do time do participante por rodada

import { useState, useEffect } from 'react'

type PlayerRating = {
  playerId: number
  playerName: string
  teamName: string
  position: string
  rating: number | null
  minutes: number
  slot: 'starter' | 'bench'
}

type RoundRatings = {
  roundId: string
  roundName: string
  status: string
  playerRatings: PlayerRating[]
}

interface PlayerRatingsViewProps {
  groupId: string
  memberId: string
}

const POSITION_ORDER: Record<string, number> = { GK: 0, ZAG: 1, LAT: 2, MEI: 3, ATK: 4 }
const POSITION_LABELS: Record<string, string> = {
  GK: 'GL', ZAG: 'ZAG', LAT: 'LAT', MEI: 'MEI', ATK: 'ATK'
}

function ratingColor(r: number | null): string {
  if (r === null) return 'bg-gray-700 text-gray-400'
  if (r >= 8.0) return 'bg-green-500 text-white'
  if (r >= 7.0) return 'bg-lime-500 text-white'
  if (r >= 6.0) return 'bg-yellow-500 text-black'
  if (r >= 5.0) return 'bg-orange-500 text-white'
  return 'bg-red-600 text-white'
}

function sumRatings(players: PlayerRating[]): number {
  return players
    .filter(p => p.slot === 'starter' && p.rating !== null)
    .reduce((sum, p) => sum + (p.rating ?? 0), 0)
}

export function PlayerRatingsView({ groupId, memberId }: PlayerRatingsViewProps) {
  const [rounds, setRounds] = useState<RoundRatings[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/rounds/${groupId}/player-ratings?memberId=${memberId}`)
        if (res.ok) {
          const data = await res.json()
          setRounds(data.rounds ?? [])
          // Expandir automaticamente a rodada mais recente com notas
          const latest = data.rounds?.find((r: RoundRatings) => r.playerRatings.length > 0)
          if (latest) setExpanded(latest.roundId)
        }
      } catch {
        // silencioso
      }
      setLoading(false)
    }
    load()
  }, [groupId, memberId])

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-gray-400 text-sm">
        ⏳ Carregando notas...
      </div>
    )
  }

  const roundsWithRatings = rounds.filter(r => r.playerRatings.length > 0)

  if (roundsWithRatings.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-gray-400 text-sm text-center">
        Nenhuma nota disponível ainda. As notas aparecem após o admin inserir os dados dos jogos.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {roundsWithRatings.map((round) => {
        const starters = round.playerRatings.filter(p => p.slot === 'starter')
          .sort((a, b) => (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9))
        const bench = round.playerRatings.filter(p => p.slot === 'bench')
          .sort((a, b) => (POSITION_ORDER[a.position] ?? 9) - (POSITION_ORDER[b.position] ?? 9))
        const total = sumRatings(round.playerRatings)
        const isExpanded = expanded === round.roundId

        return (
          <div
            key={round.roundId}
            className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
          >
            {/* Header clicável */}
            <button
              onClick={() => setExpanded(isExpanded ? null : round.roundId)}
              className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-700/40 transition"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white text-sm">{round.roundName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  round.status === 'scored'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-lime-500/20 text-lime-400'
                }`}>
                  {round.status === 'scored' ? '✅ Pontuada' : '🟢 Aberta'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {total > 0 && (
                  <span className="text-lime-400 font-bold text-sm">
                    {total.toFixed(2)} pts
                  </span>
                )}
                <span className="text-gray-400 text-sm">{isExpanded ? '−' : '+'}</span>
              </div>
            </button>

            {/* Conteúdo expandido */}
            {isExpanded && (
              <div className="border-t border-gray-700 bg-gray-900/30 px-4 py-3 space-y-4">

                {/* Titulares */}
                {starters.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Titulares
                    </p>
                    <div className="space-y-1.5">
                      {starters.map((p) => {
                        const pontua = p.rating !== null
                        return (
                          <div key={p.playerId} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-7 shrink-0 text-right">
                              {POSITION_LABELS[p.position] ?? p.position}
                            </span>
                            <span className="flex-1 text-sm text-white truncate">
                              {p.playerName}
                              <span className="text-gray-500 text-xs ml-1">({p.teamName})</span>
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">
                              {p.minutes}min
                            </span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded w-10 text-center shrink-0 ${
                              !pontua ? 'bg-gray-700 text-gray-500' : ratingColor(p.rating)
                            }`}>
                              {p.rating !== null ? p.rating.toFixed(1) : '–'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Reservas */}
                {bench.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Reservas
                    </p>
                    <div className="space-y-1.5">
                      {bench.map((p) => (
                        <div key={p.playerId} className="flex items-center gap-2 opacity-60">
                          <span className="text-xs text-gray-500 w-7 shrink-0 text-right">
                            {POSITION_LABELS[p.position] ?? p.position}
                          </span>
                          <span className="flex-1 text-sm text-gray-400 truncate">
                            {p.playerName}
                            <span className="text-gray-600 text-xs ml-1">({p.teamName})</span>
                          </span>
                          <span className="text-xs text-gray-600 shrink-0">
                            {p.minutes > 0 ? `${p.minutes}min` : '–'}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded w-10 text-center shrink-0 ${
                            p.rating !== null ? ratingColor(p.rating) : 'bg-gray-700 text-gray-600'
                          }`}>
                            {p.rating !== null ? p.rating.toFixed(1) : '–'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                {total > 0 && (
                  <div className="pt-2 border-t border-gray-700/50 flex justify-between items-center">
                    <span className="text-xs text-gray-400">Total (titulares com ≥20min)</span>
                    <span className="text-lime-400 font-bold">{total.toFixed(2)} pts</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
