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
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null)

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
          // Expande a primeira rodada com scores por padrão
          if (sorted.length > 0) {
            setExpandedRoundId(sorted[0].roundId)
          }
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
    <div className="h-full flex flex-col">
      <h2
        className="text-lg font-bold text-lime-400 mb-3"
        style={{ fontFamily: 'Anton, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}
      >
        📊 Pontuação por Rodadas
      </h2>
      <div className="space-y-3 overflow-y-auto pr-2 flex-1">
        {rounds.map((round) => {
          const currentScore = round.scores.find(s => s.memberId === currentMemberId)
          const isExpanded = expandedRoundId === round.roundId
          
          return (
            <div
              key={round.roundId}
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setExpandedRoundId(isExpanded ? null : round.roundId)}
                className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-700/50 transition text-left"
              >
                <span className="font-semibold text-white flex items-center gap-2">
                  <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                  {round.roundName}
                </span>
                {currentScore ? (
                  <span className="font-bold text-lime-400 bg-lime-500/20 px-3 py-1 rounded-full text-sm">
                    {currentScore.points} pts
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">—</span>
                )}
              </button>
              
              {/* Conteúdo expandido com scores de todos */}
              {isExpanded && round.scores.length > 0 && (
                <div className="border-t border-gray-700 bg-gray-800/50 px-4 py-3 space-y-2">
                  {round.scores.map((score) => (
                    <div
                      key={score.memberId}
                      className="flex justify-between items-center py-1"
                    >
                      <span className={`text-sm ${score.memberId === currentMemberId ? 'font-bold text-lime-300' : 'text-gray-400'}`}>
                        {score.memberName}
                        {score.memberId === currentMemberId && ' (você)'}
                      </span>
                      <span className={`text-sm font-mono ${score.memberId === currentMemberId ? 'text-lime-400' : 'text-gray-500'}`}>
                        {score.points.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
