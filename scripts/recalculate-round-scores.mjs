import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// IDs do projeto
const GROUP_ID = '15497f7b-d85d-4ade-9a39-2539f39f5742'
const ROUND_ID = 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae'

async function calculateRoundScores() {
  console.log('🚀 Iniciando cálculo de pontuação para Rodada 1...\n')

  try {
    // 1. Buscar todos os membros do grupo
    console.log('📋 Buscando membros do grupo...')
    const { data: members, error: membersError } = await supabase
      .from('group_members')
      .select('id, profile_id, display_name')
      .eq('group_id', GROUP_ID)

    if (membersError || !members) {
      console.error('❌ Erro ao buscar membros:', membersError)
      process.exit(1)
    }

    console.log(`  ✓ ${members.length} membros encontrados\n`)

    // 2. Para cada membro, calcular seu score
    let totalMembersScored = 0
    let totalErrors = 0

    for (const member of members) {
      if (!member.profile_id) {
        console.log(`  ⚠️  ${member.display_name} - sem profile_id`)
        continue
      }

      try {
        // Buscar draft do membro (os 16 jogadores que pegou)
        const { data: draft, error: draftError } = await supabase
          .from('team_players')
          .select('player_id, slot')
          .eq('group_id', GROUP_ID)
          .eq('member_id', member.id)

        if (draftError || !draft) {
          console.log(`  ⚠️  ${member.display_name} - erro ao buscar draft`)
          continue
        }

        if (draft.length === 0) {
          console.log(`  ⚠️  ${member.display_name} - nenhum jogador no draft`)
          continue
        }

        // Buscar notas dos jogadores desta rodada
        const playerIds = draft.map(d => d.player_id)
        const { data: ratings, error: ratingsError } = await supabase
          .from('player_round_ratings')
          .select('player_id, rating, minutes')
          .eq('round_id', ROUND_ID)
          .in('player_id', playerIds)

        if (ratingsError) {
          console.log(`  ❌ ${member.display_name} - erro ao buscar ratings`)
          continue
        }

        // Calcular score dos 11 titulares
        let totalScore = 0
        let totalMinutes = 0
        let playersScored = 0

        for (const player of draft) {
          if (player.slot !== 'starter') continue // Só conta titulares

          const rating = ratings.find(r => r.player_id === player.player_id)
          if (!rating) continue // Sem rating (talvez não tenha jogado)

          // Só considera quem jogou mais de 20 minutos
          if (rating.minutes >= 20) {
            totalScore += rating.rating
            totalMinutes += rating.minutes
            playersScored++
          }
        }

        // Calcular média
        const avgScore = playersScored > 0 ? (totalScore / playersScored).toFixed(2) : '0.00'

        // Upsert no round_scores
        const { error: scoreError } = await supabase
          .from('round_scores')
          .upsert(
            {
              round_id: ROUND_ID,
              group_id: GROUP_ID,
              member_id: member.id,
              total_points: parseFloat(avgScore),
              players_rated: playersScored,
              status: 'calculated',
              calculated_at: new Date().toISOString(),
            },
            { onConflict: 'round_id,group_id,member_id' }
          )

        if (!scoreError) {
          console.log(`  ✓ ${member.display_name}: ${avgScore} pts (${playersScored} jogadores)`)
          totalMembersScored++
        } else {
          console.log(`  ❌ ${member.display_name}: ${scoreError.message}`)
          totalErrors++
        }
      } catch (err) {
        console.log(`  ❌ ${member.display_name}: ${err.message}`)
        totalErrors++
      }
    }

    // 3. Atualizar status da rodada para 'scored'
    console.log('\n📝 Atualizando status da rodada...')
    const { error: roundError } = await supabase
      .from('rounds')
      .update({ status: 'scored', scored_at: new Date().toISOString() })
      .eq('id', ROUND_ID)

    if (roundError) {
      console.log(`  ⚠️  Erro ao atualizar rodada: ${roundError.message}`)
    } else {
      console.log(`  ✓ Rodada marcada como "scored"`)
    }

    console.log(`\n✅ Cálculo concluído!`)
    console.log(`  • Membros com score calculado: ${totalMembersScored}`)
    console.log(`  • Erros: ${totalErrors}`)

    process.exit(0)
  } catch (err) {
    console.error('❌ Erro fatal:', err.message)
    process.exit(1)
  }
}

calculateRoundScores()
