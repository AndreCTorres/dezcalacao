import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { API_COUNTRY_QUERY, WORLD_CUP_2026_COUNTRIES, canonicalTeam } from './world-cup-teams.mjs'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

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

const COUNTRY_ALIASES = new Map([
  ['Curaçao', 'Curacao'],
  ['Turkiye', 'Turkey'],
  ['Türkiye', 'Turkey'],
  ['Holland', 'Netherlands'],
  ['Nova Zelandia', 'New Zealand'],
  ['Nueva Zelanda', 'New Zealand'],
  ['Espanha', 'Spain'],
  ['Egito', 'Egypt'],
])

const KNOWN_TEAMS = {
  'South Korea': { id: 17, name: 'South Korea', country: 'South Korea' },
  'USA': { id: 2384, name: 'USA', country: 'USA' },
}

function countriesFromArgs() {
  const args = process.argv
    .slice(2)
    .map((arg) => arg.trim())
    .filter((arg) => arg && arg !== '--all')

  if (args.length === 0 || process.argv.includes('--all')) return WORLD_CUP_2026_COUNTRIES

  return args.map((country) => COUNTRY_ALIASES.get(country) ?? canonicalTeam(country))
}

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
  return new Promise((resolve) => setTimeout(resolve, ms))
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

function pickNationalTeam(country, teams) {
  const normalizedCountry = country.toLowerCase()
  const isSeniorMen = (name) => !/\b(w|u\d{2}|u\d{2}\s*w)\b/i.test(String(name ?? ''))

  return teams.find(({ team }) =>
    team?.national === true &&
    isSeniorMen(team?.name) &&
    String(team?.name ?? '').toLowerCase() === normalizedCountry
  ) ?? teams.find(({ team }) =>
    team?.national === true &&
    isSeniorMen(team?.name) &&
    String(team?.country ?? '').toLowerCase() === normalizedCountry
  ) ?? teams.find(({ team }) =>
    team?.national === true &&
    isSeniorMen(team?.name) &&
    String(team?.name ?? '').toLowerCase() === normalizedCountry
  ) ?? teams.find(({ team }) => team?.national === true && isSeniorMen(team?.name))
}

async function findTeam(country) {
  if (KNOWN_TEAMS[country]) return KNOWN_TEAMS[country]

  const queries = API_COUNTRY_QUERY[country] ?? [country]

  for (const query of queries) {
    const countryTeams = await apiFootballGet('/teams', { country: query })
    let match = pickNationalTeam(query, countryTeams)

    if (!match?.team?.id) {
      await sleep(THROTTLE_DELAY_MS)
      const searchTeams = await apiFootballGet('/teams', { search: query })
      match = pickNationalTeam(query, searchTeams)
    }

    if (match?.team?.id) {
      return {
        id: match.team.id,
        name: canonicalTeam(match.team.name || country),
        country,
      }
    }
  }

  throw new Error(`Nao encontrei selecao nacional para "${country}"`)
}

async function upsertTeam(team) {
  const { error } = await supabase
    .from('teams')
    .upsert({
      id: team.id,
      name: team.name,
      country: team.country,
      api_name: team.name,
      national: true,
      season: SEASON,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'id' })

  if (error) throw new Error(`Erro ao salvar time ${team.name}: ${error.message}`)
}

async function syncPlayers(team) {
  if (team.name === 'New Zealand') {
    await removeKnownBadNewZealandRows()
  }

  const squadData = await apiFootballGet('/players/squads', { team: team.id })

  if (squadData.length === 0) {
    console.log(`  Nenhum squad retornado para ${team.name}`)
    return 0
  }

  const squad = squadData[0]
  const players = squad.players || []
  const teamName = canonicalTeam(squad.team?.name || team.name)

  console.log(`  ${players.length} jogadores encontrados`)

  let saved = 0
  for (const player of players) {
    const { error } = await supabase
      .from('players')
      .upsert({
        id: player.id,
        name: player.name,
        team_id: team.id,
        team_name: teamName,
        position: mapPosition(player.position),
        api_position: player.position,
        age: player.age || null,
        number: player.number || null,
        photo_url: player.photo || null,
        api_player_id: player.id,
        season: SEASON,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (error) {
      console.log(`  Erro ao salvar ${player.name}: ${error.message}`)
      continue
    }

    saved++
  }

  return saved
}

async function removeKnownBadNewZealandRows() {
  const badIds = [999001, 999002, 999003, 999004]
  const { error } = await supabase
    .from('players')
    .delete()
    .in('id', badIds)

  if (error) {
    console.log(`  Aviso: nao consegui remover cadastros manuais antigos da Nova Zelandia: ${error.message}`)
  }
}

async function run() {
  const countries = countriesFromArgs()
  let totalPlayersSaved = 0

  console.log(`Sincronizando elencos (${countries.length} selecoes): ${countries.join(', ')}\n`)

  for (const country of countries) {
    try {
      console.log(`Buscando ${country}...`)
      await sleep(THROTTLE_DELAY_MS)
      const team = await findTeam(country)
      await upsertTeam(team)

      await sleep(THROTTLE_DELAY_MS)
      const saved = await syncPlayers(team)
      totalPlayersSaved += saved

      console.log(`  OK: ${team.name} (${saved} jogadores salvos)\n`)
    } catch (error) {
      console.log(`  Erro em ${country}: ${error.message}\n`)
    }
  }

  console.log(`Concluido. Jogadores salvos/atualizados: ${totalPlayersSaved}`)
}

run().catch((error) => {
  console.error('Erro fatal:', error.message)
  process.exit(1)
})
