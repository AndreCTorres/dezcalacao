// app/api/rounds/[roundId]/fixture-players/route.ts
// Retorna todos os jogadores das seleções de um fixture + ratings já existentes

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  // O parâmetro da URL é groupId (por convenção de pasta), mas representa o roundId
  const { groupId: roundId } = await params
  const fixtureId = req.nextUrl.searchParams.get('fixtureId')

  if (!fixtureId) {
    return NextResponse.json({ error: 'fixtureId obrigatório' }, { status: 400 })
  }

  const admin = supabaseAdmin()

  // Buscar fixture para saber as seleções
  const { data: fixture } = await admin
    .from('fixtures')
    .select('id, home_team, away_team')
    .eq('id', Number(fixtureId))
    .single()

  if (!fixture) {
    return NextResponse.json({ error: 'Fixture não encontrado' }, { status: 404 })
  }

  // Buscar todos os jogadores das duas seleções
  const { data: players } = await admin
    .from('players')
    .select('id, name, team_name, position')
    .in('team_name', [fixture.home_team, fixture.away_team])
    .order('team_name', { ascending: true })
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  if (!players || players.length === 0) {
    return NextResponse.json({ players: [] })
  }

  const playerIds = players.map((p: any) => p.id)

  // Buscar ratings já existentes desta rodada para esses jogadores
  const { data: existingRatings } = await admin
    .from('player_round_ratings')
    .select('player_id, rating, minutes')
    .eq('round_id', roundId)
    .in('player_id', playerIds)

  const ratingsMap = new Map<number, { rating: number | null; minutes: number }>()
  existingRatings?.forEach((r: any) => {
    ratingsMap.set(r.player_id, { rating: r.rating, minutes: r.minutes })
  })

  // Montar resposta com ratings incluídos
  const result = players.map((p: any) => {
    const existing = ratingsMap.get(p.id)
    return {
      id: p.id,
      name: p.name,
      team_name: p.team_name,
      position: p.position,
      rating: existing?.rating ?? null,
      minutes: existing?.minutes ?? 90,
    }
  })

  // Ordenar: time da casa primeiro, depois visitante; dentro de cada time por posição
  const posOrder: Record<string, number> = { GK: 0, ZAG: 1, LAT: 2, MEI: 3, ATK: 4 }
  result.sort((a: any, b: any) => {
    if (a.team_name === fixture.home_team && b.team_name !== fixture.home_team) return -1
    if (a.team_name !== fixture.home_team && b.team_name === fixture.home_team) return 1
    return (posOrder[a.position] ?? 9) - (posOrder[b.position] ?? 9)
  })

  return NextResponse.json({
    fixture: { id: fixture.id, home_team: fixture.home_team, away_team: fixture.away_team },
    players: result,
  })
}
