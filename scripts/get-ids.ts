import { createClient } from '@supabase/supabase-js'

const url = 'https://doynzpekofzfrzhfogkw.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveW56cGVrb2Z6ZnJ6aGZvZ2t3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA1NDc2MiwiZXhwIjoyMDk2NjMwNzYyfQ.sVfzDkLJKBaf7AauJY4RkG0TJ_6xX6vz9af06i2g90M'
const supabase = createClient(url, key)

async function getIds() {
  try {
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(1)

    if (groupsError || !groups || groups.length === 0) {
      console.error('❌ Erro ao buscar grupos:', groupsError?.message || 'Nenhum grupo encontrado')
      process.exit(1)
    }

    const group = groups[0]
    console.log(`\n📌 Grupo encontrado: ${group.name} (ID: ${group.id})`)

    const { data: rounds, error: roundsError } = await supabase
      .from('rounds')
      .select('id, name, status')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (roundsError || !rounds || rounds.length === 0) {
      console.error('❌ Erro ao buscar rodadas:', roundsError?.message || 'Nenhuma rodada encontrada')
      process.exit(1)
    }

    const round = rounds[0]
    console.log(`📍 Rodada encontrada: ${round.name} (ID: ${round.id}, Status: ${round.status})`)
    console.log(`\n✅ Use esses IDs no comando:`)
    console.log(`npx ts-node scripts/seed-round1-ratings.ts "${group.id}" "${round.id}"\n`)
  } catch (err: any) {
    console.error('❌ Erro:', err.message)
    process.exit(1)
  }
}

getIds()
