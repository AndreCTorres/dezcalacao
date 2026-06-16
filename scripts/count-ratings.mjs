import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const roundId = 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae'

const { count, error } = await supabase
  .from('player_round_ratings')
  .select('*', { count: 'exact', head: true })
  .eq('round_id', roundId)

if (error) {
  console.error('Erro:', error)
} else {
  console.log(`✅ Ratings inseridos nessa rodada: ${count}`)
}

process.exit(0)
