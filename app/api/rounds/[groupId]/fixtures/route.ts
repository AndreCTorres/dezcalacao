// app/api/rounds/[groupId]/fixtures/route.ts
// Retorna detalhes de notas por jogo/fixture (os "campinhos" com notas individuais)

import { supabaseAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

type GameDetail = {
  id: number
  roundId: string
  roundName: string
  label: string
  homeTeam: string | null
  awayTeam: string | null
  homeGoals: number | null
  awayGoals: number | null
  score: string | null
  players: Array<{
    player_id: number
    name: string
    team_name: string
    position: string
    rating: number | null
    minutes: number | null
  }>
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const admin = supabaseAdmin()
    const url = new URL(request.url)
    const roundId = url.searchParams.get('roundId')

    // Se roundId especificado, retorna apenas aquela rodada
    // Senão retorna a rodada mais recente com scores
    let targetRound

    if (roundId) {
      const { data } = await admin
        .from('rounds')
        .select('id, name, status')
        .eq('id', roundId)
        .eq('group_id', groupId)
        .single()
      targetRound = data
    } else {
      // Pega a rodada mais recente com status scored
      const { data } = await admin
        .from('rounds')
        .select('id, name, status')
        .eq('group_id', groupId)
        .eq('status', 'scored')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      targetRound = data
    }

    if (!targetRound) {
      return NextResponse.json(
        { error: 'Nenhuma rodada encontrada', fixtures: [] },
        { status: 400 }
      )
    }

    // Buscar fixtures desta rodada
    const { data: fixtures } = await admin
      .from('fixtures')
      .select('id, home_team, away_team, label, home_goals, away_goals')
      .eq('round_id', targetRound.id)
      .order('id', { ascending: true })

    // Buscar todas as notas da rodada
    const { data: ratings } = await admin
      .from('player_round_ratings')
      .select('player_id, fixture_id, rating, minutes, players ( name, team_name, position )')
      .eq('round_id', targetRound.id)

    // Montar resposta estruturada por fixture
    const games: GameDetail[] = []

    if (fixtures) {
      for (const fixture of fixtures) {
        const fixtureRatings = (ratings ?? []).filter(
          (r: any) => r.fixture_id === fixture.id && r.rating != null
        )

        const players = fixtureRatings.map((r: any) => {
          const playerData = Array.isArray(r.players) ? r.players[0] : r.players
          return {
            player_id: r.player_id,
            name: playerData?.name ?? '—',
            team_name: playerData?.team_name ?? '—',
            position: playerData?.position ?? '—',
            rating: r.rating,
            minutes: r.minutes,
          }
        })

        const hasScore = fixture.home_goals != null && fixture.away_goals != null

        games.push({
          id: fixture.id,
          roundId: targetRound.id,
          roundName: targetRound.name,
          label: fixture.label || `${fixture.home_team} x ${fixture.away_team}`,
          homeTeam: fixture.home_team,
          awayTeam: fixture.away_team,
          homeGoals: fixture.home_goals,
          awayGoals: fixture.away_goals,
          score: hasScore ? `${fixture.home_goals} x ${fixture.away_goals}` : null,
          players: players.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
        })
      }
    }

    return NextResponse.json({
      round: {
        id: targetRound.id,
        name: targetRound.name,
        status: targetRound.status,
      },
      games,
    })
  } catch (error: any) {
    console.error('[Fixtures API] Erro:', error.message)
    return NextResponse.json(
      { error: 'Erro ao buscar detalhes de fixtures', games: [] },
      { status: 500 }
    )
  }
}
