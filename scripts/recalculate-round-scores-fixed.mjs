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
      try {
        console.log(`  📊 ${member.display_name}...`)

        // Buscar draft do membro (os 16 jogadores que pegou)
        // member.id é group_member_id (de group_members)
        const { data: draft, error: draftError } = await supabase
          .from('team_players')
          .select('player_id, slot')
          .eq('group_member_id', member.id)

        if (draftError || !draft || draft.length === 0) {
          console.log(`    ⚠️  Sem draft`)
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
          console.log(`    ❌ Erro ao buscar ratings`)
          continue
        }

        const { data: substitutions } = await supabase
          .from('substitutions')
          .select('out_player_id, in_player_id')
          .eq('group_member_id', member.id)
          .eq('round_id', ROUND_ID)

        const { data: postRoundSwaps } = await supabase
          .from('post_round_swaps')
          .select('out_player_id, in_player_id')
          .eq('group_member_id', member.id)
          .eq('round_id', ROUND_ID)

        const substitutionsMap = new Map((substitutions || []).map(s => [s.out_player_id, s.in_player_id]))
        const postRoundSwapsMap = new Map((postRoundSwaps || []).map(s => [s.out_player_id, s.in_player_id]))

        // Calcular score dos 11 titulares (slot='starter')
        let totalScore = 0
        let playersScored = 0

        for (const player of draft) {
          if (player.slot !== 'starter') continue // Só conta titulares

          const preSubPlayerId = substitutionsMap.get(player.player_id) ?? player.player_id
          const effectivePlayerId = postRoundSwapsMap.get(preSubPlayerId) ?? preSubPlayerId
          const rating = ratings.find(r => r.player_id === effectivePlayerId)
          const playerRating = Number(rating?.rating)
          if (!Number.isFinite(playerRating)) continue

          // Só considera quem jogou mais de 20 minutos
          if (rating.minutes >= 20) {
            totalScore += playerRating
            playersScored++
          }
        }

        if (playersScored === 0) {
          console.log(`    ⚠️  Nenhum jogador com rating >= 20 minutos`)
          continue
        }

        // Soma das notas dos titulares validos
        const roundScore = totalScore.toFixed(2)

        // Upsert no round_scores
        // Schema: group_member_id, round_id, base_points, bonus_points, total_points
        const { error: scoreError } = await supabase
          .from('round_scores')
          .upsert(
            {
              group_member_id: member.id,
              round_id: ROUND_ID,
              base_points: parseFloat(roundScore),
              bonus_points: 0,
              total_points: parseFloat(roundScore),
              computed_at: new Date().toISOString(),
            },
            { onConflict: 'group_member_id,round_id' }
          )

        if (!scoreError) {
          console.log(`    ✓ ${roundScore} pts (${playersScored} titulares)`)
          totalMembersScored++
        } else {
          console.log(`    ❌ ${scoreError.message}`)
          totalErrors++
        }
      } catch (err) {
        console.log(`    ❌ ${err.message}`)
        totalErrors++
      }
    }

    // 3. Atualizar status da rodada para 'scored'
    console.log('\n📝 Atualizando status da rodada...')
    const { error: roundError } = await supabase
      .from('rounds')
      .update({ status: 'scored' })
      .eq('id', ROUND_ID)

    if (roundError) {
      console.log(`  ⚠️  Erro ao atualizar rodada: ${roundError.message}`)
    } else {
      console.log(`  ✓ Rodada marcada como "scored"`)
    }

    console.log(`\n✅ Cálculo concluído!`)
    console.log(`  • Membros com score: ${totalMembersScored}`)
    console.log(`  • Erros: ${totalErrors}`)

    process.exit(0)
  } catch (err) {
    console.error('❌ Erro fatal:', err.message)
    process.exit(1)
  }
}

calculateRoundScores()
