// app/api/admin/rounds/[roundId]/verify/route.ts
// Diagnóstico de ratings de uma rodada

import { supabaseAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params
    const admin = supabaseAdmin()

    // Buscar rodada
    const { data: round } = await admin
      .from('rounds')
      .select('id, name, status, group_id')
      .eq('id', roundId)
      .single()

    if (!round) {
      return NextResponse.json(
        { error: 'Rodada não encontrada' },
        { status: 404 }
      )
    }

    // Buscar todos os ratings
    const { data: allRatings } = await admin
      .from('player_round_ratings')
      .select('id, player_id, fixture_id, rating, minutes, players(name, team_name)')
      .eq('round_id', roundId)

    // Contar por status
    const withRating = (allRatings ?? []).filter(r => r.rating != null).length
    const withoutRating = (allRatings ?? []).filter(r => r.rating == null).length
    const withFixtureId = (allRatings ?? []).filter(r => r.fixture_id != null).length
    const withoutFixtureId = (allRatings ?? []).filter(r => r.fixture_id == null).length

    // Ratings problemáticos
    const problematic = (allRatings ?? []).filter(r => r.rating == null || r.fixture_id == null)

    return NextResponse.json({
      round: {
        id: round.id,
        name: round.name,
        status: round.status,
      },
      stats: {
        total: allRatings?.length ?? 0,
        withRating,
        withoutRating,
        withFixtureId,
        withoutFixtureId,
        problematic: problematic.length,
      },
      problematicRatings: problematic.slice(0, 20).map((r: any) => ({
        player_id: r.player_id,
        player_name: r.players?.name,
        team_name: r.players?.team_name,
        rating: r.rating,
        fixture_id: r.fixture_id,
        minutes: r.minutes,
      })),
    })
  } catch (error: any) {
    console.error('[RoundVerifyAPI] Erro:', error.message)
    return NextResponse.json(
      { error: 'Erro ao verificar ratings', message: error.message },
      { status: 500 }
    )
  }
}
