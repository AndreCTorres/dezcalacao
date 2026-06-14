// app/api/test-fotmob/route.ts
// Teste real da API-Football: consegue puxar ratings de jogos da Copa 2026?
// DELETE este arquivo após o teste

import { NextResponse } from 'next/server'

const BASE = 'https://v3.football.api-sports.io'
const WC_LEAGUE_ID = 1
const SEASON = 2026

async function apiGet(path: string, params: Record<string, string | number>) {
  const key = process.env.API_FOOTBALL_KEY!
  const url = new URL(BASE + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': key },
    cache: 'no-store',
  })

  const json = await res.json()
  return { status: res.status, ok: res.ok, headers_remaining: res.headers.get('x-ratelimit-requests-remaining'), json }
}

export async function GET() {
  const results: any = {}

  // PASSO 1: Busca fixtures da Copa 2026 — quantos existem e qual o status
  const fixturesRes = await apiGet('/fixtures', { league: WC_LEAGUE_ID, season: SEASON })
  const fixtures = fixturesRes.json?.response ?? []
  const finished = fixtures.filter((f: any) => ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short))

  results.step1_fixtures = {
    status: fixturesRes.status,
    requests_remaining: fixturesRes.headers_remaining,
    total_fixtures: fixtures.length,
    finished_count: finished.length,
    api_errors: fixturesRes.json?.errors,
    sample_finished: finished.slice(0, 3).map((f: any) => ({
      fixture_id: f.fixture?.id,
      date: f.fixture?.date?.slice(0, 10),
      home: f.teams?.home?.name,
      away: f.teams?.away?.name,
      status: f.fixture?.status?.short,
    })),
  }

  // Se não veio nenhum fixture, para aqui — é bloqueio de plano
  if (fixtures.length === 0) {
    results.conclusion = '❌ API-Football não retornou fixtures da Copa 2026 — plano insuficiente'
    return NextResponse.json(results)
  }

  if (finished.length === 0) {
    results.conclusion = '⚠️ Fixtures retornados mas nenhum encerrado ainda'
    return NextResponse.json(results)
  }

  // PASSO 2: Tenta puxar player stats (ratings) do primeiro jogo encerrado
  const testFixture = finished[0]
  const fixtureId = testFixture.fixture?.id

  const statsRes = await apiGet('/fixtures/players', { fixture: fixtureId })
  const statsData = statsRes.json?.response ?? []

  results.step2_player_stats = {
    status: statsRes.status,
    fixture_id: fixtureId,
    match: `${testFixture.teams?.home?.name} x ${testFixture.teams?.away?.name}`,
    api_errors: statsRes.json?.errors,
    teams_returned: statsData.length,
  }

  if (statsData.length === 0) {
    results.step2_player_stats.raw_response_preview = JSON.stringify(statsRes.json).slice(0, 300)
    results.conclusion = '❌ Player stats não retornados — endpoint bloqueado no plano atual'
    return NextResponse.json(results)
  }

  // PASSO 3: Verifica se os ratings vêm preenchidos ou null
  const allPlayers = statsData.flatMap((team: any) =>
    (team.players ?? []).map((p: any) => ({
      name: p.player?.name,
      minutes: p.statistics?.[0]?.games?.minutes,
      rating: p.statistics?.[0]?.games?.rating,
    }))
  )

  const withRating = allPlayers.filter((p: any) => p.rating !== null && p.rating !== undefined)
  const withoutRating = allPlayers.filter((p: any) => p.rating === null || p.rating === undefined)

  results.step3_ratings = {
    total_players: allPlayers.length,
    with_rating: withRating.length,
    without_rating: withoutRating.length,
    sample_with_rating: withRating.slice(0, 5),
    sample_without_rating: withoutRating.slice(0, 3),
  }

  results.conclusion = withRating.length > 0
    ? `✅ API-Football funciona! ${withRating.length}/${allPlayers.length} jogadores com rating`
    : `⚠️ Endpoint acessível mas ratings vêm null — dados ainda não disponíveis ou plano limitado`

  return NextResponse.json(results)
}
