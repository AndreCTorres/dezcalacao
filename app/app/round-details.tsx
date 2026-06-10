'use client'

// app/app/round-details.tsx
// Exibe detalhes de pontuação por rodada

import { useState, useEffect } from 'react'
import { supabaseAdmin } from '@/lib/supabase-server'

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
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const fetchRounds = async () => {
      setLoading(true)
      try {
        // Buscar rodadas do grupo
        const res = await fetch(`/api/rounds/${groupId}/details`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })

        if (res.ok) {
          const data = await res.json()
          setRounds(data.rounds || [])
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
    <div className="space-y-3">
      {rounds.map((round) => (
        <div
          key={round.roundId}
          className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
        >
          <button
            onClick={() => setExpanded(expanded === round.roundId ? null : round.roundId)}
            className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-700/50 transition"
          >
            <span className="font-semibold text-white">{round.roundName}</span>
            <span className="text-gray-400">{expanded === round.roundId ? '−' : '+'}</span>
          </button>

          {expanded === round.roundId && (
            <div className="px-4 py-3 bg-gray-900/50 border-t border-gray-700 space-y-2">
              {round.scores.map((score) => {
                const isCurrent = score.memberId === currentMemberId
                return (
                  <div
                    key={score.memberId}
                    className={`flex justify-between items-center p-2 rounded ${
                      isCurrent ? 'bg-lime-400/10' : 'bg-gray-800/50'
                    }`}
                  >
                    <span className={isCurrent ? 'text-lime-400 font-medium' : 'text-gray-300'}>
                      {score.memberName}
                    </span>
                    <span className={isCurrent ? 'font-bold text-lime-400' : 'text-gray-400'}>
                      {score.points} pts
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
