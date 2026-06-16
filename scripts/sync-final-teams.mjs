import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !API_FOOTBALL_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e/ou API_FOOTBALL_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const THROTTLE_DELAY_MS = 6500
const API_BASE = 'https://v3.football.api-sports.io'
const SEASON = 'WC2026'

// Times que ainda faltam jogadores: Switzerland (22) e Curacao (1569)
const TEAMS_TO_SYNC = [
  { id: 22, country: 'Switzerland' },
  { id: 1569, country: 'Curacao' },
]

function mapPosition(apiPosition) {
  switch ((apiPosition || '').toLowerCase()) {
    case 'goalkeeper':
      return 'GK'
    case 'defender':
      return 'ZAG'
    case 'midfielder':
      return 'MEI'
    case 'attacker':
      return 'ATK'
    default:
      return 'MEI'
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function apiFootballGet(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })

  const response = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_FOOTBALL_KEY },
    cache: 'no-store',
  })

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || '60'
    throw new Error(`Rate limit atingido. Aguarde ${retryAfter}s.`)
  }

  if (!response.ok) {
    throw new Error(`API-Football erro ${response.status}: ${response.statusText}`)
  }

  const json = await response.json()
  return json.response || []
}

async function run() {
  console.log('🚀 Sincronizando últimos 2 times (Switzerland, Curacao)...\n')

  let totalPlayersInserted = 0
  let errors = []

  for (const { id: teamId, country } of TEAMS_TO_SYNC) {
    console.log(`📍 ${country} (ID: ${teamId})...`)

    try {
      await sleep(THROTTLE_DELAY_MS)
      const squadData = await apiFootballGet('/players/squads', { team: teamId })

      if (squadData.length === 0) {
        console.log(`  ⚠️  Nenhum squad retornado`)
        continue
      }

      const squad = squadData[0]
      const players = squad.players || []
      const teamName = squad.team?.name || country

      console.log(`  ${players.length} jogadores encontrados`)

      for (const player of players) {
        const playerData = {
          id: player.id,
          name: player.name,
          team_id: teamId,
          team_name: teamName,
          position: mapPosition(player.position),
          api_position: player.position,
          age: player.age || null,
          number: player.number || null,
          photo_url: player.photo || null,
          api_player_id: player.id,
          season: SEASON,
          synced_at: new Date().toISOString(),
        }

        const { error } = await supabase
          .from('players')
          .upsert(playerData, { onConflict: 'id' })

        if (error) {
          errors.push(`${player.name}: ${error.message}`)
        } else {
          totalPlayersInserted++
        }
      }

      console.log(`  ✓ ${players.length} jogadores sincronizados`)
    } catch (err) {
      console.error(`  ❌ Erro: ${err.message}`)
      errors.push(`${country}: ${err.message}`)
    }
  }

  console.log(`\n✅ Concluído!`)
  console.log(`  • Jogadores inseridos: ${totalPlayersInserted}`)
  if (errors.length > 0) {
    console.log(`  • Erros: ${errors.length}`)
  }

  process.exit(0)
}

run().catch(err => {
  console.error('❌ Erro fatal:', err.message)
  process.exit(1)
})
