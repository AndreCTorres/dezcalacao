'use server'

// app/app/substitutions-actions.ts
// Server Actions para gerenciar substituições de jogadores

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { Substitution } from '@/lib/types'

export async function getActiveRound(groupId: string) {
  const admin = supabaseAdmin()

  // Buscar rodada aberta (status = 'open')
  const { data: round, error } = await admin
    .from('rounds')
    .select('id, name, status')
    .eq('group_id', groupId)
    .eq('status', 'open')
    .single()

  if (error || !round) {
    return { success: false, error: 'Nenhuma rodada aberta', round: null }
  }

  return { success: true, round }
}

export async function applySubstitution(
  groupMemberId: string,
  roundId: string,
  outPlayerId: number,
  inPlayerId: number,
  positionSlot: string
) {
  const supabase = createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado' }
  }

  const admin = supabaseAdmin()

  try {
    // 1. Validar que o membro pertence ao usuário autenticado
    const { data: member } = await admin
      .from('group_members')
      .select('id, profile_id, group_id')
      .eq('id', groupMemberId)
      .single()

    if (!member || member.profile_id !== user.id) {
      return { success: false, error: 'Você não pode fazer substituições neste time' }
    }

    // 2. Validar que a rodada existe e está aberta
    const { data: round } = await admin
      .from('rounds')
      .select('id, status, group_id')
      .eq('id', roundId)
      .single()

    if (!round || round.status !== 'open') {
      return { success: false, error: 'Rodada não está aberta para substituições' }
    }

    if (round.group_id !== member.group_id) {
      return { success: false, error: 'Rodada não pertence ao grupo do membro' }
    }

    // 3. Validar que outPlayerId é titular e inPlayerId é reserva
    const { data: outPlayer } = await admin
      .from('team_players')
      .select('id, slot, position_slot, player_id')
      .eq('group_member_id', groupMemberId)
      .eq('player_id', outPlayerId)
      .single()

    if (!outPlayer) {
      return { success: false, error: 'Jogador a sair não encontrado no seu time' }
    }

    if (outPlayer.slot !== 'starter') {
      return { success: false, error: 'Apenas titulares podem sair' }
    }

    const { data: inPlayer } = await admin
      .from('team_players')
      .select('id, slot, position_slot, player_id')
      .eq('group_member_id', groupMemberId)
      .eq('player_id', inPlayerId)
      .single()

    if (!inPlayer) {
      return { success: false, error: 'Jogador a entrar não encontrado no seu time' }
    }

    if (inPlayer.slot !== 'bench') {
      return { success: false, error: 'Apenas reservas podem entrar' }
    }

    // 4. Validar mesma posição
    if (outPlayer.position_slot !== inPlayer.position_slot) {
      return {
        success: false,
        error: `Posições diferentes: ${outPlayer.position_slot} vs ${inPlayer.position_slot}`,
      }
    }

    // 5. Validar limite de substituições por rodada
    const { data: group } = await admin
      .from('groups')
      .select('max_subs_por_rodada')
      .eq('id', member.group_id)
      .single()

    if (!group) {
      return { success: false, error: 'Grupo não encontrado' }
    }

    const { data: existingSubs } = await admin
      .from('substitutions')
      .select('id')
      .eq('group_member_id', groupMemberId)
      .eq('round_id', roundId)

    if ((existingSubs?.length || 0) >= group.max_subs_por_rodada) {
      return {
        success: false,
        error: `Limite de ${group.max_subs_por_rodada} substituições por rodada atingido`,
      }
    }

    // 6. Criar substituição
    const { data: substitution, error: createError } = await admin
      .from('substitutions')
      .insert({
        group_member_id: groupMemberId,
        round_id: roundId,
        out_player_id: outPlayerId,
        in_player_id: inPlayerId,
        position_slot: positionSlot,
      })
      .select()
      .single()

    if (createError || !substitution) {
      console.error('[Substitution] Erro ao criar:', createError)
      return { success: false, error: `Erro ao criar substituição: ${createError?.message}` }
    }

    console.log('[Substitution] ✓ Criada:', substitution.id)
    revalidatePath('/app/time')

    return { success: true, substitution: substitution as Substitution }
  } catch (error: any) {
    console.error('[Substitution] Erro geral:', error.message)
    return { success: false, error: 'Erro ao processar substituição' }
  }
}

export async function removeSubstitution(substitutionId: string, groupMemberId: string) {
  const supabase = createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado' }
  }

  const admin = supabaseAdmin()

  try {
    // 1. Validar ownership
    const { data: member } = await admin
      .from('group_members')
      .select('id, profile_id')
      .eq('id', groupMemberId)
      .single()

    if (!member || member.profile_id !== user.id) {
      return { success: false, error: 'Você não pode remover esta substituição' }
    }

    // 2. Validar que substitution pertence a este membro
    const { data: substitution } = await admin
      .from('substitutions')
      .select('id')
      .eq('id', substitutionId)
      .eq('group_member_id', groupMemberId)
      .single()

    if (!substitution) {
      return { success: false, error: 'Substituição não encontrada' }
    }

    // 3. Deletar
    const { error: deleteError } = await admin
      .from('substitutions')
      .delete()
      .eq('id', substitutionId)

    if (deleteError) {
      console.error('[Substitution] Erro ao deletar:', deleteError)
      return { success: false, error: `Erro ao remover: ${deleteError.message}` }
    }

    console.log('[Substitution] ✓ Removida:', substitutionId)
    revalidatePath('/app/time')

    return { success: true }
  } catch (error: any) {
    console.error('[Substitution] Erro ao remover:', error.message)
    return { success: false, error: 'Erro ao remover substituição' }
  }
}
