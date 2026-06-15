// app/admin/rodadas/[roundId]/page.tsx
// Página de gerenciamento de notas de uma rodada — jogos clicáveis com modal

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/app/components/logout-button'
import { RoundRatingsManager } from './round-ratings-manager'

interface PageProps {
  params: Promise<{ roundId: string }>
}

export default async function RoundRatingsPage({ params }: PageProps) {
  const { roundId } = await params

  const supabase = await createActionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = supabaseAdmin()

  const { data: round } = await admin
    .from('rounds')
    .select('id, name, status, group_id, groups!inner(id, name, admin_id)')
    .eq('id', roundId)
    .single()

  if (!round) notFound()
  if ((round.groups as any).admin_id !== user.id) redirect('/admin')

  const groupId = round.group_id
  const groupName = (round.groups as any).name

  // Fixtures desta rodada com contagem de ratings
  const { data: fixtures } = await admin
    .from('fixtures')
    .select('id, home_team, away_team, label, status')
    .eq('round_id', roundId)
    .order('id', { ascending: true })

  // Para cada fixture, contar quantos jogadores têm nota
  const fixtureIds = (fixtures ?? []).map((f: any) => f.id)
  const { data: ratingCounts } = fixtureIds.length > 0
    ? await admin
        .from('player_round_ratings')
        .select('fixture_id')
        .eq('round_id', roundId)
        .in('fixture_id', fixtureIds)
        .not('rating', 'is', null)
    : { data: [] }

  const countByFixture: Record<number, number> = {}
  ratingCounts?.forEach((r: any) => {
    countByFixture[r.fixture_id] = (countByFixture[r.fixture_id] ?? 0) + 1
  })

  // Total de ratings desta rodada (incluindo sem fixture)
  const { count: totalRated } = await admin
    .from('player_round_ratings')
    .select('id', { count: 'exact', head: true })
    .eq('round_id', roundId)
    .not('rating', 'is', null)

  const fixturesWithCount = (fixtures ?? []).map((f: any) => ({
    ...f,
    ratedCount: countByFixture[f.id] ?? 0,
  }))

  const { data: playerTeams } = await admin
    .from('players')
    .select('team_name')
    .order('team_name', { ascending: true })

  const teamOptions = Array.from(
    new Set((playerTeams ?? []).map((p: any) => p.team_name).filter(Boolean))
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <Link href="/admin/rodadas" className="text-lime-400 hover:text-lime-300 text-sm">
              ← Voltar para rodadas
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
              {round.status === 'scored' ? '✅ Pontuada' : round.status === 'open' ? '🟢 Aberta' : '🔒 Travada'}
            </span>
            <span className="text-xs text-gray-400">
              {totalRated ?? 0} jogadores com nota inserida
            </span>
            <span className="text-xs text-gray-400">
              {fixturesWithCount.length} {fixturesWithCount.length === 1 ? 'jogo' : 'jogos'} nesta rodada
            </span>
          </div>
        </div>

        {/* Manager — lista de jogos + modal */}
        <RoundRatingsManager
          groupId={groupId}
          roundId={roundId}
          roundName={round.name}
          roundStatus={round.status}
          fixtures={fixturesWithCount}
          teamOptions={teamOptions}
        />

        {/* Guia */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-400 text-sm mb-2">Como funciona:</p>
          <p>1. Clique em um jogo para ver e editar as notas dos jogadores</p>
          <p>2. Use "Recalcular Pontuação" após inserir todas as notas da rodada</p>
          <p>3. Jogadores com menos de 20 minutos recebem nota 0 no cálculo</p>
          <p>4. Os participantes verão as notas na seção "⭐ Notas dos Jogadores"</p>
        </div>
      </div>
    </div>
  )
}
