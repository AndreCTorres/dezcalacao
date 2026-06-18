import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const teams = ['Qatar', 'Catar', 'Switzerland', 'Suica', 'Suíça']
const sampleNames = ['abunada', 'khoukhi', 'miguel', 'madibo', 'afif', 'embolo', 'xhaka', 'kobel']

async function countExactTeam(teamName) {
  const { count, error } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('team_name', teamName)

  if (error) return { teamName, error: error.message, count: null }
  return { teamName, count, error: null }
}

async function run() {
  console.log('Checando elencos no banco...\n')

  for (const team of teams) {
    const result = await countExactTeam(team)
    if (result.error) {
      console.log(`${team}: ERRO - ${result.error}`)
    } else {
      console.log(`${team}: ${result.count} jogadores`)
    }
  }

  console.log('\nBusca ampla por nomes esperados:')
  for (const name of sampleNames) {
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
