'use client'

// app/app/round-details-expanded.tsx
// Exibe pontuação por rodada com DETALHES EXPANDÍVEIS e verificação de conferência

import { useState, useEffect } from 'react'
import { RoundVerification, type VerificationPlayer } from './round-verification'

type RoundDetailScore = {
  roundId: string
  roundName: string
  roundNumber: number
  scores: {
    memberId: string
    memberName: string
    points: number
    playersRated: number
  }[]
}

type TeamPlayerWithRating = {
  id: string
  player_id: number
  slot: 'starter' | 'bench'
  position_slot: string
  rating?: number | null
  minutes?: number
  players: {
    id: number
    name: string
    team_name: string
    position: string
  }
}

type RoundRatingResponse = {
  player_id: number
  rating: number | null
  minutes: number
}

interface RoundDetailsExpandedProps {
  groupId: string
  memberId: string
  memberTeamId: string
  currentMemberId: string
}

export function RoundDetailsExpanded({
  groupId,
  memberId,
  memberTeamId,
  currentMemberId,
}: RoundDetailsExpandedProps) {
  const [rounds, setRounds] = useState<RoundDetailScore[]>([])
  const [expandedRound, setExpandedRound] = useState<string | null>(null)
  const [teamPlayers, setTeamPlayers] = useState<Record<string, TeamPlayerWithRating[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingRound, setLoadingRound] = useState<string | null>(null)

  useEffect(() => {
    fetchRounds()
  }, [groupId])

  const fetchRounds = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/rounds/${groupId}/details`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (res.ok) {
        const data = await res.json()
        const sorted = [...(data.rounds || [])].sort((a: any, b: any) => {
          const numA = parseInt(a.roundName.match(/\d+/)?.[0] || '0')
          const numB = parseInt(b.roundName.match(/\d+/)?.[0] || '0')
          return numA - numB
        })
        
        setRounds(
          sorted.map((r: any) => ({
            ...r,
            roundNumber: parseInt(r.roundName.match(/\d+/)?.[0] || '0'),
          }))
        )
      }
    } catch (error) {
      console.error('[RoundDetailsExpanded] Erro:', error)
    }
    setLoading(false)
  }

  const expandRound = async (roundId: string) => {
    if (expandedRound === roundId) {
      setExpandedRound(null)
      return
    }

    // Se já carregou esse round, não precisa fazer fetch
    if (teamPlayers[roundId]) {
      setExpandedRound(roundId)
      return
    }

    setLoadingRound(roundId)
    try {
      // Fetch do draft do membro
      const res = await fetch(
        `/api/teams?groupId=${groupId}&memberId=${memberTeamId}`,
        { method: 'GET' }
      )

      if (res.ok) {
        const data = await res.json()
        const players = data.players || []

        // Buscar ratings dessa rodada
        const ratingsRes = await fetch(
          `/api/ratings?roundId=${roundId}&playerIds=${players.map((p: any) => p.player_id).join(',')}`,
          { method: 'GET' }
        )

        if (ratingsRes.ok) {
          const ratings = await ratingsRes.json() as RoundRatingResponse[]
          const ratingsMap = new Map<number, RoundRatingResponse>(
            ratings.map((r) => [r.player_id, r])
          )

          // Merge dos dados
          const enriched = players.map((p: any) => ({
            ...p,
            rating: ratingsMap.get(p.player_id)?.rating,
            minutes: ratingsMap.get(p.player_id)?.minutes,
          }))

          setTeamPlayers(prev => ({
            ...prev,
            [roundId]: enriched,
          }))
          setExpandedRound(roundId)
        }
      }
    } catch (error) {
      console.error('[RoundDetailsExpanded] Erro ao expandir round:', error)
    }
    setLoadingRound(null)
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm">⏳ Carregando rodadas...</p>
      </div>
    )
  }

  if (rounds.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm">Nenhuma rodada com pontuação ainda</p>
      </div>
    )
  }

  return (
    <div>
      <h2
        className="text-lg font-bold text-lime-400 mb-3"
        style={{ fontFamily: 'Anton, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}
      >
        📊 Pontuação por Rodadas
      </h2>
      <div className="space-y-2 max-h-[800px] overflow-y-auto pr-2">
        {rounds.map((round) => {
          const currentScore = round.scores.find(s => s.memberId === currentMemberId)
          const isExpanded = expandedRound === round.roundId
          const isLoading = loadingRound === round.roundId
          const hasData = !!teamPlayers[round.roundId]

          return (
            <div key={round.roundId} className="space-y-2">
              {/* Botão principal */}
              <button
                onClick={() => expandRound(round.roundId)}
                disabled={isLoading}
                className="w-full text-left bg-gray-800 hover:bg-gray-700/70 rounded-lg border border-gray-700 hover:border-gray-600 px-4 py-3 transition disabled:opacity-50"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-lg">📊</span>
                    <div>
                      <p className="font-semibold text-white">{round.roundName}</p>
                      <p className="text-xs text-gray-500">
                        {round.scores.length} participantes • Toque para conferência
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {currentScore && (
                      <span className="font-bold text-lime-400 bg-lime-500/20 px-3 py-1 rounded-full text-sm">
                        {currentScore.points.toFixed(2)} pts
                      </span>
                    )}
                    <span className="text-white/50 text-lg">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expandido - Conferência */}
              {isExpanded && (
                <div className="space-y-3 pl-4 pr-2">
                  {isLoading ? (
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <p className="text-gray-400 text-xs">⏳ Carregando dados...</p>
                    </div>
                  ) : hasData ? (
                    <>
                      {/* Verificação do time */}
                      <RoundVerification
                        memberName="Você"
                        round={round.roundNumber}
                        starters={teamPlayers[round.roundId]?.filter(p => p.slot === 'starter') || []}
                        bench={teamPlayers[round.roundId]?.filter(p => p.slot === 'bench') || []}
                        substitutions={[]} // TODO: fetch substitutions
                      />

                      {/* Tabela com todos os scores */}
                      <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                        <div className="bg-gray-800/80 px-3 py-2 border-b border-gray-700">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                            Ranking da Rodada
                          </p>
                        </div>
                        <div className="divide-y divide-gray-700">
                          {round.scores
                            .sort((a, b) => b.points - a.points)
                            .map((score, idx) => {
                              const medal =
                                idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ' '
                              const isCurrentMember = score.memberId === currentMemberId

                              return (
                                <div
                                  key={score.memberId}
                                  className={`px-3 py-2 flex justify-between items-center ${
                                    isCurrentMember
                                      ? 'bg-lime-500/10 border-l-2 border-lime-500'
                                      : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="text-lg w-6">{medal}</span>
                                    <span className="text-sm font-medium text-white">
                                      {score.memberName}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-lime-400">
                                      {score.points.toFixed(2)} pts
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {score.playersRated} jogadores
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <p className="text-gray-400 text-xs">
                        Não foi possível carregar os dados. Tente novamente.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
