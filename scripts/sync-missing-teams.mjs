import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Times que precisam de sincronização (Rodada 1)
const TEAMS_TO_SYNC = ['Catar', 'Suíça', 'Marrocos', 'Brasil', 'Haiti', 'Escócia', 'Austrália', 'Turquia', 'Alemanha', 'Curaçao', 'Holanda', 'Japão', 'Costa do Marfim', 'Equador']

async function syncTeams() {
  console.log('🚀 Sincronizando times que faltam...\n')
  console.log(`📍 Times a sincronizar: ${TEAMS_TO_SYNC.join(', ')}\n`)

  // Aqui você chamaria a API-Football para buscar os squads
  // Exemplo (requer API_FOOTBALL_KEY):

  console.log('⚠️  ATENÇÃO: Sincronização da API-Football requer API_FOOTBALL_KEY')
  console.log('💡 Alternativa: Execute manualmente:')
  console.log('   1. Vá para http://localhost:3000/api/sync-offline')
  console.log('   2. OU abra http://localhost:3000/api/sync-check para ver quantas requisições fará')
  console.log(`\n📍 Times que precisam estar no banco para as notas funcionarem:`)
  TEAMS_TO_SYNC.forEach(team => console.log(`   • ${team}`))

  process.exit(0)
}

syncTeams()
