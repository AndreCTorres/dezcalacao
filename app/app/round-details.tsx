'use client'

// app/app/round-details.tsx
// Exibe detalhes de pontuação por rodada — ordem cronológica (Rodada 1 primeiro, Final por último)

import { useState, useEffect } from 'react'

type RoundDetail = {
  roundId: string
  roundName: string
  scores: {
    memberId: string
    memberName: string
    points: number
  }[]
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
          // Inverte para ordem cronológica: Rodada 1 primeiro, Final por último
          const sorted = [...(data.rounds || [])].reverse()
          setRounds(sorted)
        }
      } catch (error) {
        console.error('[RoundDetails] Erro:', error)
      }
      setLoading(false)
    }

    fetchRounds()
  }, [groupId])

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
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {rounds.map((round) => {
          // Encontra o score do membro atual
          const currentScore = round.scores.find(s => s.memberId === currentMemberId)
          
          return (
            <div
              key={round.roundId}
              className="bg-gray-800 rounded-lg border border-gray-700 px-4 py-3 flex justify-between items-center hover:bg-gray-700/50 transition"
            >
              <span className="font-semibold text-white">{round.roundName}</span>
              {currentScore ? (
                <span className="font-bold text-lime-400 bg-lime-500/20 px-3 py-1 rounded-full text-sm">
                  {currentScore.points} pts
                </span>
              ) : (
                <span className="text-gray-500 text-sm">—</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
