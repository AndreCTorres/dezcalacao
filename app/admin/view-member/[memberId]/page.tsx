// app/admin/view-member/[memberId]/page.tsx
// Permite ao admin ver a visão do participante sem precisar logar como ele.
// Só acessível se o usuário logado for admin do grupo.

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { PitchView, type PitchPlayer } from '@/app/app/pitch-view'
import { ParticipantStandings } from '@/app/app/participant-standings'
import { RoundDetails } from '@/app/app/round-details'
import { RoundCampinhos } from '@/app/app/round-campinhos'

export default async function ViewMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const supabase = await createActionClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = supabaseAdmin()
  const { memberId } = await params

  // Buscar o membro alvo
  const { data: targetMember } = await admin
    .from('group_members')
    .select(`
      id,
      group_id,
      display_name,
      role,
      status,
      profile_id,
      groups (
        id,
        name,
        status,
        season,
        admin_id
      )
    `)
    .eq('id', memberId)
    .single()

  if (!targetMember || !targetMember.groups) {
    notFound()
  }

  const group = targetMember.groups as any

  // SEGURANÇA: só o admin do grupo pode ver
  if (group.admin_id !== user.id) {
    redirect('/admin')
  }

  const groupMemberId = targetMember.id
  const membersWithInvertedFullbacks = new Set(['lucas', 'danyel', 'gombas', 'joao', 'pedro'])
  const normalizedMemberName = targetMember.display_name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  const lateralSideMode = membersWithInvertedFullbacks.has(normalizedMemberName) ? 'inverted' : 'normal'

  // Buscar time do membro alvo
  const { data: teamPlayers } = await admin
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
    .eq('group_member_id', groupMemberId)
    .order('slot', { ascending: false })

  // Rodada mais recente
  const { data: latestRound } = await admin
    .from('rounds')
    .select('id, name, status')
    .eq('group_id', group.id)
    .in('status', ['scored', 'open'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Ratings da rodada mais recente
  const normalizeRatingKey = (name?: string | null, teamName?: string | null) =>
    `${name ?? ''}|${teamName ?? ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  let ratingsMap: Record<number, number | null> = {}
  let ratingsByPlayerKey: Record<string, number | null> = {}
  if (latestRound && teamPlayers) {
    const { data: ratings } = await admin
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

  const teamWithRatings: PitchPlayer[] = (teamPlayers || []).map((tp: any) => ({
    ...tp,
    rating:
      ratingsMap[tp.player_id] ??
      ratingsByPlayerKey[normalizeRatingKey(tp.players?.name, tp.players?.team_name)] ??
      null,
  }))

  // Membros do grupo para o ranking
  const { data: members } = await admin
    .from('group_members')
    .select('id, display_name, profile_id, status')
    .eq('group_id', group.id)

  // Buscar todos os membros para navegação rápida
  const { data: allMembers } = await admin
    .from('group_members')
    .select('id, display_name, status')
    .eq('group_id', group.id)
    .order('display_name', { ascending: true })

  return (
    <div className="min-h-screen text-white" style={{ background: '#0a0e0c' }}>
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">

        {/* Banner de impersonação — destaque visual claro */}
        <div
          className="mb-6 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4"
          style={{
            background: 'rgba(246,201,69,.1)',
            border: '2px solid rgba(246,201,69,.4)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">👁️</span>
            <div>
              <p className="font-bold" style={{ color: '#f6c945' }}>
                Modo Visualização — você está vendo como <span className="underline">{targetMember.display_name}</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#b08b30' }}>
                Apenas leitura. Nenhuma ação aqui afeta o jogo desse participante.
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg font-semibold text-sm transition"
            style={{ background: '#f6c945', color: '#0a0e0c' }}
          >
            ← Voltar ao Admin
          </Link>
        </div>

        {/* Navegação rápida entre membros */}
        {allMembers && allMembers.length > 1 && (
          <div className="mb-6">
            <p className="text-xs mb-2" style={{ color: '#8b9690', fontFamily: 'Space Mono, monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Ver outro participante:
            </p>
            <div className="flex flex-wrap gap-2">
              {allMembers.map((m) => (
                <Link
                  key={m.id}
                  href={`/admin/view-member/${m.id}`}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition"
                  style={
                    m.id === memberId
                      ? { background: 'rgba(197,242,74,.2)', color: '#c5f24a', border: '1px solid rgba(197,242,74,.4)' }
                      : { background: 'rgba(255,255,255,.05)', color: '#8b9690', border: '1px solid rgba(255,255,255,.08)' }
                  }
                >
                  {m.id === memberId ? '● ' : ''}{m.display_name}
                  {m.status !== 'joined' && <span className="ml-1 text-xs opacity-60">(convidado)</span>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Header do participante */}
        <div className="flex justify-between items-start mb-8 gap-4">
          <div className="flex-1">
            <h1
              className="text-3xl sm:text-4xl font-black tracking-tight mb-2"
              style={{ fontFamily: 'Anton, sans-serif', textTransform: 'uppercase', color: '#c5f24a' }}
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
        </div>

        {/* Bem-vindo (simulado) */}
        <div className="mb-8 p-4 bg-gray-800/30 backdrop-blur rounded-lg border border-gray-700/50">
          <p className="text-gray-300 text-sm">
            👤 Visualizando time de <span style={{ color: '#c5f24a' }} className="font-semibold">{targetMember.display_name}</span>
            {targetMember.status !== 'joined' && (
              <span className="ml-2 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                ⏳ ainda não entrou
              </span>
            )}
          </p>
        </div>

        {/* Time sem draft */}
        {(!teamWithRatings || teamWithRatings.length === 0) ? (
          <div
            className="rounded-xl p-12 text-center mb-6"
            style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}
          >
            <p className="text-4xl mb-4">🏟️</p>
            <p className="text-gray-400 text-lg font-medium mb-2">{targetMember.display_name} ainda não tem time</p>
            <p className="text-gray-500 text-sm">Nenhum jogador foi atribuído no draft.</p>
            <Link
              href="/admin/draft"
              className="inline-block mt-6 px-5 py-2 rounded-lg text-sm font-semibold transition"
              style={{ background: '#c5f24a', color: '#0a0e0c' }}
            >
              Ir para o Draft
            </Link>
          </div>
        ) : (
          <>
            {/* Grid principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <PitchView
                  team={teamWithRatings}
                  memberTeamName={`Time de ${targetMember.display_name}`}
                  lateralSideMode={lateralSideMode}
                />
              </div>
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
              <RoundDetails groupId={group.id} currentMemberId={groupMemberId} />
            </div>

            {/* Campinhos com notas */}
            <div className="mt-6">
              <RoundCampinhos groupId={group.id} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
