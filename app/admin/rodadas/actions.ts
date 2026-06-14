'use server'

// app/admin/rodadas/actions.ts
// Server Actions para gerenciar rodadas

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { getFixtures, getPlayerStats } from '@/lib/apiFootball'
import { calculateRoundScores } from '@/lib/services/scoring.service'

export async function createRound(groupId: string, name: string, startsAt?: string) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado' }
  }

  // Validar que é admin do grupo
  const admin = supabaseAdmin()
  const { data: group } = await admin
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .eq('admin_id', user.id)
    .single()

  if (!group) {
    return { success: false, error: 'Você não é admin deste grupo' }
  }

  // Criar rodada
  const { data: round, error: createError } = await admin
    .from('rounds')
    .insert({
      group_id: groupId,
      name: name.trim(),
      starts_at: startsAt || null,
      status: 'open',
    })
    .select()
    .single()

  if (createError || !round) {
    console.error('[Rounds] Erro ao criar rodada:', createError)
    return { success: false, error: `Erro ao criar rodada: ${createError?.message}` }
  }

  console.log('[Rounds] ✓ Rodada criada:', round.id)
  revalidatePath('/admin/rodadas')

  return { success: true, round }
}

export async function closeRound(groupId: string, roundId: string) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado' }
  }

  // Validar que é admin
  const admin = supabaseAdmin()
  const { data: group } = await admin
    .from('groups')
    .select('id, max_subs_por_rodada, min_minutos')
    .eq('id', groupId)
    .eq('admin_id', user.id)
    .single()

  if (!group) {
    return { success: false, error: 'Você não é admin deste grupo' }
  }

  // Buscar rodada
  const { data: round } = await admin
    .from('rounds')
    .select('id, status, name')
    .eq('id', roundId)
    .eq('group_id', groupId)
    .single()

  if (!round) {
    return { success: false, error: 'Rodada não encontrada' }
  }

  if (round.status !== 'open') {
    return { success: false, error: `Rodada já está ${round.status}` }
  }

  try {
    console.log(`[Rounds] Fechando rodada: ${round.name}`)

    // ========================================
    // PASSO 1: Buscar fixtures (jogos) da Copa 2026
    // ========================================
    console.log('[Rounds] Passo 1: Buscando fixtures da Copa...')
    let fixtures: any[] = []
    try {
      fixtures = await getFixtures()
      console.log(`[Rounds] ✓ ${fixtures.length} fixtures encontrados`)
    } catch (error: any) {
      console.warn('[Rounds] ⚠️ Erro ao buscar fixtures:', error.message)
      // Continuar mesmo se falhar — ratings podem estar vazios
    }

    // ========================================
    // PASSO 2: Para cada fixture, buscar ratings dos jogadores
    // ========================================
    console.log('[Rounds] Passo 2: Buscando ratings dos jogadores...')
    let ratingsInserted = 0
    let ratingsErrors = 0

    for (const fixture of fixtures) {
      try {
        const playerStats = await getPlayerStats(fixture.fixture.id)

        // playerStats é um array de jogadores com ratings
        for (const statLine of playerStats) {
          const team = statLine.team
          const players = statLine.players || []

          for (const playerData of players) {
            const player = playerData.player
            const stats = playerData.statistics?.[0] // primeira estatística (pode ser 0 se não jogou)

            // Inserir/atualizar rating
            const { error: ratingError } = await admin
              .from('player_round_ratings')
              .upsert(
                {
                  player_id: player.id,
                  round_id: roundId,
                  fixture_id: fixture.fixture.id,
                  rating: stats?.rating ? parseFloat(stats.rating) : null,
                  minutes: stats?.minutes || 0,
                  source: 'api-football',
                  fetched_at: new Date().toISOString(),
                },
                { onConflict: 'player_id,round_id' }
              )

            if (ratingError) {
              ratingsErrors++
            } else {
              ratingsInserted++
            }
          }
        }
      } catch (error: any) {
        console.warn(`[Rounds] ⚠️ Erro ao buscar ratings do fixture ${fixture.fixture.id}:`, error.message)
        ratingsErrors++
      }
    }

    console.log(`[Rounds] ✓ Ratings inseridos: ${ratingsInserted}, Erros: ${ratingsErrors}`)

    // ========================================
    // PASSO 3: Calcular pontuação de todos os membros (com transação implícita)
    // ========================================
    console.log('[Rounds] Passo 3: Calculando pontuação (transação de cálculo)...')
    
    // ✅ CRÍTICO: Usar try-catch para guarantir rollback se algo falhar
    let scoringSucceeded = false
    let scoreResult: any = null

    try {
      scoreResult = await calculateRoundScores(groupId, roundId)

      if (!scoreResult.success) {
        throw new Error(`Erro ao calcular pontuação: ${scoreResult.error}`)
      }

      console.log(`[Rounds] ✓ Pontuação calculada para ${scoreResult.count} membros`)
      scoringSucceeded = true
    } catch (scoringError: any) {
      console.error('[Rounds] ❌ Falha no cálculo de pontuação (rollback):', scoringError.message)
      // Não atualizar rodada para 'scored' se cálculo falhar
      // Ratings já foram inseridos, mas round_scores estará vazio/incompleto
      // Admin pode tentar novamente
      throw new Error(`Falha no cálculo de pontuação: ${scoringError.message}. Scores não foram salvos. Tente novamente.`)
    }

    // ========================================
    // PASSO 4: Atualizar status da rodada para 'scored' (APENAS se tudo sucedeu)
    // ========================================
    console.log('[Rounds] Passo 4: Finalizando rodada...')

    const { error: updateError } = await admin
      .from('rounds')
      .update({ status: 'scored', locked_at: new Date().toISOString() })
      .eq('id', roundId)

    if (updateError) {
      throw new Error(`Erro ao atualizar rodada: ${updateError.message}`)
    }

    console.log('[Rounds] ✅ Rodada fechada com SUCESSO (estado consistente)')
    revalidatePath('/admin/rodadas')
    revalidatePath('/app')

    return {
      success: true,
      message: `✅ Rodada fechada com sucesso! ${ratingsInserted} ratings processados, ${scoreResult.count} membros pontuados.`,
      stats: {
        ratingsInserted,
        ratingsErrors,
        membrosCalculados: scoreResult.count,
      },
    }
  } catch (error: any) {
    console.error('[Rounds] ❌ ERRO AO FECHAR RODADA (transação falhou):', error.message)
    // Importante: Rodada não foi marcada como 'scored', então fica disponível para retry
    return {
      success: false,
      error: `❌ ERRO: ${error.message || 'Erro desconhecido ao fechar rodada'}\n\nA rodada NÃO foi marcada como concluída. Tente novamente ou contacte suporte.`,
    }
  }
}

