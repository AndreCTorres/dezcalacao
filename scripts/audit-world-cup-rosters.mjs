import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { WORLD_CUP_2026_COUNTRIES, canonicalTeam } from './world-cup-teams.mjs'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MIN_EXPECTED_PLAYERS = Number(process.env.MIN_EXPECTED_PLAYERS ?? 18)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function statusFor(count) {
  if (count === 0) return 'VAZIO'
  if (count < MIN_EXPECTED_PLAYERS) return 'BAIXO'
  return 'OK'
}

function pad(value, size) {
  return String(value).padEnd(size, ' ')
}

async function run() {
  const pageSize = 1000
  const data = []

  for (let from = 0; ; from += pageSize) {
    const { data: page, error } = await supabase
      .from('players')
      .select('id, name, team_name, position, api_position, api_player_id')
      .order('team_name', { ascending: true })
      .order('name', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error(`Erro ao carregar jogadores: ${error.message}`)
      process.exit(1)
    }

    data.push(...(page ?? []))
    if (!page || page.length < pageSize) break
  }

  const counts = new Map()
  const rawNames = new Map()
  const samples = new Map()

  for (const player of data ?? []) {
    const canonical = canonicalTeam(player.team_name)
    counts.set(canonical, (counts.get(canonical) ?? 0) + 1)

    const names = rawNames.get(canonical) ?? new Set()
    names.add(player.team_name || '(sem time)')
    rawNames.set(canonical, names)

    const currentSamples = samples.get(canonical) ?? []
    if (currentSamples.length < 4) currentSamples.push(player.name)
    samples.set(canonical, currentSamples)
  }

  console.log(`Auditoria dos elencos (${WORLD_CUP_2026_COUNTRIES.length} selecoes)`)
  console.log(`Minimo esperado por selecao: ${MIN_EXPECTED_PLAYERS}\n`)
  console.log(`${pad('Status', 8)} ${pad('Qtd', 4)} ${pad('Selecao', 28)} Nomes no banco`)
  console.log(`${'-'.repeat(8)} ${'-'.repeat(4)} ${'-'.repeat(28)} ${'-'.repeat(40)}`)

  const problemTeams = []
  for (const team of WORLD_CUP_2026_COUNTRIES) {
    const count = counts.get(team) ?? 0
    const status = statusFor(count)
    const names = Array.from(rawNames.get(team) ?? []).join(', ') || '-'

    if (status !== 'OK') problemTeams.push(team)
    console.log(`${pad(status, 8)} ${pad(count, 4)} ${pad(team, 28)} ${names}`)
  }

  const officialSet = new Set(WORLD_CUP_2026_COUNTRIES)
  const unexpected = Array.from(counts.keys()).filter((team) => !officialSet.has(team)).sort()

  if (unexpected.length > 0) {
    console.log('\nTimes no banco fora da lista das 48:')
    for (const team of unexpected) {
      const names = Array.from(rawNames.get(team) ?? []).join(', ')
      console.log(`- ${team}: ${counts.get(team)} jogadores (${names})`)
    }
  }

  if (problemTeams.length > 0) {
    console.log('\nSelecoes que precisam de sincronizacao:')
    console.log(problemTeams.map((team) => `"${team}"`).join(' '))
  } else {
    console.log('\nTodas as 48 selecoes tem elenco minimo carregado.')
  }
}

run().catch((error) => {
  console.error('Erro fatal:', error.message)
  process.exit(1)
})
