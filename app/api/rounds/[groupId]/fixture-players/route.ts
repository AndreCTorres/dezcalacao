// app/api/rounds/[roundId]/fixture-players/route.ts
// Retorna todos os jogadores das selecoes de um fixture + ratings ja existentes.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { teamsMatch } from '@/lib/teamNames'

async function fetchAllFixturePlayers(admin: ReturnType<typeof supabaseAdmin>) {
  const pageSize = 1000
  const rows: any[] = []

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from('players')
      .select('id, name, team_name, position')
      .order('team_name', { ascending: true })
      .order('position', { ascending: true })
      .order('name', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }

  return rows
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const fixtureId = req.nextUrl.searchParams.get('fixtureId')
  const roundId = req.nextUrl.searchParams.get('roundId')

  if (!fixtureId) {
    return NextResponse.json({ error: 'fixtureId obrigatorio' }, { status: 400 })
  }

  if (!roundId) {
    return NextResponse.json({ error: 'roundId obrigatorio' }, { status: 400 })
  }

  const admin = supabaseAdmin()

  const { data: fixture } = await admin
    .from('fixtures')
    .select('id, home_team, away_team')
    .eq('id', Number(fixtureId))
    .single()

  if (!fixture) {
    return NextResponse.json({ error: 'Fixture nao encontrado' }, { status: 404 })
  }

  const allPlayers = await fetchAllFixturePlayers(admin)

  const players = (allPlayers ?? []).filter((player: any) =>
    teamsMatch(player.team_name, fixture.home_team) ||
    teamsMatch(player.team_name, fixture.away_team)
  )

  if (!players || players.length === 0) {
    return NextResponse.json({ players: [] })
  }

  const playerIds = players.map((p: any) => p.id)

  const { data: existingRatings } = await admin
    .from('player_round_ratings')
    .select('player_id, rating, minutes, lineup_role')
    .eq('round_id', roundId)
    .eq('fixture_id', fixture.id)
    .in('player_id', playerIds)

  const ratingsMap = new Map<number, { rating: number | null; minutes: number; lineup_role: 'starter' | 'substitute' | null }>()
  existingRatings?.forEach((r: any) => {
    ratingsMap.set(r.player_id, { rating: r.rating, minutes: r.minutes, lineup_role: r.lineup_role })
  })

  const result = players.map((p: any) => {
    const existing = ratingsMap.get(p.id)
    return {
      id: p.id,
      name: p.name,
      team_name: p.team_name,
      position: p.position,
      rating: existing?.rating ?? null,
      minutes: existing?.minutes ?? 0,
      lineup_role: existing?.lineup_role ?? null,
    }
  })

  const posOrder: Record<string, number> = { GK: 0, ZAG: 1, LAT: 2, MEI: 3, ATK: 4 }
  result.sort((a: any, b: any) => {
    if (teamsMatch(a.team_name, fixture.home_team) && !teamsMatch(b.team_name, fixture.home_team)) return -1
    if (!teamsMatch(a.team_name, fixture.home_team) && teamsMatch(b.team_name, fixture.home_team)) return 1
    return (posOrder[a.position] ?? 9) - (posOrder[b.position] ?? 9)
  })

  return NextResponse.json({
    fixture: { id: fixture.id, home_team: fixture.home_team, away_team: fixture.away_team },
    players: result,
  })
}
