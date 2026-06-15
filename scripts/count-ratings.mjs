import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://doynzpekofzfrzhfogkw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveW56cGVrb2Z6ZnJ6aGZvZ2t3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA1NDc2MiwiZXhwIjoyMDk2NjMwNzYyfQ.sVfzDkLJKBaf7AauJY4RkG0TJ_6xX6vz9af06i2g90M'
)

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
