/**
 * Sync Service
 * Sincronização de dados externos (API-Football)
 */

const API_BASE = 'https://v3.football.api-sports.io'
const WORLD_CUP_LEAGUE_ID = 1
const SEASON = 'WC2026'

export interface SyncResult {
  success: boolean
  error?: string
  teamsResolved?: number
  teamsPending?: string[]
  playersInserted?: number
  errors?: string[]
}

/**
 * Chamar API-Football
 */
async function apiFootballGet(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<unknown[]> {
  const apiKey = process.env.API_FOOTBALL_KEY

  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY não configurada')
  }

  const url = new URL(`${API_BASE}${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })

  const response = await fetch(url.toString(), {
    headers: { 'x-apisports-key': apiKey },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`API-Football erro ${response.status}`)
  }

  const json = (await response.json()) as { response: unknown[] }
  return json.response || []
}

/**
 * Sleep com throttle
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mapear posição da API para nossa nomenclatura
 */
function mapPosition(apiPosition: string): string {
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

/**
 * Resolver IDs das 48 seleções da Copa 2026
 */
export async function resolveTeamIds(): Promise<
  Map<string, { id: number; name: string }>
> {
  const teamIdMap = new Map<string, { id: number; name: string }>()

  const WORLD_CUP_2026_COUNTRIES = [
    'Germany', 'England', 'Austria', 'Belgium', 'Bosnia & Herzegovina', 'Croatia',
    'Scotland', 'Spain', 'France', 'Norway', 'Netherlands', 'Portugal', 'Sweden',
    'Switzerland', 'Czechia', 'Turkey', 'Argentina', 'Brazil', 'Colombia', 'Ecuador',
    'Paraguay', 'Uruguay', 'Canada', 'USA', 'Mexico', 'Curaçao', 'Haiti', 'Panama',
    'South Africa', 'Algeria', 'Cape Verde', 'Ivory Coast', 'Egypt', 'Ghana',
    'Morocco', 'DR Congo', 'Senegal', 'Tunisia', 'Saudi Arabia', 'Australia', 'Iraq',
    'Japan', 'Jordan', 'Uzbekistan', 'Qatar', 'South Korea', 'Iran', 'New Zealand',
  ]

  const COUNTRY_NAME_MAPPING: Record<string, string> = {
    'South Korea': 'Korea Republic',
    'DR Congo': 'Congo DR',
    'Czechia': 'Czech Republic',
    'Turkey': 'Türkiye',
    'Ivory Coast': "Cote D'Ivoire",
  }

  // Buscar teams da Copa 2022 para cache
  console.log('[Sync] Buscando times da Copa 2022 para cache inicial...')
  await sleep(350)
  const teams2022 = await apiFootballGet('/teams', {
    league: WORLD_CUP_LEAGUE_ID,
    season: 2022,
  })

  for (const item of teams2022 as any[]) {
    const teamName = item.team?.name
    const teamId = item.team?.id
    const country = item.team?.country

    if (!teamName || !teamId) continue

    const matchingCountry = WORLD_CUP_2026_COUNTRIES.find((c) => {
      const apiName = COUNTRY_NAME_MAPPING[c] || c
      return teamName === apiName || country === c
    })

    if (matchingCountry) {
      teamIdMap.set(matchingCountry, { id: teamId, name: teamName })
    }
  }

  // Resolver países pendentes
  const pendingCountries = WORLD_CUP_2026_COUNTRIES.filter(
    (c) => !teamIdMap.has(c)
  )

  for (const country of pendingCountries) {
    const searchName = COUNTRY_NAME_MAPPING[country] || country
    console.log(`[Sync] Buscando "${searchName}"...`)

    try {
      await sleep(350)
      const searchResults = await apiFootballGet('/teams', {
        search: searchName,
      })

      const nationalTeam = (searchResults as any[]).find(
        (item) => item.team?.national === true
      )

      if (nationalTeam) {
        const teamId = nationalTeam.team.id
        const teamName = nationalTeam.team.name
        teamIdMap.set(country, { id: teamId, name: teamName })
      }
    } catch (error) {
      console.error(`[Sync] Erro ao buscar ${country}:`, error)
    }
  }

  return teamIdMap
}

/**
 * Sincronizar jogadores (stub para ser usado em Server Actions)
 * Implementação completa em app/admin/actions.ts
 */
export async function syncPlayersStub(): Promise<SyncResult> {
  return {
    success: false,
    error: 'Use syncPlayers() de app/admin/actions.ts para sincronização completa',
  }
}
