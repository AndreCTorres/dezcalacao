'use server'

// app/app/post-round-actions.ts
// Server Actions para substituições pós-rodada:
// Participante vê as notas e pode trocar até 3 reservas que pontuaram melhor que titulares.
// Ao confirmar, o score da rodada é recalculado com as trocas aplicadas.

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { calculateMemberRoundScore } from '@/lib/services/scoring.service'

export type PostRoundPlayer = {
  id: string
  player_id: number
  slot: 'starter' | 'bench'
  position_slot: string
  name: string
  team_name: string
  photo_url: string | null
  rating: number | null
  minutes: number | null
}

export type PostRoundSwap = {
  outPlayerId: number
  inPlayerId: number
  positionSlot: string
}

/**
 * Busca os dados necessários para a tela de substituição pós-rodada:
 * - Rodada mais recente com status 'scored'
 * - Time do membro (titulares + reservas) com as notas dessa rodada
 * - Substituições já feitas nessa rodada (pré-rodada)
 * - Trocas pós-rodada já confirmadas
 */
export async function getPostRoundData(groupMemberId: string) {
  const admin = supabaseAdmin()

  try {
    // Buscar o grupo do membro
    const { data: member } = await admin
      .from('group_members')
      .select('id, group_id, display_name')
      .eq('id', groupMemberId)
      .single()

    if (!member) return { success: false, error: 'Membro não encontrado' }

    // Buscar rodada mais recente com status 'scored'
    const { data: round } = await admin
      .from('rounds')
      .select('id, name, status')
      .eq('group_id', member.group_id)
      .eq('status', 'scored')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!round) {
      return { success: false, error: 'Nenhuma rodada pontuada disponível', round: null }
    }

    // Buscar configuração do grupo
    const { data: group } = await admin
      .from('groups')
      .select('max_subs_por_rodada, min_minutos')
      .eq('id', member.group_id)
      .single()

    if (!group) return { success: false, error: 'Grupo não encontrado' }

    // Buscar todos os jogadores do time
    const { data: teamPlayers } = await admin
      .from('team_players')
      .select(`
        id,
        player_id,
        slot,
        position_slot,
        players (
          id,
          name,
          team_name,
          photo_url
        )
      `)
      .eq('group_member_id', groupMemberId)

    if (!teamPlayers) return { success: false, error: 'Time não encontrado' }

    const playerIds = teamPlayers.map((tp: any) => tp.player_id)

    // Buscar ratings dessa rodada para todos os jogadores
    const { data: ratings } = await admin
      .from('player_round_ratings')
      .select('player_id, rating, minutes')
      .eq('round_id', round.id)
      .in('player_id', playerIds)

    const ratingsMap = new Map<number, { rating: number | null; minutes: number | null }>()
    ;(ratings || []).forEach((r: any) => {
      ratingsMap.set(r.player_id, { rating: r.rating, minutes: r.minutes })
    })

    // Buscar trocas pós-rodada já confirmadas para essa rodada
    const { data: confirmedSwaps } = await admin
      .from('post_round_swaps')
      .select('id, out_player_id, in_player_id, position_slot')
      .eq('group_member_id', groupMemberId)
      .eq('round_id', round.id)

    // Montar lista de jogadores com ratings
    const players: PostRoundPlayer[] = teamPlayers.map((tp: any) => {
      const r = ratingsMap.get(tp.player_id)
      return {
        id: tp.id,
        player_id: tp.player_id,
        slot: tp.slot,
        position_slot: tp.position_slot,
        name: tp.players?.name || 'Desconhecido',
        team_name: tp.players?.team_name || '',
        photo_url: tp.players?.photo_url || null,
        rating: r?.rating ?? null,
        minutes: r?.minutes ?? null,
      }
    })

    return {
      success: true,
      round,
      players,
      confirmedSwaps: confirmedSwaps || [],
      maxSwaps: 3, // fixo: 3 trocas pós-rodada
    }
  } catch (error: any) {
    console.error('[PostRound] Erro ao buscar dados:', error.message)
    return { success: false, error: 'Erro ao carregar dados' }
  }
}

/**
 * Confirma as trocas pós-rodada e recalcula o score do membro.
 * Validações:
 * - Membro autenticado
 * - Rodada com status 'scored'
 * - Máximo de 3 trocas
 * - Reserva deve ter nota melhor que o titular trocado
 * - Mesma posição
 * - Não pode trocar duas vezes o mesmo jogador
 * - Só pode confirmar uma vez por rodada (upsert/idempotente)
 */