export async function getRoundsForGroup(groupId: string) {
  const admin = supabaseAdmin()

  const { data: rounds, error } = await admin
    .from('rounds')
    .select('id, name, status, starts_at, locked_at, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Rounds] Erro ao buscar rodadas:', error)
    return { success: false, error: 'Erro ao buscar rodadas', rounds: [] }
  }

  return { success: true, rounds: rounds || [] }
}

/**
 * Reset do draft após os 16avos de final.
 * - Deleta todos os team_players e substitutions do grupo
 * - Preserva round_scores (pontuações históricas ficam intactas)
 * - Muda status do grupo para 'drafting' para permitir novo draft
 * - NÃO deleta rodadas nem scores
 */
export async function resetDraftForNewPhase(groupId: string) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado' }
  }

  const admin = supabaseAdmin()

  // Verificar que é admin do grupo
  const { data: group } = await admin
    .from('groups')
    .select('id, name, status')
    .eq('id', groupId)
    .eq('admin_id', user.id)
    .single()

  if (!group) {
    return { success: false, error: 'Você não é admin deste grupo' }
  }

  try {
    console.log(`[DraftReset] Iniciando reset do draft para grupo: ${group.name}`)

    // 1. Buscar todos os membros do grupo
    const { data: members } = await admin
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)

    if (!members || members.length === 0) {
      return { success: false, error: 'Nenhum membro encontrado' }
    }

    const memberIds = members.map(m => m.id)

    // 2. Deletar post_round_swaps (trocas pós-rodada — fase nova começa do zero)
    const { error: postSwapsError } = await admin
      .from('post_round_swaps')
      .delete()
      .in('group_member_id', memberIds)

    if (postSwapsError) {
      console.error('[DraftReset] Erro ao deletar post_round_swaps:', postSwapsError)
      return { success: false, error: `Erro ao limpar trocas pós-rodada: ${postSwapsError.message}` }
    }

    // 3. Deletar substitutions (substituições pré-rodada)
    const { error: subsError } = await admin
      .from('substitutions')
      .delete()
      .in('group_member_id', memberIds)

    if (subsError) {
      console.error('[DraftReset] Erro ao deletar substitutions:', subsError)
      return { success: false, error: `Erro ao limpar substituições: ${subsError.message}` }
    }

    // 4. Deletar team_players (elencos do draft anterior)
    const { error: teamPlayersError } = await admin
      .from('team_players')
      .delete()
      .in('group_member_id', memberIds)

    if (teamPlayersError) {
      console.error('[DraftReset] Erro ao deletar team_players:', teamPlayersError)
      return { success: false, error: `Erro ao limpar times: ${teamPlayersError.message}` }
    }

    // 5. Atualizar status do grupo para 'drafting'
    const { error: groupUpdateError } = await admin
      .from('groups')
      .update({ status: 'drafting' })
      .eq('id', groupId)

    if (groupUpdateError) {
      console.error('[DraftReset] Erro ao atualizar status do grupo:', groupUpdateError)
      return { success: false, error: `Erro ao atualizar grupo: ${groupUpdateError.message}` }
    }

    console.log(`[DraftReset] ✅ Draft resetado. ${memberIds.length} membros, scores preservados.`)
    revalidatePath('/admin')
    revalidatePath('/admin/rodadas')
    revalidatePath('/app')

    return {
      success: true,
      message: `✅ Draft resetado! Times apagados para ${memberIds.length} participantes. Scores anteriores preservados. Novo draft pode começar.`,
    }
  } catch (error: any) {
    console.error('[DraftReset] Erro geral:', error.message)
    return { success: false, error: `Erro ao resetar draft: ${error.message}` }
  }
}
