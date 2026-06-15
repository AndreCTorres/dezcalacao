import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://doynzpekofzfrzhfogkw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveW56cGVrb2Z6ZnJ6aGZvZ2t3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA1NDc2MiwiZXhwIjoyMDk2NjMwNzYyfQ.sVfzDkLJKBaf7AauJY4RkG0TJ_6xX6vz9af06i2g90M'
const API_FOOTBALL_KEY = 'f4c8a759810bd94cde12e4b736111210'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const THROTTLE_DELAY_MS = 6500 // 10 req/min max = 6.5s cada
const API_BASE = 'https://v3.football.api-sports.io'
const SEASON = 'WC2026'

// Times que faltam jogadores (conforme sync-check)
// ID 20 = Qatar, 22 = Switzerland, 1569 = Curacao, 1568 = Turkey
const TEAMS_TO_SYNC = [
  { id: 20, country: 'Qatar' },
  { id: 22, country: 'Switzerland' },
  { id: 1569, country: 'Curaçao' },
  { id: 1568, country: 'Turkey' },
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
  console.log('🚀 Sincronizando jogadores dos 4 times que faltam...\n')

  let totalPlayersInserted = 0
  let errors = []

  for (const { id: teamId, country } of TEAMS_TO_SYNC) {
    console.log(`📍 Sincronizando ${country} (ID: ${teamId})...`)

    try {
      await sleep(THROTTLE_DELAY_MS)
      const squadData = await apiFootballGet('/players/squads', { team: teamId })

      if (squadData.length === 0) {
        console.log(`⚠️  Nenhum squad retornado para ${country}`)
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

      console.log(`  ✓ ${country} sincronizado (${players.length} jogadores)`)
    } catch (err) {
      console.error(`  ❌ Erro ao sincronizar ${country}: ${err.message}`)
      errors.push(`${country}: ${err.message}`)
    }
  }

  console.log(`\n✅ Concluído!`)
  console.log(`  • Jogadores inseridos: ${totalPlayersInserted}`)
  if (errors.length > 0) {
    console.log(`  • Erros: ${errors.length}`)
    errors.slice(0, 5).forEach(e => console.log(`    - ${e}`))
  }

  process.exit(0)
}

run().catch(err => {
  console.error('❌ Erro fatal:', err.message)
  process.exit(1)
})
