// app/api/rounds/[roundId]/fixture-players/route.ts
// Retorna todos os jogadores das selecoes de um fixture + ratings ja existentes.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

function normalizeTeam(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ä±/g, 'ı')
    .replace(/Ä°/g, 'İ')
    .replace(/ÄŸ/g, 'ğ')
    .replace(/ÅŸ/g, 'ş')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã¶/g, 'ö')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const TEAM_ALIASES: Record<string, string[]> = {
  turkey: ['turkiye', 'turquia'],
  turkiye: ['turkey', 'turquia'],
  turquia: ['turkey', 'turkiye'],
  usa: ['united states', 'eua', 'estados unidos'],
  'united states': ['usa', 'eua', 'estados unidos'],
  bosnia: ['bosnia herzegovina', 'bosnia and herzegovina', 'bosnia & herzegovina'],
  'bosnia herzegovina': ['bosnia', 'bosnia and herzegovina', 'bosnia & herzegovina'],
  'bosnia and herzegovina': ['bosnia', 'bosnia herzegovina', 'bosnia & herzegovina'],
  'ivory coast': ['cote d ivoire', 'cote divoire', 'costa do marfim'],
  'cote d ivoire': ['ivory coast', 'cote divoire', 'costa do marfim'],
  'cape verde': ['cape verde islands', 'cabo verde'],
  'cape verde islands': ['cape verde', 'cabo verde'],
  'congo dr': ['dr congo', 'democratic republic of the congo'],
  'dr congo': ['congo dr', 'democratic republic of the congo'],
  czechia: ['czech republic', 'rep tcheca'],
  'czech republic': ['czechia', 'rep tcheca'],
  'south korea': ['korea republic', 'coreia do sul'],
  'korea republic': ['south korea', 'coreia do sul'],
  curacao: ['curacao'],
}

function teamVariants(value: string | null | undefined) {
  const base = normalizeTeam(value)
  if (!base) return []
  return Array.from(new Set([base, ...(TEAM_ALIASES[base] ?? [])].map(normalizeTeam)))
}

function teamsMatch(playerTeam: string | null | undefined, fixtureTeam: string | null | undefined) {
  const playerVariants = teamVariants(playerTeam)
  const fixtureVariants = teamVariants(fixtureTeam)
  return playerVariants.some((playerVariant) =>
    fixtureVariants.some((fixtureVariant) =>
      playerVariant === fixtureVariant ||
      playerVariant.includes(fixtureVariant) ||
      fixtureVariant.includes(playerVariant)
    )
  )
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

  const { data: allPlayers } = await admin
    .from('players')
    .select('id, name, team_name, position')
    .order('team_name', { ascending: true })
    .order('position', { ascending: true })
    .order('name', { ascending: true })

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
    if (a.team_name === fixture.home_team && b.team_name !== fixture.home_team) return -1
    if (a.team_name !== fixture.home_team && b.team_name === fixture.home_team) return 1
    return (posOrder[a.position] ?? 9) - (posOrder[b.position] ?? 9)
  })

  return NextResponse.json({
    fixture: { id: fixture.id, home_team: fixture.home_team, away_team: fixture.away_team },
    players: result,
  })
}