export async function confirmPostRoundSwaps(
  groupMemberId: string,
  roundId: string,
  swaps: PostRoundSwap[]
) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado' }
  }

  if (swaps.length === 0) {
    return { success: false, error: 'Nenhuma troca para confirmar' }
  }

  if (swaps.length > 3) {
    return { success: false, error: 'Máximo de 3 trocas pós-rodada' }
  }

  const admin = supabaseAdmin()

  try {
    // 1. Validar ownership
    const { data: member } = await admin
      .from('group_members')
      .select('id, profile_id, group_id')
      .eq('id', groupMemberId)
      .single()

    if (!member || member.profile_id !== user.id) {
      return { success: false, error: 'Você não pode fazer trocas neste time' }
    }

    // 2. Validar que a rodada está scored (não open)
    const { data: round } = await admin
      .from('rounds')
      .select('id, status, group_id')
      .eq('id', roundId)
      .single()

    if (!round || round.status !== 'scored') {
      return { success: false, error: 'Trocas pós-rodada só são permitidas em rodadas já pontuadas' }
    }

    if (round.group_id !== member.group_id) {
      return { success: false, error: 'Rodada não pertence ao seu grupo' }
    }

    // 3. Verificar se já confirmou trocas nessa rodada
    const { data: existing } = await admin
      .from('post_round_swaps')
      .select('id')
      .eq('group_member_id', groupMemberId)
      .eq('round_id', roundId)
      .limit(1)

    if (existing && existing.length > 0) {
      return { success: false, error: 'Você já confirmou as trocas desta rodada' }
    }

    // 4. Buscar ratings da rodada
    const { data: teamPlayers } = await admin
      .from('team_players')
      .select('player_id, slot, position_slot')
      .eq('group_member_id', groupMemberId)

    if (!teamPlayers) return { success: false, error: 'Time não encontrado' }

    const playerIds = teamPlayers.map((tp: any) => tp.player_id)
    const { data: ratings } = await admin
      .from('player_round_ratings')
      .select('player_id, rating, minutes')
      .eq('round_id', roundId)
      .in('player_id', playerIds)

    const ratingsMap = new Map<number, { rating: number | null; minutes: number | null }>()
    ;(ratings || []).forEach((r: any) => {
      ratingsMap.set(r.player_id, { rating: r.rating, minutes: r.minutes })
    })

    const teamMap = new Map(teamPlayers.map((tp: any) => [tp.player_id, tp]))

    // 5. Validar cada troca
    const usedOutPlayers = new Set<number>()
    const usedInPlayers = new Set<number>()

    for (const swap of swaps) {
      // Sem duplicatas
      if (usedOutPlayers.has(swap.outPlayerId)) {
        return { success: false, error: `Jogador ${swap.outPlayerId} aparece mais de uma vez como saindo` }
      }
      if (usedInPlayers.has(swap.inPlayerId)) {
        return { success: false, error: `Jogador ${swap.inPlayerId} aparece mais de uma vez como entrando` }
      }
      usedOutPlayers.add(swap.outPlayerId)
      usedInPlayers.add(swap.inPlayerId)

      // Titular sai, reserva entra
      const outTp = teamMap.get(swap.outPlayerId)
      const inTp = teamMap.get(swap.inPlayerId)

      if (!outTp) return { success: false, error: `Jogador ${swap.outPlayerId} não está no seu time` }
      if (!inTp) return { success: false, error: `Jogador ${swap.inPlayerId} não está no seu time` }

      if (outTp.slot !== 'starter') {
        return { success: false, error: 'Apenas titulares podem sair na troca pós-rodada' }
      }
      if (inTp.slot !== 'bench') {
        return { success: false, error: 'Apenas reservas podem entrar na troca pós-rodada' }
      }

      // Mesma posição
      if (outTp.position_slot !== inTp.position_slot) {
        return { success: false, error: `Posições diferentes: ${outTp.position_slot} vs ${inTp.position_slot}` }
      }

      // Reserva deve ter nota >= titular (ou titular sem nota)
      const outRating = ratingsMap.get(swap.outPlayerId)?.rating ?? null
      const inRating = ratingsMap.get(swap.inPlayerId)?.rating ?? null

      if (inRating === null) {
        return { success: false, error: 'O reserva não tem nota nessa rodada, não pode entrar' }
      }

      // Se o titular tem nota, o reserva precisa ter nota melhor
      if (outRating !== null && inRating <= outRating) {
        return {
          success: false,
          error: `A nota do reserva (${inRating}) deve ser maior que a do titular (${outRating})`,
        }
      }
    }

    // 6. Inserir as trocas
    const swapRows = swaps.map(swap => ({
      group_member_id: groupMemberId,
      round_id: roundId,
      out_player_id: swap.outPlayerId,
      in_player_id: swap.inPlayerId,
      position_slot: swap.positionSlot,
    }))

    const { error: insertError } = await admin
      .from('post_round_swaps')
      .insert(swapRows)

    if (insertError) {
      console.error('[PostRound] Erro ao inserir trocas:', insertError)
      return { success: false, error: `Erro ao salvar trocas: ${insertError.message}` }
    }

    // 7. Recalcular o score do membro com as novas trocas
    const { data: group } = await admin
      .from('groups')
      .select('max_subs_por_rodada, min_minutos')
      .eq('id', member.group_id)
      .single()

    if (group) {
      await calculateMemberRoundScore(groupMemberId, roundId, group)
    }

    console.log('[PostRound] ✓ Trocas confirmadas para membro:', groupMemberId)
    revalidatePath('/app')
    revalidatePath('/app/times')

    return { success: true }
  } catch (error: any) {
    console.error('[PostRound] Erro geral:', error.message)
    return { success: false, error: 'Erro ao confirmar trocas' }
  }
}

/**
 * Remove todas as trocas pós-rodada de um membro em uma rodada
 * e recalcula o score sem elas.
 */
export async function resetPostRoundSwaps(groupMemberId: string, roundId: string) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return { success: false, error: 'Não autenticado' }

  const admin = supabaseAdmin()

  const { data: member } = await admin
    .from('group_members')
    .select('id, profile_id, group_id')
    .eq('id', groupMemberId)
    .single()

  if (!member || member.profile_id !== user.id) {
    return { success: false, error: 'Não autorizado' }
  }

  const { error: deleteError } = await admin
    .from('post_round_swaps')
    .delete()
    .eq('group_member_id', groupMemberId)
    .eq('round_id', roundId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  // Recalcular sem as trocas
  const { data: group } = await admin
    .from('groups')
    .select('max_subs_por_rodada, min_minutos')
    .eq('id', member.group_id)
    .single()

  if (group) {
    await calculateMemberRoundScore(groupMemberId, roundId, group)
  }

  revalidatePath('/app')
  revalidatePath('/app/times')
  return { success: true }
}
