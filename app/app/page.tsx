// app/app/page.tsx
// Home do participante: campinho com time, pontuação por jogador, ranking

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/app/components/logout-button'
import { ModeSwitcher } from '@/app/components/mode-switcher'
import { ProfileEditButton } from './profile-edit-button'
import { PitchView, type PitchPlayer } from './pitch-view'
import { ParticipantStandings } from './participant-standings'
import { RoundDetails } from './round-details'
import { PostRoundSwaps } from './post-round-swaps'
import { getPostRoundData } from './post-round-actions'

export default async function AppPage() {
  const supabase = await createActionClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = supabaseAdmin()

  // Garantir que o profile existe (pode não ter sido criado pelo trigger)
  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Participante'
  await admin.from('profiles').upsert({ id: user.id, display_name: displayName }, { onConflict: 'id' })

  // Buscar membership do participante (sem join para evitar problemas de cache de schema)
  const { data: memberships, error: membershipError } = await admin
    .from('group_members')
    .select('id, group_id, display_name, team_name')
    .eq('profile_id', user.id)
    .eq('status', 'joined')
    .limit(1)

  if (membershipError) {
    console.error('[AppPage] Erro ao buscar membership:', membershipError?.message, membershipError?.code)
  }

  let membershipRow = memberships?.[0] ?? null

  // Tentativa de auto-vinculação: se não encontrou por profile_id,
  // verifica se existe um convite pendente com o e-mail do usuário
  if (!membershipRow && user.email) {
    console.log('[AppPage] Tentando auto-vincular por e-mail:', user.email)

    const { data: invitedMemberships } = await admin
      .from('group_members')
      .select('id, group_id, display_name, team_name')
      .eq('invite_email', user.email)
      .is('profile_id', null)
      .limit(1)

    const invitedMembership = invitedMemberships?.[0] ?? null

    if (invitedMembership) {
      console.log('[AppPage] Convite encontrado para', user.email, '— vinculando profile_id...')

      // Vincular profile_id e atualizar status para joined
      const { error: updateError } = await admin
        .from('group_members')
        .update({
          profile_id: user.id,
          status: 'joined',
          joined_at: new Date().toISOString(),
        })
        .eq('id', invitedMembership.id)

      if (!updateError) {
        console.log('[AppPage] ✓ Membro vinculado com sucesso')
        membershipRow = invitedMembership
      } else {
        console.error('[AppPage] Erro ao vincular membro:', updateError?.message)
      }
    }
  }

  if (!membershipRow) {
    console.log('[AppPage] Membership não encontrado para user:', user.id)
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

  // Buscar grupo separadamente (evita problema de join/schema cache)
  const { data: group, error: groupError } = await admin
    .from('groups')
    .select('id, name, status, season, admin_id')
    .eq('id', membershipRow.group_id)
    .single()

  if (groupError || !group) {
    console.error('[AppPage] Erro ao buscar grupo:', groupError?.message)
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-lime-400 mb-2">Erro ao carregar grupo</h1>
          <p className="text-gray-400 mb-4">Tente novamente mais tarde</p>
          <LogoutButton />
        </div>
      </div>
    )
  }

  const membership = membershipRow
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

  const { data: latestScoredRound } = await admin
    .from('rounds')
    .select('id, name, status')
    .eq('group_id', group.id)
    .eq('status', 'scored')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Prioridade: rodada pontuada > qualquer rodada com ratings no banco
  // Busca todas as rodadas e encontra a mais recente com ratings reais
  let ratingsRound = latestScoredRound ?? null

  if (!ratingsRound && teamPlayers && teamPlayers.length > 0) {
    // Não há rodada scored — procurar rodada open que já tenha ratings inseridos
    const { data: allRounds } = await admin
      .from('rounds')
      .select('id, name, status')
      .eq('group_id', group.id)
      .in('status', ['scored', 'open'])
      .order('created_at', { ascending: false })

    if (allRounds) {
      const teamPlayerIds = teamPlayers.map((tp: any) => tp.player_id)
      for (const round of allRounds) {
        const { count } = await admin
          .from('player_round_ratings')
          .select('id', { count: 'exact', head: true })
          .eq('round_id', round.id)
          .in('player_id', teamPlayerIds)
          .not('rating', 'is', null)
        if ((count ?? 0) > 0) {
          ratingsRound = round
          break
        }
      }
    }
  }

  const normalizeRatingKey = (name?: string | null, teamName?: string | null) =>
    `${name ?? ''}|${teamName ?? ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  // Buscar ratings da rodada pontuada mais recente
  // Filtra pelos player_ids do time para garantir que reservas com nota apareçam
  let ratingsMap: Record<number, number | null> = {}
  let ratingsByPlayerKey: Record<string, number | null> = {}
  if (ratingsRound && teamPlayers && teamPlayers.length > 0) {
    const teamPlayerIds = teamPlayers.map((tp: any) => tp.player_id)

    const { data: ratings } = await admin
      .from('player_round_ratings')
      .select('player_id, rating, players ( name, team_name )')
      .eq('round_id', ratingsRound.id)
      .in('player_id', teamPlayerIds)

    if (ratings) {
      for (const r of ratings as any[]) {
        // Inclui todos, mesmo rating null (para saber que o registro existe)
        // mas só coloca no map se tiver nota real
        if (r.rating != null) {
          ratingsMap[r.player_id] = r.rating
        }
        const ratingPlayer = Array.isArray(r.players) ? r.players[0] : r.players
        const playerKey = normalizeRatingKey(ratingPlayer?.name, ratingPlayer?.team_name)
        if (playerKey && r.rating != null) ratingsByPlayerKey[playerKey] = r.rating
      }
    }
  }

  // Montar team com ratings
  const teamWithRatings: PitchPlayer[] = (teamPlayers || []).map((tp: any) => ({
    ...tp,
    rating:
      ratingsMap[tp.player_id] ??
      ratingsByPlayerKey[normalizeRatingKey(tp.players?.name, tp.players?.team_name)] ??
      null,
  }))

  // Buscar membros do grupo para ranking
  const { data: members } = await admin
    .from('group_members')
    .select('id, display_name, profile_id, status')
    .eq('group_id', group.id)

  // Buscar dados de trocas pós-rodada (rodada scored mais recente)
  const postRoundData = await getPostRoundData(groupMemberId)

  return (
    <div className="min-h-screen text-white" style={{ background: '#0a0e0c' }}>
      <div className="w-full max-w-[1440px] mx-auto px-3 py-3 sm:px-5 sm:py-4 xl:px-8">

        {/* Header */}
        <div className="flex justify-between items-start mb-5 gap-4">
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
        <div className="mb-5 p-3 bg-gray-800/30 backdrop-blur rounded-lg border border-gray-700/50 flex justify-between items-center">
          <div>
            <p className="text-gray-300 text-sm">
              👋 Bem-vindo, <span className="text-lime-400 font-semibold">{membership.display_name}</span>
            </p>
            {membership.team_name && (
              <p className="text-gray-400 text-xs mt-1">
                🏆 Seu time: <span className="text-lime-300">{membership.team_name}</span>
              </p>
            )}
          </div>
          <ProfileEditButton
            memberId={groupMemberId}
            currentDisplayName={membership.display_name}
            currentTeamName={membership.team_name}
          />
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(440px,500px)_1fr] gap-5 mb-5 items-stretch max-h-[650px] overflow-hidden">

          {/* Campinho + Banco */}
          <div className="w-full h-full">
            <PitchView team={teamWithRatings} memberTeamName={membership.team_name} />
          </div>

          {/* Ranking + Rodadas — ocupam todo o espaço restante */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-full items-stretch overflow-hidden">
            <ParticipantStandings
              groupId={group.id}
              members={members || []}
              currentMemberId={groupMemberId}
            />
            <RoundDetails groupId={group.id} currentMemberId={groupMemberId} />
          </div>
        </div>

        {/* Trocas Pós-Rodada */}
        {postRoundData.success && postRoundData.round && (
          <div className="mb-4">
            <PostRoundSwaps
              groupMemberId={groupMemberId}
              roundId={postRoundData.round.id}
              roundName={postRoundData.round.name}
              players={postRoundData.players!}
              confirmedSwaps={postRoundData.confirmedSwaps!}
              maxSwaps={postRoundData.maxSwaps!}
            />
          </div>
        )}

      </div>
    </div>
  )
}
