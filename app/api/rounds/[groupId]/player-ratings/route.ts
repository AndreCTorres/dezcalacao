// app/api/rounds/[groupId]/player-ratings/route.ts
// Retorna as notas dos jogadores do time de um participante por rodada

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const memberId = req.nextUrl.searchParams.get('memberId')

  if (!memberId) {
    return NextResponse.json({ error: 'memberId obrigatório' }, { status: 400 })
  }

  const admin = supabaseAdmin()

  try {
    // Buscar rodadas do grupo
    const { data: rounds } = await admin
      .from('rounds')
      .select('id, name, status')
      .eq('group_id', groupId)
      .in('status', ['open', 'scored'])
      .order('created_at', { ascending: true })

    if (!rounds || rounds.length === 0) {
      return NextResponse.json({ rounds: [] })
    }

    // Buscar time do participante (titulares + reservas)
    const { data: teamPlayers } = await admin
      .from('team_players')
      .select(`
        player_id,
        slot,
        position_slot,
        players!inner(id, name, team_name, position)
      `)
      .eq('group_member_id', memberId)

    if (!teamPlayers || teamPlayers.length === 0) {
      return NextResponse.json({ rounds: rounds.map(r => ({
        roundId: r.id,
        roundName: r.name,
        status: r.status,
        playerRatings: [],
      })) })
    }

    const playerIds = teamPlayers.map((tp: any) => tp.player_id)

    // Buscar ratings de todos os rounds de uma vez
    const { data: allRatings } = await admin
      .from('player_round_ratings')
      .select('player_id, round_id, rating, minutes')
      .in('round_id', rounds.map(r => r.id))
      .in('player_id', playerIds)

    // Mapear: round_id → player_id → rating
    const ratingsIndex = new Map<string, Map<number, { rating: number | null; minutes: number }>>()
    allRatings?.forEach((r: any) => {
      if (!ratingsIndex.has(r.round_id)) {
        ratingsIndex.set(r.round_id, new Map())
      }
      ratingsIndex.get(r.round_id)!.set(r.player_id, {
        rating: r.rating,
        minutes: r.minutes,
      })
    })

    // Montar resposta por rodada
    const result = rounds.map(round => {
      const roundRatings = ratingsIndex.get(round.id) ?? new Map()

      const playerRatings = teamPlayers
        .filter((tp: any) => roundRatings.has(tp.player_id) || round.status === 'scored')
        .map((tp: any) => {
          const ratingData = roundRatings.get(tp.player_id)
          return {
            playerId: tp.player_id,
            playerName: (tp.players as any).name,
            teamName: (tp.players as any).team_name,
            position: tp.position_slot,
            rating: ratingData?.rating ?? null,
            minutes: ratingData?.minutes ?? 0,
            slot: tp.slot,
          }
        })
        // Só incluir jogadores que têm algum dado OU se a rodada tem ratings
        .filter((p: any) => p.rating !== null || roundRatings.size > 0)

      return {
        roundId: round.id,
        roundName: round.name,
        status: round.status,
        playerRatings,
      }
    })

    return NextResponse.json({ rounds: result })

  } catch (err: any) {
    console.error('[PlayerRatings] Erro:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
