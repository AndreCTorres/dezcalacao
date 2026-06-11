'use server'

// app/admin/draft/actions.ts
// Server Actions para draft: atribuir jogadores, remover, fechar draft

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { validatePlayerSelection, validateTeamComposition, getMemberTeam, isDraftComplete } from '@/lib/services/draft.service'
import { revalidatePath } from 'next/cache'
import type { Position } from '@/lib/types'

export async function assignPlayerToMember(
  groupId: string,
  memberId: string,
  playerId: number,
  slot: 'starter' | 'bench',
  positionSlot: Position
) {
  // Validar autenticação
  const supabase = createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado' }
  }

  // Validar que é admin do grupo
  const admin = supabaseAdmin()
  const { data: group, error: groupError } = await admin
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .eq('admin_id', user.id)
    .single()

  if (groupError || !group) {
    return { success: false, error: 'Você não é admin deste grupo' }
  }

  // ========================================
  // VALIDAÇÃO 1: Service-side "um por seleção"
  // ========================================
  console.log('[Draft] Validando regra "um por seleção":', { memberId, playerId })

  // Buscar o jogador para obter team_id
  const { data: playerData } = await admin
    .from('players')
    .select('team_id')
    .eq('id', playerId)
    .single()

  if (!playerData) {
    return { success: false, error: 'Jogador não encontrado' }
  }

  // Verificar se member já tem outro jogador da mesma seleção
  const { data: memberPlayers } = await admin
    .from('team_players')
    .select(
      `
      id,
      player_id,
      players (
        team_id
      )
    `
    )
    .eq('group_member_id', memberId)

  const hasPlayerFromSameTeam = memberPlayers?.some(
    (tp) => tp.players && (tp.players as any).team_id === playerData.team_id
  )

  if (hasPlayerFromSameTeam) {
    console.error('[Draft] Violação: membro já tem jogador desta seleção')
    return {
      success: false,
      error: '❌ ERRO: Você já tem um jogador desta seleção (regra "um por seleção")',
    }
  }

  console.log('[Draft] ✓ Regra "um por seleção" validada')

  // Validar seleção do jogador (outros critérios de negócio)
  console.log('[Draft] Validando seleção:', { memberId, playerId, slot, positionSlot })
  const validation = await validatePlayerSelection(groupId, memberId, playerId, positionSlot, slot)

  if (!validation.valid) {
    console.error('[Draft] Validação falhou:', validation.error)
    return { success: false, error: validation.error }
  }

  // Inserir em team_players
  const { data: teamPlayer, error: insertError } = await admin
    .from('team_players')
    .insert({
      group_member_id: memberId,
      player_id: playerId,
      slot,
      position_slot: positionSlot,
    })
    .select()
    .single()

  if (insertError || !teamPlayer) {
    console.error('[Draft] Erro ao inserir:', insertError)
    return { success: false, error: `Erro ao atribuir jogador: ${insertError?.message || 'Desconhecido'}` }
  }

  console.log('[Draft] ✓ Jogador atribuído:', teamPlayer.id)

  revalidatePath('/admin/draft')

  return {
    success: true,
    teamPlayer,
  }
}

export async function unassignPlayer(
  groupId: string,
  teamPlayerId: string
) {
  // Validar autenticação
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

  // Deletar team_player
  const { error: deleteError } = await admin
    .from('team_players')
    .delete()
    .eq('id', teamPlayerId)

  if (deleteError) {
    console.error('[Draft] Erro ao deletar:', deleteError)
    return { success: false, error: `Erro ao remover jogador: ${deleteError.message}` }
  }

  console.log('[Draft] ✓ Jogador removido:', teamPlayerId)

  revalidatePath('/admin/draft')

  return { success: true }
}

export async function closeDraft(groupId: string) {
  // Validar autenticação
  const supabase = createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado' }
  }

  // Validar que é admin do grupo
  const admin = supabaseAdmin()
  const { data: group, error: groupError } = await admin
    .from('groups')
    .select('id, status')
    .eq('id', groupId)
    .eq('admin_id', user.id)
    .single()

  if (groupError || !group) {
    return { success: false, error: 'Você não é admin deste grupo' }
  }

  if (group.status !== 'setup') {
    return { success: false, error: `Draft já foi iniciado (status: ${group.status})` }
  }

  // Verificar se draft está completo
  const complete = await isDraftComplete(groupId)

  if (!complete) {
    return { success: false, error: 'Nem todos os membros têm 16 jogadores ainda' }
  }

  // Atualizar status
  const { error: updateError } = await admin
    .from('groups')
    .update({ status: 'active' })
    .eq('id', groupId)

  if (updateError) {
    console.error('[Draft] Erro ao fechar draft:', updateError)
    return { success: false, error: `Erro ao fechar draft: ${updateError.message}` }
  }

  console.log('[Draft] ✓ Draft fechado, grupo ativo')

  revalidatePath('/admin')
  revalidatePath('/admin/draft')

  return { success: true }
}

