// app/app/notas/page.tsx
// Notas da Rodada (visão do participante): um card por jogo (acordeão), com os
// jogadores separados por seleção e ordenados pela nota. Read-only, para todos.

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RoundGames, type GameBlock, type RatedPlayer } from './round-games'

export const dynamic = 'force-dynamic'

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default async function NotasDaRodadaPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>
}) {
  const params = await searchParams
  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = supabaseAdmin()

  // Descobrir o grupo (participante ou admin)
  const { data: memberships } = await admin
    .from('group_members')
    .select('group_id')
    .eq('profile_id', user.id)
    .eq('status', 'joined')
    .limit(1)

  let groupId = memberships?.[0]?.group_id ?? null
  if (!groupId) {
    const { data: owned } = await admin
      .from('groups')
      .select('id')
      .eq('admin_id', user.id)
      .limit(1)
    groupId = owned?.[0]?.id ?? null
  }

  if (!groupId) {
    return (
      <Shell>
        <Empty title="Você não está em um grupo ainda" subtitle="Aguarde um convite do admin." />
      </Shell>
    )
  }

  const { data: rounds } = await admin
    .from('rounds')
    .select('id, name, status, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })

  const roundList = rounds ?? []
  if (roundList.length === 0) {
    return (
      <Shell>
        <Empty title="Nenhuma rodada criada ainda" subtitle="O admin cria as rodadas em /admin/rodadas." />
      </Shell>
    )
  }

  // Rodada atual automática: a mais recente que JÁ tem notas; se nenhuma tiver,
  // a que está aberta; senão a última criada. (Evita ter que clicar.)
  const roundIds = roundList.map((r) => r.id)
  const { data: ratedRows } = await admin
    .from('player_round_ratings')
    .select('round_id')
    .in('round_id', roundIds)
  const ratedSet = new Set((ratedRows ?? []).map((r) => r.round_id))

  const lastRated = [...roundList].reverse().find((r) => ratedSet.has(r.id))
  const openRound = [...roundList].reverse().find((r) => r.status === 'open')
  const defaultRound = lastRated ?? openRound ?? roundList[roundList.length - 1]

  const selectedRoundId =
    params.round && roundList.some((r) => r.id === params.round)
      ? params.round
      : defaultRound.id
  const selectedRound = roundList.find((r) => r.id === selectedRoundId)!

  // Jogos da rodada
  const { data: fixtures } = await admin
    .from('fixtures')
    .select('id, home_team, away_team, label, home_goals, away_goals')
    .eq('round_id', selectedRoundId)
    .order('id', { ascending: true })
  const fixtureList = fixtures ?? []

  // Notas + jogadores (duas queries, junta em memória)
  const { data: ratings } = await admin
    .from('player_round_ratings')
    .select('player_id, fixture_id, rating, minutes')
    .eq('round_id', selectedRoundId)
  const ratingRows = (ratings ?? []).filter((r) => r.rating != null)

  const ratedByFixture = new Map<number | string, RatedPlayer[]>()
  if (ratingRows.length > 0) {
    const playerIds = Array.from(new Set(ratingRows.map((r) => r.player_id)))
    const { data: players } = await admin
      .from('players')
      .select('api_player_id, name, team_name, position')
      .in('api_player_id', playerIds)
    const pMap = new Map((players ?? []).map((p) => [p.api_player_id, p]))

    for (const r of ratingRows) {
      const p = pMap.get(r.player_id)
      if (!p) continue
      const key = r.fixture_id ?? 'sem-jogo'
      if (!ratedByFixture.has(key)) ratedByFixture.set(key, [])
      ratedByFixture.get(key)!.push({
        player_id: r.player_id as number,
        name: p.name as string,
        team_name: (p.team_name as string) ?? '—',
        position: (p.position as string) ?? '',
        rating: r.rating as number,
        minutes: (r.minutes as number) ?? 0,
      })
    }
  }

  // Montar os blocos de jogo, separando por seleção (agrupa pelo team_name do
  // jogador — sempre correto, mesmo que o título do jogo esteja em outro idioma)
  const games: GameBlock[] = []

  function buildTeams(players: RatedPlayer[], homeHint?: string, awayHint?: string) {
    const byTeam = new Map<string, RatedPlayer[]>()
    for (const p of players) {
      if (!byTeam.has(p.team_name)) byTeam.set(p.team_name, [])
      byTeam.get(p.team_name)!.push(p)
    }
    let teams = Array.from(byTeam.entries()).map(([team_name, ps]) => ({
      team_name,
      players: ps.sort((a, b) => b.rating - a.rating || b.minutes - a.minutes),
    }))
    // Ordenar tentando colocar o mandante primeiro (match aproximado)
    if (homeHint) {
      const h = normalize(homeHint)
      teams = teams.sort((a, b) => {
        const am = normalize(a.team_name).includes(h) || h.includes(normalize(a.team_name)) ? 0 : 1
        const bm = normalize(b.team_name).includes(h) || h.includes(normalize(b.team_name)) ? 0 : 1
        return am - bm
      })
    }
    return teams
  }

  for (const fx of fixtureList) {
    const players = ratedByFixture.get(fx.id) || []
    // Sempre mostrar o jogo, mesmo sem notas (pode ser adicionadas depois)
    const hasScore = fx.home_goals != null && fx.away_goals != null
    games.push({
      id: fx.id,
      title: fx.label || `${fx.home_team} x ${fx.away_team}`,
      score: hasScore ? `${fx.home_goals} x ${fx.away_goals}` : null,
      homeTeam: (fx.home_team as string) ?? '',
      awayTeam: (fx.away_team as string) ?? '',
      homeGoals: fx.home_goals as number | null,
      awayGoals: fx.away_goals as number | null,
      teams: buildTeams(players, fx.home_team as string, fx.away_team as string),
      total: players.length,
      hasRatings: players.length > 0,
      fixtureId: fx.id,
    })
  }

  // Notas avulsas (sem jogo vinculado)
  const avulsas = ratedByFixture.get('sem-jogo')
  if (avulsas && avulsas.length > 0) {
    games.push({
      id: 'sem-jogo',
      title: 'Outras notas',
      score: null,
      homeTeam: null,
      awayTeam: null,
      homeGoals: null,
      awayGoals: null,
      teams: buildTeams(avulsas),
      total: avulsas.length,
    })
  }

  return (
    <Shell>
      <div className="max-w-md mx-auto w-full">
        {/* Voltar no topo */}
        <div className="mb-3">
          <Link href="/app" className="text-gray-400 text-sm font-semibold hover:text-lime-400 transition">
            ← Voltar
          </Link>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ fontFamily: 'Anton, sans-serif' }}>
            <span style={{ color: '#c5f24a' }}>Notas</span>
            <span className="text-white"> da Rodada</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Jogos de <strong className="text-white">{selectedRound.name}</strong>
          </p>
        </div>

        {/* Seletor de rodada */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
          {roundList.map((r) => {
            const active = r.id === selectedRoundId
            return (
              <Link
                key={r.id}
                href={`/app/notas?round=${r.id}`}
                className={`whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                  active
                    ? 'bg-lime-400 text-gray-900 border-lime-400'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:border-lime-400/40'
                }`}
              >
                {r.name}
              </Link>
            )
          })}
        </div>

        {/* Link para a Seleção da Rodada */}
        <Link
          href={`/app/selecao?round=${selectedRoundId}`}
          className="block text-center text-sm font-semibold text-lime-300 bg-lime-400/10 border border-lime-400/30 rounded-xl py-2 mb-4 hover:bg-lime-400/20 transition"
        >
          👑 Ver a Seleção da Rodada (11 melhores)
        </Link>

        {games.length === 0 ? (
          <Empty title="Sem notas nesta rodada ainda" subtitle="Quando o admin lançar as notas, os jogos aparecem aqui." />
        ) : (
          <RoundGames games={games} />
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-6" style={{ background: '#0a0e0c' }}>
      {children}
    </div>
  )
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <h1 className="text-xl font-bold text-lime-400 mb-2">{title}</h1>
      <p className="text-gray-400">{subtitle}</p>
      <div className="mt-6">
        <Link href="/app" className="text-lime-400 text-sm font-semibold hover:underline">
          ← Voltar
        </Link>
      </div>
    </div>
  )
}
