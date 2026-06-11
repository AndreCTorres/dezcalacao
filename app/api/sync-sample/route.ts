// app/api/sync-sample/route.ts
// Sync de amostra: Brasil + Argentina (2 requests) pra testar fotos e UI

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mapPosition } from '@/lib/apiFootball'

const BASE_URL = 'https://v3.football.api-sports.io'
const SEASON = 'WC2026'

async function apiFootballGet(endpoint: string, params: Record<string, string | number>) {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) throw new Error('API_FOOTBALL_KEY não configurada')

  const url = new URL(`${BASE_URL}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': apiKey },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`API-Football ${res.status}`)
  const json = await res.json()
  return json.response || []
}

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) throw new Error('Faltam variáveis do Supabase')

    const admin = createClient(supabaseUrl, supabaseKey)

    const teams = [
      { id: 6,  country: 'Brazil',    name: 'Brazil' },
      { id: 26, country: 'Argentina', name: 'Argentina' },
    ]

    const results: Record<string, { players: number; errors: string[] }> = {}

    for (const team of teams) {
      console.log(`\n[Sample Sync] Buscando elenco: ${team.name}...`)
      results[team.name] = { players: 0, errors: [] }

      // Upsert time na tabela teams
      await admin.from('teams').upsert(
        { id: team.id, name: team.name, country: team.country, api_name: team.name, national: true, season: SEASON, synced_at: new Date().toISOString() },
        { onConflict: 'id' }
      )

      // Busca elenco — consome 1 request da API
      const squadData = await apiFootballGet('/players/squads', { team: team.id })

      if (!squadData.length) {
        console.log(`[Sample Sync] ⚠️ Sem squad para ${team.name}`)
        continue
      }

      const players = squadData[0].players || []
      console.log(`[Sample Sync] ${team.name}: ${players.length} jogadores`)

      for (const p of players) {
        const { error } = await admin.from('players').upsert(
          {
            id: p.id,
            name: p.name,
            team_id: team.id,
            team_name: team.name,
            position: mapPosition(p.position),
            api_position: p.position,
            age: p.age || null,
            number: p.number || null,
            photo_url: p.photo || null,
            api_player_id: p.id,
            season: SEASON,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

        if (error) {
          results[team.name].errors.push(`${p.name}: ${error.message}`)
        } else {
          results[team.name].players++
        }
      }

      console.log(`[Sample Sync] ✓ ${team.name}: ${results[team.name].players} inseridos, ${results[team.name].errors.length} erros`)
    }

    const totalPlayers = Object.values(results).reduce((acc, r) => acc + r.players, 0)
    const totalErrors  = Object.values(results).reduce((acc, r) => acc + r.errors.length, 0)

    return NextResponse.json({
      success: true,
      message: `${totalPlayers} jogadores inseridos (Brasil + Argentina). Acesse /app pra ver as fotos.`,
      results,
      totalPlayers,
      totalErrors,
    })
  } catch (error: any) {
    console.error('[Sample Sync] ❌', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
