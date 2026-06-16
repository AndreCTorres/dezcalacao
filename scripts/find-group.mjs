import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(url, key)

const roundId = 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae'

async function findGroup() {
  try {
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('id, name, group_id')
      .eq('id', roundId)
      .single()

    if (roundError) {
      console.error('❌ Erro ao buscar rodada:', roundError.message)
      process.exit(1)
    }

    if (!round) {
      console.error('❌ Rodada não encontrada:', roundId)
      process.exit(1)
    }

    const groupId = round.group_id

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', groupId)
      .single()

    if (groupError) {
      console.error('❌ Erro ao buscar grupo:', groupError.message)
      process.exit(1)
    }

    console.log(`✅ Rodada: ${round.name}`)
    console.log(`   ID: ${round.id}`)
    console.log(`✅ Grupo: ${group.name}`)
    console.log(`   ID: ${group.id}`)
    console.log(`\n🚀 Execute:`)
    console.log(`npx ts-node scripts/seed-round1-ratings.ts "${group.id}" "${round.id}"`)

    process.exit(0)
  } catch (err) {
    console.error('❌ Erro:', err.message)
    process.exit(1)
  }
}

findGroup()
