'use server'

// app/admin/rodadas/[roundId]/actions.ts
// Server Actions para gerenciamento manual de ratings por rodada

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { calculateRoundScores } from '@/lib/services/scoring.service'

/**
 * Criar um fixture manual vinculado a uma rodada
 * (sem depender da API-Football — admin registra os jogos manualmente)
 */
export async function createManualFixture(
  roundId: string,
  homeTeam: string,
  awayTeam: string,
  label?: string
) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Não autenticado' }

  const admin = supabaseAdmin()
  const cleanHome = homeTeam.trim()
  const cleanAway = awayTeam.trim()
  const cleanLabel = label?.trim()

  if (!cleanHome || !cleanAway) {
    return { success: false, error: 'Informe as duas selecoes' }
  }

  // Validar que a rodada pertence a um grupo do qual o user é admin
  const { data: round } = await admin
    .from('rounds')
    .select('id, group_id, groups!inner(admin_id)')
    .eq('id', roundId)
    .single()

  if (!round || (round.groups as any).admin_id !== user.id) {
    return { success: false, error: 'Sem permissão' }
  }

  // Gerar um ID único para o fixture manual (usa timestamp + random para evitar colisão)
  const manualId = Date.now() * 1000 + Math.floor(Math.random() * 1000)

  const { data: fixture, error } = await admin
    .from('fixtures')
    .insert({
      id: manualId,
      round_id: roundId,
      home_team: cleanHome,
      away_team: cleanAway,
      label: cleanLabel || `${cleanHome} x ${cleanAway}`,
      status: 'FT',
    })
    .select()
    .single()

  if (error) {
    console.error('[ManualRatings] Erro ao criar fixture:', error)
    return { success: false, error: error.message }
  }

  const { data: roundFixtures } = await admin
    .from('fixtures')
    .select('id')
    .eq('round_id', roundId)

  const fixtureIds = (roundFixtures ?? []).map((f: any) => f.id)
  await admin
    .from('rounds')
    .update({
      fixture_ids: fixtureIds,
      fixtures_total: fixtureIds.length,
      fixtures_done: fixtureIds.length,
    })
    .eq('id', roundId)

  revalidatePath(`/admin/rodadas/${roundId}`)
  revalidatePath('/admin/rodadas')
  return { success: true, fixture }
}

/**
 * Upsert de rating manual de um jogador em uma rodada
 * Usado pelo admin ao digitar as notas do Sofascore/FotMob
 */
export async function upsertPlayerRating(
  roundId: string,
  playerId: number,
  rating: number | null,
  minutes: number,
  fixtureId?: number
) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Não autenticado' }

  const admin = supabaseAdmin()

  // Validar que a rodada pertence a grupo administrado pelo user
  const { data: round } = await admin
    .from('rounds')
    .select('id, group_id, groups!inner(admin_id)')
    .eq('id', roundId)
    .single()

  if (!round || (round.groups as any).admin_id !== user.id) {
    return { success: false, error: 'Sem permissão' }
  }

  // Validar rating (0-10, duas casas decimais)
  if (rating !== null && (rating < 0 || rating > 10)) {
    return { success: false, error: 'Nota deve ser entre 0 e 10' }
  }

  const { error } = await admin
    .from('player_round_ratings')
    .upsert(
      {
        player_id: playerId,
        round_id: roundId,
        fixture_id: fixtureId ?? null,
        rating: rating !== null ? parseFloat(rating.toFixed(2)) : null,
        minutes,
        source: 'manual',
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'player_id,round_id' }
    )

  if (error) {
    console.error('[ManualRatings] Erro ao upsert rating:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/admin/rodadas/${roundId}`)
  revalidatePath('/app')
  return { success: true }
}

/**
 * Upsert em batch — recebe um array de ratings do mesmo jogo
 * Mais eficiente que chamar upsertPlayerRating N vezes
 */
export async function upsertBatchRatings(
  roundId: string,
  fixtureId: number,
  ratings: Array<{ playerId: number; rating: number | null; minutes: number }>
) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Não autenticado' }

  const admin = supabaseAdmin()

  // Validar permissão
  const { data: round } = await admin
    .from('rounds')
    .select('id, group_id, groups!inner(admin_id)')
    .eq('id', roundId)
    .single()

  if (!round || (round.groups as any).admin_id !== user.id) {
    return { success: false, error: 'Sem permissão' }
  }

  for (const r of ratings) {
    if (r.rating !== null && (r.rating < 0 || r.rating > 10)) {
      return { success: false, error: 'Notas devem estar entre 0 e 10' }
    }
    if (r.minutes < 0 || r.minutes > 120) {
      return { success: false, error: 'Minutos devem estar entre 0 e 120' }
    }
  }

  const rows = ratings.map((r) => ({
    player_id: r.playerId,
    round_id: roundId,
    fixture_id: fixtureId,
    rating: r.rating !== null ? parseFloat(r.rating.toFixed(2)) : null,
    minutes: r.minutes,
    source: 'manual' as const,
    fetched_at: new Date().toISOString(),
  }))

  const { error } = await admin
    .from('player_round_ratings')
    .upsert(rows, { onConflict: 'player_id,round_id' })

  if (error) {
    console.error('[ManualRatings] Erro no batch upsert:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/admin/rodadas/${roundId}`)
  revalidatePath('/app')
  return { success: true, inserted: rows.length }
}

/**
 * Recalcular pontuação da rodada após inserir/editar ratings
 * Chama o motor de scoring já existente
 */
export async function recalculateRound(groupId: string, roundId: string) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Não autenticado' }

  const admin = supabaseAdmin()

  // Validar que é admin do grupo
  const { data: group } = await admin
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .eq('admin_id', user.id)
    .single()

  if (!group) return { success: false, error: 'Sem permissão' }

  try {
    const result = await calculateRoundScores(groupId, roundId)
    if (!result.success) return { success: false, error: result.error }

    revalidatePath(`/admin/rodadas/${roundId}`)
    revalidatePath('/admin/rodadas')
    revalidatePath('/app')

    return { success: true, membrosCalculados: result.count }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
