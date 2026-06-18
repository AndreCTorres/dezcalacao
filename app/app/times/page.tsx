// app/app/times/page.tsx
// Página para participantes verem os times de outros membros do grupo

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { PitchView, type PitchPlayer } from '@/app/app/pitch-view'
import { ParticipantStandings } from '@/app/app/participant-standings'
import { RoundDetails } from '@/app/app/round-details'

type Member = {
  id: string
  display_name: string
  status: string
  profile_id: string
}

type TeamPlayer = {
  id: string
  player_id: number
  slot: 'starter' | 'bench'
  position_slot: string
  players: {
    id: string
    name: string
    team_name: string
    position: string
    photo_url: string | null
    number: number | null
  }
}

export default function TimesPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [teamPlayers, setTeamPlayers] = useState<PitchPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/login'
          return
        }

        // Encontrar o grupo do usuário
        const { data: memberships } = await supabase
          .from('group_members')
          .select('id, group_id')
          .eq('profile_id', user.id)
          .eq('status', 'joined')
          .limit(1)

        if (!memberships || memberships.length === 0) {
          return
        }

        const currentGroupId = memberships[0].group_id
        const currentMembershipId = memberships[0].id
        setGroupId(currentGroupId)
        setCurrentMemberId(currentMembershipId)

        // Buscar todos os membros do grupo
        const { data: groupMembers } = await supabase
          .from('group_members')
          .select('id, display_name, status, profile_id')
          .eq('group_id', currentGroupId)
          .order('display_name', { ascending: true })

        if (groupMembers) {
          setMembers(groupMembers)
          // Selecionar o primeiro membro por padrão
          if (groupMembers.length > 0) {
            setSelectedMemberId(groupMembers[0].id)
          }
        }
      } catch (error) {
        console.error('[Times] Erro ao carregar membros:', error)
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  // Buscar time do membro selecionado
  useEffect(() => {
    if (!selectedMemberId || !groupId) return

    const fetchTeam = async () => {
      try {
        const { data: team } = await supabase
          .from('team_players')
          .select(`
            id,
            player_id,
            slot,
            position_slot,
            players (
              id,
              name,
              team_name,
              position,
              photo_url,
              number
            )
          `)
          .eq('group_member_id', selectedMemberId)
          .order('slot', { ascending: false })

        const normalizeRatingKey = (name?: string | null, teamName?: string | null) =>
          `${name ?? ''}|${teamName ?? ''}`
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9|]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

        // Buscar rodada mais recente
        const { data: latestRound } = await supabase
          .from('rounds')
          .select('id, name, status')
          .eq('group_id', groupId)
          .in('status', ['scored', 'open'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        let ratingsMap: Record<number, number | null> = {}
        let ratingsByPlayerKey: Record<string, number | null> = {}

        if (latestRound && team) {
          const { data: ratings } = await supabase
            .from('player_round_ratings')
            .select('player_id, rating, players ( name, team_name )')
            .eq('round_id', latestRound.id)

          if (ratings) {
            for (const r of ratings as any[]) {
              if (r.rating != null) {
                ratingsMap[r.player_id] = r.rating
              }
              const ratingPlayer = Array.isArray(r.players) ? r.players[0] : r.players
              const playerKey = normalizeRatingKey(ratingPlayer?.name, ratingPlayer?.team_name)
              if (playerKey && r.rating != null) ratingsByPlayerKey[playerKey] = r.rating
            }
          }
        }

        const teamWithRatings: PitchPlayer[] = (team || []).map((tp: any) => ({
          ...tp,
          rating:
            ratingsMap[tp.player_id] ??
            ratingsByPlayerKey[normalizeRatingKey(tp.players?.name, tp.players?.team_name)] ??
            null,
        }))

        setTeamPlayers(teamWithRatings)
      } catch (error) {
        console.error('[Times] Erro ao carregar time:', error)
      }
    }

    fetchTeam()
  }, [selectedMemberId, groupId])

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-6" style={{ background: '#0a0e0c' }}>
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-400 text-center">⏳ Carregando...</p>
        </div>
      </div>
    )
  }

  const selectedMember = members.find(m => m.id === selectedMemberId)

  return (
    <div className="min-h-screen text-white" style={{ background: '#0a0e0c' }}>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">

        {/* Header */}
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

        {/* Seletor de membros */}
        {members.length > 0 && (
          <div className="mb-6">
            <p className="text-xs mb-2" style={{ color: '#8b9690', fontFamily: 'Space Mono, monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Selecionar participante:
            </p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMemberId(m.id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition"
                  style={
                    m.id === selectedMemberId
                      ? { background: 'rgba(197,242,74,.2)', color: '#c5f24a', border: '1px solid rgba(197,242,74,.4)' }
                      : { background: 'rgba(255,255,255,.05)', color: '#8b9690', border: '1px solid rgba(255,255,255,.08)' }
                  }
                >
                  {m.id === selectedMemberId ? '● ' : ''}{m.display_name}
                  {m.status !== 'joined' && <span className="ml-1 text-xs opacity-60">(convidado)</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conteúdo principal */}
        {selectedMember && (
          <>
            {/* Info do membro selecionado */}
            <div className="mb-8 p-4 bg-gray-800/30 backdrop-blur rounded-lg border border-gray-700/50">
              <p className="text-gray-300 text-sm">
                👤 Time de <span style={{ color: '#c5f24a' }} className="font-semibold">{selectedMember.display_name}</span>
                {selectedMember.status !== 'joined' && (
                  <span className="ml-2 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                    ⏳ ainda não entrou
                  </span>
                )}
              </p>
            </div>

            {/* Time sem draft */}
            {teamPlayers.length === 0 ? (
              <div
                className="rounded-xl p-12 text-center"
                style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}
              >
                <p className="text-4xl mb-4">🏟️</p>
                <p className="text-gray-400 text-lg font-medium mb-2">{selectedMember.display_name} ainda não tem time</p>
                <p className="text-gray-500 text-sm">Nenhum jogador foi atribuído no draft.</p>
              </div>
            ) : (
              <>
                {/* Grid principal */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2">
                    <PitchView
                      team={teamPlayers}
                      memberTeamName={`Time de ${selectedMember.display_name}`}
                      lateralSideMode="normal"
                    />
                  </div>
                  <div className="lg:col-span-1">
                    {groupId && currentMemberId && (
                      <ParticipantStandings
                        groupId={groupId}
                        members={members as any}
                        currentMemberId={currentMemberId}
                      />
                    )}
                  </div>
                </div>

                {/* Detalhes de Rodadas */}
                {groupId && currentMemberId && (
                  <div className="mt-6">
                    <RoundDetails groupId={groupId} currentMemberId={currentMemberId} />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
