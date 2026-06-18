'use client'

// app/app/round-details.tsx
// Exibe histórico de pontuação do participante por rodada — ordem cronológica (Rodada 1 primeiro, Final por último)

import { useEffect, useState } from 'react'

type RoundDetail = {
  roundId: string
  roundName: string
  userScore: number | null
}

interface RoundDetailsProps {
  groupId: string
  currentMemberId: string
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
          // Mapear dados: manter apenas score do usuário atual por rodada
          const sorted = [...(data.rounds || [])].reverse().map((round: any) => {
            const currentScore = round.scores?.find((s: any) => s.memberId === currentMemberId)
            return {
              roundId: round.roundId,
              roundName: round.roundName,
              userScore: currentScore?.points ?? null,
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
    <div className="h-full flex flex-col">
      <h2
        className="text-lg font-bold text-lime-400 mb-3"
        style={{ fontFamily: 'Anton, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}
      >
        📊 Pontuação por Rodadas
      </h2>
      <div className="space-y-2 overflow-y-auto pr-2 flex-1">
        {rounds.map((round) => (
          <div
            key={round.roundId}
            className="bg-gray-800 rounded-lg border border-gray-700 px-4 py-3 flex justify-between items-center"
          >
            <span className="font-semibold text-gray-200">
              {round.roundName}
            </span>
            {round.userScore !== null ? (
              <span className="font-bold text-lime-400 bg-lime-500/20 px-3 py-1 rounded-full text-sm">
                {round.userScore.toFixed(1)} pts
              </span>
            ) : (
              <span className="text-gray-500 text-sm">—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