export async function searchPlayers(query: string, groupId: string) {
  // Validar autenticação
  const supabase = createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado', players: [] }
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
    return { success: false, error: 'Você não é admin deste grupo', players: [] }
  }

  // Buscar drafted players do grupo
  const { data: draftedPlayers } = await admin
    .from('team_players')
    .select('player_id')

  const draftedIds = draftedPlayers?.map(tp => tp.player_id) || []

  // Buscar jogadores
  let queryBuilder = admin
    .from('players')
    .select('id, name, team_id, team_name, position, photo_url, api_position, number, age')

  if (draftedIds.length > 0) {
    queryBuilder = queryBuilder.not('id', 'in', `(${draftedIds.join(',')})`)
  }

  if (query && query.trim()) {
    queryBuilder = queryBuilder.ilike('name', `%${query}%`)
  }

  const { data: players, error } = await queryBuilder
    .order('team_name', { ascending: true })
    .order('name', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[Draft] Erro ao buscar jogadores:', error)
    return { success: false, error: 'Erro ao buscar jogadores', players: [] }
  }

  return { success: true, players: players || [] }
}

export async function getDraftState(groupId: string) {
  // Validar autenticação
  const supabase = createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado', state: null }
  }

  // Validar que é admin do grupo
  const admin = supabaseAdmin()
  const { data: group } = await admin
    .from('groups')
    .select('id, status, name')
    .eq('id', groupId)
    .eq('admin_id', user.id)
    .single()

  if (!group) {
    return { success: false, error: 'Você não é admin deste grupo', state: null }
  }

  // Buscar membros
  const { data: members } = await admin
    .from('group_members')
    .select('id, display_name, profile_id, status')
    .eq('group_id', groupId)
    .order('display_name', { ascending: true })

  // Buscar draft state por membro
  const memberStates = await Promise.all(
    (members || []).map(async member => {
      const team = await getMemberTeam(member.id)
      return {
        memberId: member.id,
        memberName: member.display_name,
        status: member.status,
        teamCount: team.length,
        team,
      }
    })
  )

  const isComplete = await isDraftComplete(groupId)

  return {
    success: true,
    state: {
      groupName: group.name,
      groupStatus: group.status,
      members: memberStates,
      draftComplete: isComplete,
    },
  }
}

export async function bulkImportDraft(
  groupId: string,
  draftList: string,
  members: any[]
) {
  // Validar autenticação
  const supabase = createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado' }
  }

  // Validar que é admin do grupo
  const admin = supabaseAdmin()
  const { data: group } = await admin
    .from('groups')
    .select('id, status')
    .eq('id', groupId)
    .eq('admin_id', user.id)
    .single()

  if (!group) {
    return { success: false, error: 'Você não é admin deste grupo' }
  }

  if (group.status !== 'setup') {
    return { success: false, error: 'Draft já foi iniciado' }
  }

  // Parse da lista
  // Formato esperado:
  // "Membro 1: Jogador1, Jogador2, ..."
  // "Membro 2: Jogador3, Jogador4, ..."

  const lines = draftList
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  let importedCount = 0
  const errors: string[] = []

  for (const line of lines) {
    const [memberName, playersList] = line.split(':').map(s => s.trim())

    if (!memberName || !playersList) {
      errors.push(`Linha inválida: "${line}"`)
      continue
    }

    // Encontrar membro por nome
    const member = members.find(m => m.display_name.toLowerCase() === memberName.toLowerCase())

    if (!member) {
      errors.push(`Membro não encontrado: "${memberName}"`)
      continue
    }

    // Parsear nomes dos jogadores
    const playerNames = playersList.split(',').map(n => n.trim().toLowerCase())

    // Buscar jogadores no banco
    for (const playerName of playerNames) {
      if (!playerName) continue

      const { data: players } = await admin
        .from('players')
        .select('id, position')
        .ilike('name', `%${playerName}%`)
        .limit(1)

      if (!players || players.length === 0) {
        errors.push(`Jogador não encontrado: "${playerName}" para ${memberName}`)
        continue
      }

      const player = players[0]

      // Mapear posição para posição de slot
      let positionSlot: Position = 'MEI'
      switch (player.position) {
        case 'GK':
          positionSlot = 'GK'
          break
        case 'ZAG':
        case 'LAT':
          positionSlot = player.position as Position
          break
        case 'ATK':
          positionSlot = 'ATK'
          break
        default:
          positionSlot = 'MEI'
      }

      // Decidir slot (11 primeiros são titulares)
      const team = await getMemberTeam(member.id)
      const slot = team.length < 11 ? ('starter' as const) : ('bench' as const)

      // Inserir
      const { error: insertError } = await admin
        .from('team_players')
        .insert({
          group_member_id: member.id,
          player_id: player.id,
          slot,
          position_slot: positionSlot,
        })

      if (insertError) {
        errors.push(`Erro ao adicionar ${playerName}: ${insertError.message}`)
      } else {
        importedCount++
      }
    }
  }

  console.log(`[BulkImport] ✓ ${importedCount} jogadores importados, ${errors.length} erros`)

  revalidatePath('/admin/draft')

  return {
    success: errors.length === 0,
    imported: importedCount,
    errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    error: errors.length > 0 ? `${importedCount} jogadores importados, ${errors.length} erros. ${errors[0]}` : undefined,
  }
}
