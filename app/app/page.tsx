// app/app/page.tsx
// Central do Participante: Tudo em um lugar (campinho, escalação, ranking, substituições, pontuação)

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
import { FirstEntryWrapper } from './first-entry-wrapper'

const ROUND_ORDER = [
  'Fase de Grupos - Rodada 1',
  'Fase de Grupos - Rodada 2',
  'Fase de Grupos - Rodada 3',
  '16 Avos de Final',
  'Oitavas de Final',
  'Quartas de Final',
  'Semifinal',
  'Final',
]

function getRoundOrder(name: string) {
  const index = ROUND_ORDER.indexOf(name)
  return index === -1 ? ROUND_ORDER.length : index
}

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
    .select('id, name, status, season, admin_id, max_subs_por_rodada, min_minutos')
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

  // Buscar rodadas (scored e open)
  // Prioridade: Rodada aberta > Rodada scored mais recente
  let { data: allRounds, error: allRoundsError } = await admin
    .from('rounds')
    .select('id, name, status, starts_at, finalized_at, created_at')
    .eq('group_id', group.id)
    .in('status', ['scored', 'open'])
    .order('created_at', { ascending: false })
    .limit(10) // Pega últimas 10 para ter contexto

  // Encontrar: primeira rodada aberta, primeira scored, e última com ratings
  if (allRoundsError) {
    const fallback = await admin
      .from('rounds')
      .select('id, name, status, starts_at, created_at')
      .eq('group_id', group.id)
      .in('status', ['scored', 'open'])
      .order('created_at', { ascending: false })
      .limit(10)

    allRounds = (fallback.data ?? []).map((round: any) => ({ ...round, finalized_at: null }))
  }

  const roundsByTournamentOrder = [...(allRounds ?? [])].sort((a, b) => {
    const startsA = a.starts_at ? new Date(a.starts_at).getTime() : Number.POSITIVE_INFINITY
    const startsB = b.starts_at ? new Date(b.starts_at).getTime() : Number.POSITIVE_INFINITY
    if (startsA !== startsB) return startsA - startsB
    return getRoundOrder(a.name) - getRoundOrder(b.name)
  })
  const displayRound =
    roundsByTournamentOrder.find((r) => r.status === 'open') ??
    [...roundsByTournamentOrder].reverse().find((r) => r.status === 'scored') ??
    roundsByTournamentOrder[0] ??
    null
  const scoredRound = [...roundsByTournamentOrder].reverse().find((r) => r.status === 'scored') ?? null
  
  // Para ratings: usar rodada scored mais recente (ou aberta se tiver dados)
  const ratingsSourceRound = scoredRound ?? displayRound

  const normalizeRatingKey = (name?: string | null, teamName?: string | null) =>
    `${name ?? ''}|${teamName ?? ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  // Buscar dados de trocas pós-rodada (rodada scored mais recente)
  const postRoundData = await getPostRoundData(groupMemberId)

  // Aplicar trocas pós-rodada: se há trocas confirmadas, aplicá-las ao time exibido
  let teamPlayersWithSubs = teamPlayers || []
  if (postRoundData.success && postRoundData.confirmedSwaps && postRoundData.confirmedSwaps.length > 0) {
    // Criar mapa de trocas: out_player_id -> in_player_id
    const postSwapsMap = new Map(postRoundData.confirmedSwaps.map(s => [s.out_player_id, s.in_player_id]))
    
    // Verificar se há mudanças
    const hasPostSwapChanges = teamPlayers?.some(tp => 
      tp.slot === 'starter' && postSwapsMap.has(tp.player_id)
    )

    // Se há mudanças, aplicar as trocas
    if (hasPostSwapChanges) {
      teamPlayersWithSubs = teamPlayers!.map((tp: any) => {
        const replacement = postSwapsMap.get(tp.player_id)
        if (replacement && tp.slot === 'starter') {
          // Encontrar os dados do jogador substituto
          const subPlayer = postRoundData.players?.find((p: any) => p.player_id === replacement)
          if (subPlayer) {
            // Retornar com os dados do jogador que entrou
            return {
              ...tp,
              player_id: replacement,
              players: {
                id: subPlayer.id,
                name: subPlayer.name,
                team_name: subPlayer.team_name,
                position: tp.players?.position,
                photo_url: subPlayer.photo_url,
                number: tp.players?.number,
              },
            }
          }
        }
        return tp
      })
    }
  }

  // Buscar ratings de todos os jogadores
  // Usando rodada com dados + fallback para scored ou aberta
  let ratingsMap: Record<number, { rating: number | null; minutes: number | null }> = {}
  let ratingsByPlayerKey: Record<string, { rating: number | null; minutes: number | null }> = {}
  
  if (ratingsSourceRound && teamPlayersWithSubs && teamPlayersWithSubs.length > 0) {
    const { data: ratings } = await admin
      .from('player_round_ratings')
      .select('player_id, rating, minutes, players ( name, team_name )')
      .eq('round_id', ratingsSourceRound.id)

    if (ratings) {
      for (const r of ratings as any[]) {
        if (r.rating != null) {
          ratingsMap[r.player_id] = { rating: r.rating, minutes: r.minutes }
        }
        const ratingPlayer = Array.isArray(r.players) ? r.players[0] : r.players
        const playerKey = normalizeRatingKey(ratingPlayer?.name, ratingPlayer?.team_name)
        if (playerKey && r.rating != null) ratingsByPlayerKey[playerKey] = { rating: r.rating, minutes: r.minutes }
      }
    }
  }

  // Montar team com ratings
  const teamWithRatings: PitchPlayer[] = (teamPlayersWithSubs || []).map((tp: any) => {
    const ratingData =
      ratingsMap[tp.player_id] ??
      ratingsByPlayerKey[normalizeRatingKey(tp.players?.name, tp.players?.team_name)] ??
      null
    return {
      ...tp,
      rating: ratingData?.rating ?? null,
      minutes: ratingData?.minutes ?? null,
    }
  })

  // Buscar membros do grupo para ranking
  const { data: members } = await admin
    .from('group_members')
    .select('id, display_name, profile_id, status')
    .eq('group_id', group.id)

  const membersWithInvertedFullbacks = new Set(['lucas', 'danyel', 'gombas', 'joao', 'pedro'])
  const normalizedMemberName = membership.display_name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  const lateralSideMode = membersWithInvertedFullbacks.has(normalizedMemberName) ? 'inverted' : 'normal'

  return (
    <FirstEntryWrapper
      memberId={groupMemberId}
      currentDisplayName={membership.display_name}
      currentTeamName={membership.team_name}
    >
      <div className="min-h-screen text-white" style={{ background: '#0a0e0c' }}>
        <div className="w-full max-w-[1440px] mx-auto px-3 py-3 sm:px-5 sm:py-4 xl:px-8">

        {/* Header com 2 linhas */}
        <div className="mb-4">
          {/* Linha 1: Back link | User info + Edit | Logout */}
          <div className="flex justify-between items-center mb-4">
            <Link href="/" className="text-lime-400 hover:text-lime-300 text-sm">
              ← Dezcalação
            </Link>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-gray-300 text-base">
                  👋 <span className="text-lime-400 font-semibold">{membership.display_name}</span>
                </p>
                {membership.team_name && (
                  <p className="text-gray-400 text-sm mt-0.5">
                    🏆 <span className="text-lime-300">{membership.team_name}</span>
                  </p>
                )}
              </div>
              <ProfileEditButton
                memberId={groupMemberId}
                currentDisplayName={membership.display_name}
                currentTeamName={membership.team_name}
              />
              {isAdmin && <ModeSwitcher isAdmin={isAdmin} />}
              <LogoutButton />
            </div>
          </div>

          {/* Linha 2: Título + Info | Botões centralizados */}
          <div className="flex justify-between items-start">
            <div>
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
                {displayRound && (
                  <span className="flex items-center gap-2">
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-400">
                      <span className="text-lime-300 font-medium">{displayRound.name}</span>
                      {displayRound.status === 'open' && <span className="text-lime-500 ml-1 font-medium">(aberta)</span>}
                      {displayRound.status === 'scored' && <span className="text-yellow-500 ml-1 font-medium">(pontuada)</span>}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Botões centralizados */}
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/app/notas"
                className="text-base font-bold px-6 py-3 rounded-full bg-white/5 text-gray-100 border border-white/10 hover:border-lime-400/50 hover:text-lime-300 transition whitespace-nowrap"
              >
                📋 Notas de cada partida
              </Link>
              <Link
                href="/app/selecao"
                className="text-base font-bold px-6 py-3 rounded-full bg-lime-400/15 text-lime-300 border border-lime-400/40 hover:bg-lime-400/25 transition whitespace-nowrap"
              >
                👑 Seleção da semana
              </Link>
              <Link
                href="/app/times"
                className="text-base font-bold px-6 py-3 rounded-full bg-white/5 text-gray-100 border border-white/10 hover:border-lime-400/50 hover:text-lime-300 transition whitespace-nowrap"
              >
                👥 Times dos participantes
              </Link>
            </div>
          </div>
        </div>

        {/* Grid principal — todos com mesma altura, alinhados na base */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(500px,560px)_1fr] gap-4 mb-4 items-stretch">

          {/* Campinho + Banco */}
          <div className="w-full h-full">
            <PitchView team={teamWithRatings} memberTeamName={membership.team_name} lateralSideMode={lateralSideMode} />
          </div>

          {/* Ranking + Rodadas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full h-full">
            <div>
              <ParticipantStandings
                groupId={group.id}
                members={members || []}
                currentMemberId={groupMemberId}
              />
            </div>
            <div>
              <RoundDetails groupId={group.id} currentMemberId={groupMemberId} />
            </div>
          </div>
        </div>

        {/* Escalação & Substituições (Rodada Aberta) */}
        {/* Trocas Pós-Rodada */}
        {postRoundData.success && postRoundData.round && (
          <div id="trocas-pos-rodada" className="mb-4 scroll-mt-6">
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
    </FirstEntryWrapper>
  )
}
