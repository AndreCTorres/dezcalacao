// app/app/page.tsx
// Home do participante: campinho com time, pontuação por jogador, ranking

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/app/components/logout-button'
import { ModeSwitcher } from '@/app/components/mode-switcher'
import { PitchView, type PitchPlayer } from './pitch-view'
import { ParticipantStandings } from './participant-standings'
import { RoundDetails } from './round-details'

export default async function AppPage() {
  const supabase = createActionClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = supabaseAdmin()

  // Buscar grupo do participante
  const { data: membership } = await admin
    .from('group_members')
    .select(
      `
      id,
      group_id,
      display_name,
      groups (
        id,
        name,
        status,
        season,
        admin_id
      )
    `
    )
    .eq('profile_id', user.id)
    .eq('status', 'joined')
    .single()

  if (!membership || !membership.groups) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-lime-400 mb-2">Você não está em um grupo ainda</h1>
          <p className="text-gray-400 mb-4">Aguarde um convite do admin</p>
          <LogoutButton />
        </div>
      </div>
    )
  }

  const group = membership.groups as any
  const groupMemberId = membership.id
  const isAdmin = group.admin_id === user.id

  // Buscar time do participante
  const { data: teamPlayers } = await admin
    .from('team_players')
    .select(
      `
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
    `
    )
    .eq('group_member_id', groupMemberId)
    .order('slot', { ascending: false })

  // Buscar rodada mais recente (scored ou open) para puxar ratings
  const { data: latestRound } = await admin
    .from('rounds')
    .select('id, name, status')
    .eq('group_id', group.id)
    .in('status', ['scored', 'open'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Buscar ratings da rodada mais recente
  let ratingsMap: Record<number, number | null> = {}
  if (latestRound && teamPlayers) {
    const playerIds = teamPlayers.map((tp: any) => tp.player_id)
    const { data: ratings } = await admin
      .from('player_round_ratings')
      .select('player_id, rating')
      .eq('round_id', latestRound.id)
      .in('player_id', playerIds)

    if (ratings) {
      for (const r of ratings) {
        ratingsMap[r.player_id] = r.rating
      }
    }
  }

  // Montar team com ratings
  const teamWithRatings: PitchPlayer[] = (teamPlayers || []).map((tp: any) => ({
    ...tp,
    rating: ratingsMap[tp.player_id] ?? null,
  }))

  // Buscar membros do grupo para ranking
  const { data: members } = await admin
    .from('group_members')
    .select('id, display_name, profile_id, status')
    .eq('group_id', group.id)

  return (
    <div className="min-h-screen text-white" style={{ background: '#0a0e0c' }}>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">

        {/* Header */}
        <div className="flex justify-between items-start mb-8 gap-4">
          <div className="flex-1">
            <Link href="/" className="text-lime-400 hover:text-lime-300 text-sm mb-3 inline-block">
              ← Dezcalação
            </Link>
            <h1
              className="text-3xl sm:text-4xl font-black text-lime-400 tracking-tight mb-3"
              style={{ fontFamily: 'Anton, sans-serif', textTransform: 'uppercase' }}
            >
              {group.name}
            </h1>
            <div className="flex flex-wrap gap-3 items-center text-sm">
              <span className="text-gray-400">
                Temporada <span className="text-white font-semibold">{group.season}</span>
              </span>
              <span className="text-gray-600">•</span>
              <span className={group.status === 'active' ? 'text-lime-400 font-medium' : 'text-gray-500'}>
                {group.status === 'active' ? '🟢 Ativo' :
                 group.status === 'drafting' ? '📋 Drafting' :
                 group.status === 'setup' ? '⚙️ Setup' : '🏁 Finalizado'}
              </span>
              {latestRound && (
                <span className="flex items-center gap-2">
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400">
                    {latestRound.name}
                    {latestRound.status === 'open' && <span className="text-lime-500 ml-1 font-medium">(aberta)</span>}
                    {latestRound.status === 'scored' && <span className="text-yellow-500 ml-1 font-medium">(pontuada)</span>}
                  </span>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 items-end">
            {isAdmin && <ModeSwitcher isAdmin={isAdmin} />}
            <LogoutButton />
          </div>
        </div>

        {/* Bem-vindo */}
        <div className="mb-8 p-4 bg-gray-800/30 backdrop-blur rounded-lg border border-gray-700/50">
          <p className="text-gray-300 text-sm">
            👋 Bem-vindo, <span className="text-lime-400 font-semibold">{membership.display_name}</span>
          </p>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Campinho — ocupa 2 colunas no desktop */}
          <div className="lg:col-span-2">
            <PitchView team={teamWithRatings} />
          </div>

          {/* Ranking */}
          <div className="lg:col-span-1">
            <ParticipantStandings
              groupId={group.id}
              members={members || []}
              currentMemberId={groupMemberId}
            />
          </div>
        </div>

        {/* Detalhes de Rodadas */}
        <div className="mt-6">
          <h2
            className="text-xl font-bold text-lime-400 mb-4"
            style={{ fontFamily: 'Anton, sans-serif', textTransform: 'uppercase', letterSpacing: '1px' }}
          >
            📊 Pontuação por Rodada
          </h2>
          <RoundDetails groupId={group.id} currentMemberId={groupMemberId} />
        </div>

      </div>
    </div>
  )
}
