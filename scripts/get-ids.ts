import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
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
