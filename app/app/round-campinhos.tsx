'use client'

// app/app/round-campinhos.tsx
// Exibe detalhes de notas por jogo (campinhos) de uma rodada

import { useState, useEffect } from 'react'

type PlayerRating = {
  player_id: number
  name: string
  team_name: string
  position: string
  rating: number | null
  minutes: number | null
}

type GameDetail = {
  id: number
  roundId: string
  roundName: string
  label: string
  homeTeam: string | null
  awayTeam: string | null
  homeGoals: number | null
  awayGoals: number | null
  score: string | null
  players: PlayerRating[]
}

type RoundInfo = {
  id: string
  name: string
  status: string
}

interface RoundCampinhosProps {
  groupId: string
  roundId?: string
}

function ratingBadge(r: number | null): string {
  if (r === null) return 'bg-gray-600 text-white'
  if (r >= 8) return 'bg-yellow-400 text-gray-900'
  if (r >= 7) return 'bg-lime-400 text-gray-900'
  if (r >= 6) return 'bg-white/15 text-white'
  if (r >= 5) return 'bg-orange-500/80 text-white'
  return 'bg-red-600/80 text-white'
}

export function RoundCampinhos({ groupId, roundId }: RoundCampinhosProps) {
  const [games, setGames] = useState<GameDetail[]>([])
  const [round, setRound] = useState<RoundInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null)

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true)
      try {
        const url = new URL('/api/rounds/' + groupId + '/fixtures', window.location.origin)
        if (roundId) {
          url.searchParams.set('roundId', roundId)
        }

        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (res.ok) {
          const data = await res.json()
          setRound(data.round)
          setGames(data.games || [])
          // Expande o primeiro jogo por padrão
          if (data.games?.length > 0) {
            setExpandedGameId(data.games[0].id)
          }
        }
      } catch (error) {
        console.error('[RoundCampinhos] Erro:', error)
      }
      setLoading(false)
    }

    fetchGames()
  }, [groupId, roundId])

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm">⏳ Carregando campinhos...</p>
      </div>
    )
  }

  if (!round || games.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm">Nenhum jogo com notas nesta rodada</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2
        className="text-lg font-bold text-lime-400 mb-3"
        style={{ fontFamily: 'Anton, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}
      >
        ⚽ Notas por Jogo ({round.name})
      </h2>

      {games.map((game) => {
        const isExpanded = expandedGameId === game.id
        const totalPlayers = game.players.length

        return (
          <div
            key={game.id}
            className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
          >
            {/* Cabeçalho clicável */}
            <button
              onClick={() => setExpandedGameId(isExpanded ? null : game.id)}
              className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-700/50 transition text-left"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                <span className="text-white font-bold text-sm truncate">{game.label}</span>
              </span>
              <span className="flex items-center gap-3 shrink-0">
                {game.score && (
                  <span className="font-mono font-black text-lime-400 text-sm">{game.score}</span>
                )}
                <span className="text-gray-500 text-xs">{totalPlayers} notas</span>
              </span>
            </button>

            {/* Conteúdo expandido */}
            {isExpanded && (
              <div>
                {/* Placar */}
                {game.homeTeam && game.awayTeam && (
                  <div className="px-4 py-3 border-t border-white/10 bg-lime-400/[0.06]">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="min-w-0 text-right">
                        <p className="truncate text-xs font-black uppercase tracking-wide text-lime-300">
                          {game.homeTeam}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-lime-400/25 bg-black/25 px-3 py-1.5">
                        <span className="min-w-6 text-center font-mono text-xl font-black text-white">
                          {game.homeGoals ?? '—'}
                        </span>
                        <span className="text-xs font-black text-gray-500">x</span>
                        <span className="min-w-6 text-center font-mono text-xl font-black text-white">
                          {game.awayGoals ?? '—'}
                        </span>
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="truncate text-xs font-black uppercase tracking-wide text-lime-300">
                          {game.awayTeam}
                        </p>
                      </div>
                    </div>
                    {!game.score && (
                      <p className="mt-2 text-center text-[11px] font-medium text-gray-500">
                        Placar ainda não informado
                      </p>
                    )}
                  </div>
                )}

                {/* Jogadores e notas */}
                {totalPlayers === 0 ? (
                  <div className="px-4 py-6 text-center border-t border-white/10 bg-white/[0.02]">
                    <p className="text-gray-400 text-sm">Nenhum jogador com nota para este jogo</p>
                  </div>
                ) : (
                  <div className="border-t border-white/10">
                    <div className="px-4 py-2 bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-lime-300/80">
                      Jogadores ({totalPlayers})
                    </div>
                    <ul className="divide-y divide-white/5">
                      {game.players.map((p) => (
                        <li key={p.player_id} className="flex items-center gap-3 px-4 py-2">
                          <span className="text-[10px] font-black text-gray-500 w-9 shrink-0">
                            {p.position}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{p.name}</p>
                            <p className="text-gray-500 text-xs truncate">{p.team_name}</p>
                          </div>
                          <span className="text-gray-500 text-xs shrink-0">{p.minutes}′</span>
                          <span
                            className={`font-mono font-black text-sm px-2 py-0.5 rounded-md shrink-0 ${ratingBadge(
                              p.rating
                            )}`}
                          >
                            {p.rating?.toFixed(1) ?? '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
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
