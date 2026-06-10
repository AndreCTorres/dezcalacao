'use server'

// app/admin/rodadas/actions.ts
// Server Actions para gerenciar rodadas

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { getFixtures, getPlayerStats } from '@/lib/apiFootball'
import { calculateRoundScores } from '@/lib/services/scoring.service'

export async function createRound(groupId: string, name: string, startsAt?: string) {
  const supabase = createActionClient()
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
  const supabase = createActionClient()
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
    // PASSO 3: Calcular pontuação de todos os membros
    // ========================================
    console.log('[Rounds] Passo 3: Calculando pontuação...')
    const scoreResult = await calculateRoundScores(groupId, roundId)

    if (!scoreResult.success) {
      throw new Error(`Erro ao calcular pontuação: ${scoreResult.error}`)
    }

    console.log(`[Rounds] ✓ Pontuação calculada para ${scoreResult.count} membros`)

    // ========================================
    // PASSO 4: Atualizar status da rodada para 'scored'
    // ========================================
    const { error: updateError } = await admin
      .from('rounds')
      .update({ status: 'scored', locked_at: new Date().toISOString() })
      .eq('id', roundId)

    if (updateError) {
      throw new Error(`Erro ao atualizar rodada: ${updateError.message}`)
    }

    console.log('[Rounds] ✓ Rodada fechada com sucesso')
    revalidatePath('/admin/rodadas')
    revalidatePath('/app')

    return {
      success: true,
      message: `Rodada fechada! ${ratingsInserted} ratings processados, ${scoreResult.count} membros pontuados.`,
      stats: {
        ratingsInserted,
        ratingsErrors,
        membrosCalculados: scoreResult.count,
      },
    }
  } catch (error: any) {
    console.error('[Rounds] ❌ Erro ao fechar rodada:', error.message)
    return {
      success: false,
      error: error.message || 'Erro ao fechar rodada',
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
