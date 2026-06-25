import { createClient } from '@supabase/supabase-js'
import nextEnv from '@next/env'
import { WORLD_CUP_2026_COUNTRIES } from './world-cup-teams.mjs'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const DEFAULT_TEAMS = WORLD_CUP_2026_COUNTRIES
const DEFAULT_NAMES = [
  'afif',
  'embolo',
  'xhaka',
  'kobel',
  'bounou',
  'bono',
  'cakir',
  'guler',
  'gyokeres',
  'isak',
  'lindelof',
  'elanga',
  'gakpo',
  'verbruggen',
  'cacace',
  'stamenic',
  'boxall',
  'crocombe',
  'paulsen',
  'wood',
  'rufer',
  'yamal',
  'pedri',
  'olmo',
  'cucurella',
]

function argsOrDefault(defaultValues) {
  const args = process.argv.slice(2).map((arg) => arg.trim()).filter(Boolean)
  return args.length > 0 ? args : defaultValues
}

async function countTeam(teamName) {
  const { count, error } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .ilike('team_name', teamName)

  if (error) return { teamName, error: error.message, count: null }
  return { teamName, count, error: null }
}

async function run() {
  const teams = argsOrDefault(DEFAULT_TEAMS)

  console.log('Checando elencos no banco...\n')

  for (const team of teams) {
    const result = await countTeam(team)
    if (result.error) {
      console.log(`${team}: ERRO - ${result.error}`)
    } else {
      console.log(`${team}: ${result.count} jogadores`)
    }
  }

  console.log('\nBusca ampla por nomes esperados:')
  for (const name of DEFAULT_NAMES) {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, team_name, position')
      .ilike('name', `%${name}%`)
      .limit(10)

    if (error) {
      console.log(`${name}: ERRO - ${error.message}`)
      continue
    }

    if (!data || data.length === 0) {
      console.log(`${name}: nenhum jogador encontrado`)
      continue
    }

    console.log(`\n${name}:`)
    for (const player of data) {
      console.log(`  ${player.id} | ${player.team_name} | ${player.position} | ${player.name}`)
    }
  }
}

run().catch((error) => {
  console.error('Erro fatal:', error.message)
  process.exit(1)
})
