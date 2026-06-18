'use client'

// app/app/participant-standings.tsx
// Ranking do grupo com pontuação em tempo real

import { useEffect, useState } from 'react'
import { getGroupStandingsWithRounds } from './standings-actions'

type Standing = {
  memberId: string
  memberName: string
  totalPoints: number
  lastRoundPoints: number
}

type ParticipantStandingsProps = {
  groupId: string
  members: { id: string; display_name: string; profile_id: string | null; status: string }[]
  currentMemberId: string
}

export function ParticipantStandings({ groupId, members, currentMemberId }: ParticipantStandingsProps) {
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    const fetchStandings = async () => {
      setLoading(true)
      const result = await getGroupStandingsWithRounds(groupId)

      if (result.success) {
        setStandings(result.standings)
        setLastUpdate(new Date())
      } else {
        // Fallback: mostrar membros sem pontos
        const fallbackStandings = members
          .filter((m) => m.status === 'joined')
          .map((m) => ({
            memberId: m.id,
            memberName: m.display_name,
            totalPoints: 0,
            lastRoundPoints: 0,
          }))
        setStandings(fallbackStandings)
      }

      setLoading(false)
    }

    fetchStandings()

    // Atualizar a cada 5 minutos (ranking não muda com frequência)
    const interval = setInterval(fetchStandings, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [groupId, members])

  // Se não há standings, mostrar membros vazios
  const displayStandings =
    standings.length > 0
      ? standings
      : members
          .filter((m) => m.status === 'joined')
          .map((m) => ({
            memberId: m.id,
            memberName: m.display_name,
            totalPoints: 0,
            lastRoundPoints: 0,
          }))
          .sort((a, b) => a.memberName.localeCompare(b.memberName))

  const getMedalEmoji = (position: number): string => {
    switch (position) {
      case 0:
        return '🥇'
      case 1:
        return '🥈'
      case 2:
        return '🥉'
      default:
        return ''
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 h-full flex flex-col">
      <h2 className="text-base font-bold text-white mb-2">🏆 Ranking</h2>

      {displayStandings.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">Nenhum membro</p>
      ) : (
        <div className="space-y-1">
          {displayStandings.map((member, idx) => {
            const isCurrent = member.memberId === currentMemberId
            const medal = getMedalEmoji(idx)

            return (
              <div
                key={member.memberId}
                className={`flex justify-between items-center px-2 py-1.5 rounded-lg transition ${
                  isCurrent ? 'bg-lime-400/20 border border-lime-400 shadow-lg shadow-lime-400/20' : 'bg-gray-700/50 hover:bg-gray-700/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6">
                    {medal ? (
                      <span className="text-base">{medal}</span>
                    ) : (
                      <span className="text-xs font-bold text-gray-500">{idx + 1}º</span>
                    )}
                  </div>
                  <span className={`text-sm ${isCurrent ? 'text-lime-400 font-semibold' : 'text-white'}`}>
                    {member.memberName}
                  </span>
                </div>

                <div className="flex flex-col items-end leading-tight">
                  <span className="font-bold text-base text-lime-400">{member.totalPoints}</span>
                  {member.lastRoundPoints > 0 && (
                    <span className="text-xs text-gray-400">
                      {member.lastRoundPoints > 0 ? '+' : ''}{member.lastRoundPoints} ult.
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">
            {loading ? '⏳ Carregando...' : '✓ Atualizado'}
          </p>
          {lastUpdate && (
            <p className="text-xs text-gray-600">
              Atualiza a cada 5min
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
