// app/admin/rodadas/[roundId]/page.tsx
// PÃ¡gina de gerenciamento de notas de uma rodada â€” jogos clicÃ¡veis com modal

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/app/components/logout-button'
import { RoundRatingsManager } from './round-ratings-manager'
import { RoundFinalizationToggle } from './round-finalization-toggle'
import { RoundStatusActions } from './round-status-actions'
import { RatingsAuditViewer } from './ratings-audit-viewer'

interface PageProps {
  params: Promise<{ roundId: string }>
}

export default async function RoundRatingsPage({ params }: PageProps) {
  const { roundId } = await params

  const supabase = await createActionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = supabaseAdmin()

  let { data: round, error: roundError } = await admin
    .from('rounds')
    .select('id, name, status, finalized_at, group_id, groups!inner(id, name, admin_id)')
    .eq('id', roundId)
    .single()

  const hasFinalizationColumn = !roundError

  if (roundError) {
    const fallback = await admin
      .from('rounds')
      .select('id, name, status, group_id, groups!inner(id, name, admin_id)')
      .eq('id', roundId)
      .single()

    round = fallback.data ? { ...fallback.data, finalized_at: null } : null
  }

  if (!round) notFound()
  if ((round.groups as any).admin_id !== user.id) redirect('/admin')

  const groupId = round.group_id
  const groupName = (round.groups as any).name

  const normalizeFixtureTeam = (value: string | null) =>
    (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const fixturePairKey = (fixture: any) =>
    [normalizeFixtureTeam(fixture.home_team), normalizeFixtureTeam(fixture.away_team)]
      .sort()
      .join('|')

  // Fixtures desta rodada com contagem de ratings
  const { data: allFixtures } = await admin
    .from('fixtures')
    .select('id, home_team, away_team, label, status, home_goals, away_goals, kickoff, sort_order')
    .eq('round_id', roundId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })

  // Para cada fixture, contar quantos jogadores tÃªm nota
  const allFixtureIds = (allFixtures ?? []).map((f: any) => f.id)
  const { data: ratingCounts } = allFixtureIds.length > 0
    ? await admin
        .from('player_round_ratings')
        .select('fixture_id')
        .eq('round_id', roundId)
        .in('fixture_id', allFixtureIds)
        .not('rating', 'is', null)
    : { data: [] }

  const countByFixture: Record<number, number> = {}
  ratingCounts?.forEach((r: any) => {
    countByFixture[r.fixture_id] = (countByFixture[r.fixture_id] ?? 0) + 1
  })

  const fixturesByPair = new Map<string, any>()
  for (const fixture of allFixtures ?? []) {
    const key = fixturePairKey(fixture)
    const current = fixturesByPair.get(key)
    const currentCount = current ? countByFixture[current.id] ?? 0 : -1
    const fixtureCount = countByFixture[fixture.id] ?? 0
    const sortId = current?.sort_id ?? fixture.id

    if (!current || fixtureCount > currentCount) {
      fixturesByPair.set(key, { ...fixture, sort_id: sortId })
    } else {
      fixturesByPair.set(key, { ...current, sort_id: sortId })
    }
  }

  // Total de ratings desta rodada (incluindo sem fixture)
  const { count: totalRated } = await admin
    .from('player_round_ratings')
    .select('id', { count: 'exact', head: true })
    .eq('round_id', roundId)
    .not('rating', 'is', null)

  const fixturesWithCount = Array.from(fixturesByPair.values())
    .map((f: any) => ({
      ...f,
      ratedCount: countByFixture[f.id] ?? 0,
    }))
    .sort((a: any, b: any) => {
      // Prioridade: sort_order manual > kickoff > id
      const aSort = a.sort_order ?? null
      const bSort = b.sort_order ?? null
      if (aSort !== null && bSort !== null) return aSort - bSort
      if (aSort !== null) return -1
      if (bSort !== null) return 1
      if (a.kickoff && b.kickoff) {
        return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
      }
      return Number(a.sort_id ?? a.id) - Number(b.sort_id ?? b.id)
    })

  const { data: playerTeams } = await admin
    .from('players')
    .select('team_name')
    .order('team_name', { ascending: true })

  // Nomes exatamente como cadastrados em players.team_name (inglÃªs/oficial)
  // Estes sÃ£o os Ãºnicos valores vÃ¡lidos â€” o datalist guia o admin para nÃ£o digitar em portuguÃªs
  const WORLD_CUP_TEAM_OPTIONS = [
    'Algeria', 'Argentina', 'Australia', 'Austria', 'Belgium', 'Bosnia & Herzegovina',
    'Brazil', 'Canada', 'Cape Verde Islands', 'Colombia', 'Congo DR', 'Croatia',
    'CuraÃ§ao', 'Czech Republic', 'Ecuador', 'Egypt', 'England', 'France', 'Germany',
    'Ghana', 'Haiti', 'Iraq', 'Ivory Coast', 'Japan', 'Jordan', 'Mexico', 'Morocco',
    'Netherlands', 'New Zealand', 'Norway', 'Panama', 'Paraguay', 'Portugal',
    'Qatar', 'Saudi Arabia', 'Scotland', 'Senegal', 'South Africa', 'South Korea',
    'Spain', 'Sweden', 'Switzerland', 'Tunisia', 'TÃ¼rkiye', 'Uruguay', 'USA', 'Uzbekistan',
  ]

  const teamOptions = Array.from(
    new Set([
      ...WORLD_CUP_TEAM_OPTIONS,
      ...(playerTeams ?? []).map((p: any) => p.team_name).filter(Boolean),
      ...(allFixtures ?? []).flatMap((f: any) => [f.home_team, f.away_team]).filter(Boolean),
    ])
  ).sort((a, b) => a.localeCompare(b))

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <Link href="/admin/rodadas" className="text-lime-400 hover:text-lime-300 text-sm">
              â† Voltar para rodadas
            </Link>
            <LogoutButton />
          </div>
          <p className="text-gray-400 text-sm mb-1">{groupName}</p>
          <h1 className="text-3xl font-bold text-lime-400 mb-3" style={{ fontFamily: 'Anton, sans-serif' }}>
            {round.name.toUpperCase()}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              round.status === 'scored' ? 'bg-yellow-500/20 text-yellow-400' :
              round.status === 'open'   ? 'bg-lime-500/20 text-lime-400' :
                                         'bg-gray-500/20 text-gray-400'
            }`}>
              {round.status === 'scored' ? 'âœ… Pontuada' : round.status === 'open' ? 'ðŸŸ¢ Aberta' : 'ðŸ”’ Travada'}
            </span>
            {hasFinalizationColumn && (
              <RoundFinalizationToggle roundId={roundId} finalizedAt={(round as any).finalized_at ?? null} />
            )}
            <span className="text-xs text-gray-400">
              {totalRated ?? 0} jogadores com nota inserida
            </span>
            <span className="text-xs text-gray-400">
              {fixturesWithCount.length} {fixturesWithCount.length === 1 ? 'jogo' : 'jogos'} nesta rodada
            </span>
            <RoundStatusActions groupId={groupId} roundId={roundId} status={round.status} />
          </div>
        </div>

        {/* Manager â€” lista de jogos + modal */}
        <RoundRatingsManager
          groupId={groupId}
          roundId={roundId}
          roundName={round.name}
          roundStatus={round.status}
          fixtures={fixturesWithCount}
          teamOptions={teamOptions}
        />

        {/* Auditoria de ratings */}
        <div className="mt-8">
          <RatingsAuditViewer groupId={groupId} roundId={roundId} roundName={round.name} />
        </div>

        {/* Guia */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-400 text-sm mb-2">Como funciona:</p>
          <p>1. Clique em um jogo para ver e editar as notas dos jogadores</p>
          <p>2. Use "Recalcular PontuaÃ§Ã£o" apÃ³s inserir todas as notas da rodada</p>
          <p>3. Minutos são registrados apenas para conferência; a nota conta integralmente</p>
          <p>4. Os participantes verÃ£o as notas na seÃ§Ã£o "â­ Notas dos Jogadores"</p>
        </div>
      </div>
    </div>
  )
}
