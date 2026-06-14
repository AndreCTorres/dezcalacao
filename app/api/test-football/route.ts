// app/api/test-football/route.ts
// Utilitário de consulta à API-Football para diagnóstico.
// APENAS PARA DESENVOLVIMENTO.
//
// GET /api/test-football                    → squad do Brasil (sanidade)
// GET /api/test-football?search=Korea       → busca time por nome
// GET /api/test-football?squad=149          → squad de um time por ID
// GET /api/test-football?wc=1              → lista os 48 times da Copa 2026 com IDs reais

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://v3.football.api-sports.io'

async function apiFootballGet(endpoint: string, params: Record<string, string | number> = {}) {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) throw new Error('API_FOOTBALL_KEY não está configurada no .env.local')

  const url = new URL(`${BASE_URL}${endpoint}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)))

  console.log('[Test API] →', url.toString())

  const response = await fetch(url.toString(), {
    headers: { 'x-apisports-key': apiKey },
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(`API-Football erro ${response.status}`)
  const json = await response.json()
  return json
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const searchQuery = searchParams.get('search')
  const squadId = searchParams.get('squad')

  try {
    // ── Modo diagnóstico de fixtures ────────────────────────────────
    // GET /api/test-football?fixtures_diag=1
    // Testa qual season/league retorna fixtures, sem gastar muitas req
    if (searchParams.get('fixtures_diag')) {
      const results: any = {}

      // Testa season=2026 (Copa 2026)
      try {
        const r26 = await apiFootballGet('/fixtures', { league: 1, season: 2026 })
        results.wc2026 = { count: (r26.response || []).length, errors: r26.errors, firstRound: r26.response?.[0]?.league?.round }
      } catch (e: any) { results.wc2026 = { error: e.message } }

      return NextResponse.json({
        tip: 'Se wc2026.count = 0, a API ainda não tem os fixtures da Copa 2026 disponíveis.',
        results,
      })
    }

    // ── Modo 0: lista times da Copa do Mundo 2026 ────────────────────
    // GET /api/test-football?wc=1
    // Usa o endpoint /teams com league=1 (Copa do Mundo) e season=2026
    // Retorna os IDs reais de todos os participantes — incluindo EUA
    if (searchParams.get('wc')) {
      // Plano free só tem acesso até 2024 — usamos Copa 2022 para pegar IDs das seleções
      // Os IDs das seleções são permanentes na API, não mudam por edição da Copa
      console.log('[Test API] Buscando times da Copa do Mundo 2022 (league=1, season=2022) para obter IDs')
      const json = await apiFootballGet('/teams', { league: 1, season: 2022 })
      console.log('[Test API] Raw WC response:', JSON.stringify(json).slice(0, 300))
      const results = (json.response || []).map((item: any) => ({
        id: item.team?.id,
        name: item.team?.name,
        country: item.team?.country,
        national: item.team?.national,
      })).sort((a: any, b: any) => a.name.localeCompare(b.name))

      return NextResponse.json({
        success: true,
        count: results.length,
        results,
        tip: 'Esses são os IDs reais dos times na Copa 2026. Use para atualizar KNOWN_TEAM_IDS.',
      })
    }

    // ── Modo 0b: busca times por país ────────────────────────────────
    // GET /api/test-football?country=USA
    // Usa o endpoint /teams filtrando pelo campo country — mais preciso que search
    const countryParam = searchParams.get('country')
    if (countryParam) {
      console.log(`[Test API] Buscando seleções do país: "${countryParam}"`)
      const json = await apiFootballGet('/teams', { country: countryParam })
      const all = (json.response || []).map((item: any) => ({
        id: item.team?.id,
        name: item.team?.name,
        country: item.team?.country,
        national: item.team?.national,
      }))
      // Destacar as nacionais no topo
      const nationals = all.filter((t: any) => t.national)
      const others = all.filter((t: any) => !t.national)

      return NextResponse.json({
        success: true,
        countryQueried: countryParam,
        totalResults: all.length,
        nationals,          // ← seleções nacionais (é aqui que está o time principal)
        others: others.slice(0, 5), // primeiros 5 clubes só pra confirmar contexto
        rawCount: json.results,
        tip: 'Veja "nationals" para encontrar a seleção principal. Use ?squad=ID para confirmar o elenco.',
      })
    }

    // ── Modo 0c: listar países disponíveis na API ────────────────────
    // GET /api/test-football?countries=1
    const countriesParam = searchParams.get('countries')
    if (countriesParam) {
      console.log('[Test API] Buscando lista de países')
      const json = await apiFootballGet('/countries')
      const results = (json.response || []).map((item: any) => ({
        name: item.name,
        code: item.code,
        flag: item.flag,
      }))
      // Filtrar para mostrar apenas países CONCACAF relevantes + qualquer coisa com "United"
      const relevant = results.filter((c: any) =>
        ['USA', 'US', 'United States', 'America'].some(k =>
          c.name?.toLowerCase().includes(k.toLowerCase()) ||
          c.code?.toLowerCase().includes(k.toLowerCase())
        )
      )
      return NextResponse.json({
        success: true,
        totalCountries: results.length,
        usaRelated: relevant,
        // Primeiros 20 países para referência
        sample: results.slice(0, 20),
        tip: 'Use o "name" ou "code" exato em ?country=NOME para buscar os times',
      })
    }
    if (searchQuery) {
      console.log(`[Test API] Buscando time: "${searchQuery}"`)
      const json = await apiFootballGet('/teams', { search: searchQuery })
      const results = (json.response || []).map((item: any) => ({
        id: item.team?.id,
        name: item.team?.name,
        country: item.team?.country,
        national: item.team?.national,
        logo: item.team?.logo,
      }))

      return NextResponse.json({
        success: true,
        query: searchQuery,
        count: results.length,
        results,
        tip: 'Use ?squad=ID para ver o elenco de um time específico',
      })
    }

    // ── Modo 2: squad de um time por ID ─────────────────────────────
    if (squadId) {
      console.log(`[Test API] Buscando squad do time ID: ${squadId}`)
      const json = await apiFootballGet('/players/squads', { team: squadId })
      const squads = json.response || []

      if (!squads.length) {
        return NextResponse.json({ success: false, error: `Nenhum squad para team_id ${squadId}` })
      }

      const squad = squads[0]
      const players = (squad.players || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        age: p.age,
        number: p.number,
      }))

      return NextResponse.json({
        success: true,
        team: { id: squad.team?.id, name: squad.team?.name },
        playersCount: players.length,
        players,
      })
    }

    // ── Modo 3 (default): sanidade squad Brasil ──────────────────────
    console.log('[Test API] Squad Brasil (sanidade)')
    const json = await apiFootballGet('/players/squads', { team: 6 })
    const squads = json.response || []
    const squad = squads[0]
    const players = (squad?.players || []).map((p: any) => ({
      id: p.id, name: p.name, position: p.position, age: p.age,
    }))

    return NextResponse.json({
      success: true,
      team: { id: squad?.team?.id, name: squad?.team?.name },
      playersCount: players.length,
      players,
      tip: 'Use ?search=NomePais para buscar um time, ou ?squad=ID para ver elenco',
    })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
