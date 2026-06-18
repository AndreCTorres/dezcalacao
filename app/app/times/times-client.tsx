'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PitchView, type PitchPlayer } from '@/app/app/pitch-view'
import { ParticipantStandings } from '@/app/app/participant-standings'
import { RoundDetails } from '@/app/app/round-details'
import { getParticipantTeam } from './actions'

export type TimesMember = {
  id: string
  display_name: string
  status: string
  profile_id: string | null
}

type Props = {
  groupId: string
  currentMemberId: string
  members: TimesMember[]
}

export function TimesClient({ groupId, currentMemberId, members }: Props) {
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? currentMemberId)
  const [teamPlayers, setTeamPlayers] = useState<PitchPlayer[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? members[0],
    [members, selectedMemberId]
  )

  useEffect(() => {
    if (!selectedMemberId) return

    async function fetchTeam() {
      setLoadingTeam(true)
      try {
        const result = await getParticipantTeam(groupId, selectedMemberId)
        setTeamPlayers(result.success ? result.team : [])
      } finally {
        setLoadingTeam(false)
      }
    }

    fetchTeam()
  }, [groupId, selectedMemberId])

  return (
    <div className="min-h-screen text-white" style={{ background: '#0a0e0c' }}>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8 flex justify-between items-start gap-4">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-black tracking-tight mb-2"
              style={{ fontFamily: 'Anton, sans-serif', textTransform: 'uppercase', color: '#c5f24a' }}
            >
              Times dos Participantes
            </h1>
            <p className="text-gray-400 text-sm">Veja os elencos de todos no seu grupo</p>
          </div>
          <Link
            href="/app"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition"
            style={{ background: 'rgba(197,242,74,.1)', color: '#c5f24a', border: '1px solid rgba(197,242,74,.3)' }}
          >
            ← Voltar
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-xs mb-2" style={{ color: '#8b9690', fontFamily: 'Space Mono, monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Selecionar participante:
          </p>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition"
                style={
                  member.id === selectedMemberId
                    ? { background: 'rgba(197,242,74,.2)', color: '#c5f24a', border: '1px solid rgba(197,242,74,.4)' }
                    : { background: 'rgba(255,255,255,.05)', color: '#8b9690', border: '1px solid rgba(255,255,255,.08)' }
                }
              >
                {member.id === selectedMemberId ? '● ' : ''}{member.display_name}
                {member.status !== 'joined' && <span className="ml-1 text-xs opacity-60">(convidado)</span>}
              </button>
            ))}
          </div>
        </div>

        {selectedMember && (
          <>
            <div className="mb-8 p-4 bg-gray-800/30 backdrop-blur rounded-lg border border-gray-700/50">
              <p className="text-gray-300 text-sm">
                Time de <span style={{ color: '#c5f24a' }} className="font-semibold">{selectedMember.display_name}</span>
              </p>
            </div>

            {loadingTeam ? (
              <div className="rounded-xl p-12 text-center border border-white/10 bg-white/[0.03] text-gray-400">
                Carregando time...
              </div>
            ) : teamPlayers.length === 0 ? (
              <div className="rounded-xl p-12 text-center border border-white/10 bg-white/[0.03]">
                <p className="text-gray-400 text-lg font-medium mb-2">{selectedMember.display_name} ainda nao tem time</p>
                <p className="text-gray-500 text-sm">Nenhum jogador foi atribuido no draft.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2">
                    <PitchView
                      team={teamPlayers}
                      memberTeamName={`Time de ${selectedMember.display_name}`}
                      lateralSideMode="normal"
                      showSubsButton={false}
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <ParticipantStandings
                      groupId={groupId}
                      members={members as any}
                      currentMemberId={currentMemberId}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <RoundDetails groupId={groupId} currentMemberId={currentMemberId} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
