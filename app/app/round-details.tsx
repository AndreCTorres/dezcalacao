'use client'

// app/app/round-details.tsx
// Pontuacao do participante por rodada, com destaque do vencedor da rodada.

import { useEffect, useState } from 'react'

type RoundWinner = {
  memberId: string
  memberName: string
  points: number
}

type RoundDetail = {
  roundId: string
  roundName: string
  userScore: number | null
  winners: RoundWinner[]
  winnerPoints: number | null
}

interface RoundDetailsProps {
  groupId: string
  currentMemberId: string
}

function formatPoints(points: number) {
  return points.toFixed(1)
}

export function RoundDetails({ groupId, currentMemberId }: RoundDetailsProps) {
  const [rounds, setRounds] = useState<RoundDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRounds = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/rounds/${groupId}/details`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (res.ok) {
          const data = await res.json()
          const sorted = [...(data.rounds || [])].reverse().map((round: any) => {
            const currentScore = round.scores?.find((score: any) => score.memberId === currentMemberId)
            const scores = [...(round.scores ?? [])]
              .filter((score: any) => typeof score.points === 'number' && score.points > 0)
              .sort((a: any, b: any) => b.points - a.points)
            const winnerPoints = scores[0]?.points ?? null
            const winners = winnerPoints == null
              ? []
              : scores.filter((score: any) => Math.abs(score.points - winnerPoints) < 0.001)

            return {
              roundId: round.roundId,
              roundName: round.roundName,
              userScore: currentScore?.points ?? null,
              winners,
              winnerPoints,
            }
          })

          setRounds(sorted)
        }
      } catch (error) {
        console.error('[RoundDetails] Erro:', error)
      }
      setLoading(false)
    }

    fetchRounds()
  }, [groupId, currentMemberId])

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm">Carregando rodadas...</p>
      </div>
    )
  }

  if (rounds.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm">Nenhuma rodada com pontuacao ainda</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <h2
        className="text-lg font-bold text-lime-400 mb-3"
        style={{ fontFamily: 'Anton, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}
      >
        Pontuacao por Rodadas
      </h2>
      <div className="space-y-2 overflow-y-auto pr-2 flex-1">
        {rounds.map((round) => (
          <div
            key={round.roundId}
            className="bg-gray-800 rounded-lg border border-gray-700 px-4 py-3"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <span className="font-semibold text-gray-200 block">
                  {round.roundName}
                </span>
                {round.winners.length > 0 && round.winnerPoints !== null ? (
                  <span className="text-xs text-yellow-300 block mt-1 truncate">
                    Vencedor{round.winners.length > 1 ? 'es' : ''}: {round.winners.map((winner) => winner.memberName).join(', ')} - {formatPoints(round.winnerPoints)} pts
                  </span>
                ) : (
                  <span className="text-xs text-gray-500 block mt-1">Sem vencedor ainda</span>
                )}
              </div>

              {round.userScore !== null ? (
                <span className="font-bold text-lime-400 bg-lime-500/20 px-3 py-1 rounded-full text-sm shrink-0">
                  {formatPoints(round.userScore)} pts
                </span>
              ) : (
                <span className="text-gray-500 text-sm shrink-0">-</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
