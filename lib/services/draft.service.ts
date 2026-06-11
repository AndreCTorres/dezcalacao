/**
 * Draft Service
 * Lógica de negócio para draft: validações, busca, estado
 */

import { supabaseAdmin } from '@/lib/supabase-server'
import type { TeamPlayer, Position } from '@/lib/types'

const POSITIONS: Position[] = ['GK', 'ZAG', 'LAT', 'MEI', 'ATK']
const STARTER_SLOTS = 11
const BENCH_SLOTS = 5
const TOTAL_SLOTS = STARTER_SLOTS + BENCH_SLOTS

/**
 * Validar atribuição de um jogador
 * Verifica: (1) regra "um por seleção", (2) slots disponíveis, (3) posição válida
 */
export async function validatePlayerSelection(
  groupId: string,
  memberId: string,
  playerId: number,
  positionSlot: Position,
  slot: 'starter' | 'bench'
): Promise<{ valid: boolean; error?: string }> {
  const admin = supabaseAdmin()

  // 1. Validar que positionSlot é válida
  if (!POSITIONS.includes(positionSlot)) {
    return { valid: false, error: `Posição inválida: ${positionSlot}` }
  }

  // 2. Validar que slot é válido
  if (slot !== 'starter' && slot !== 'bench') {
    return { valid: false, error: 'Slot inválido' }
  }

  // 3. Buscar jogador para obter team_id
  const { data: player, error: playerError } = await admin
    .from('players')
    .select('id, team_id, position')
    .eq('id', playerId)
    .single()

  if (playerError || !player) {
    return { valid: false, error: 'Jogador não encontrado' }
  }

  // 4. Regra "um por seleção": verificar se member já tem outro jogador da mesma seleção
  // ⚠️ CRÍTICO: Fazer join com players para comparar team_id
  const { data: memberPlayers } = await admin
    .from('team_players')
    .select(
      `
      id,
      players (
        team_id
      )
    `
    )
    .eq('group_member_id', memberId)

  const hasPlayerFromSameTeam = memberPlayers?.some(
    (tp) => tp.players && (tp.players as any).team_id === player.team_id
  )

  if (hasPlayerFromSameTeam) {
    return { valid: false, error: 'Você já tem um jogador desta seleção' }
  }

  // 5. Validar que o jogador não está duplicado para este membro
  const { data: alreadyPicked } = await admin
    .from('team_players')
    .select('id')
    .eq('group_member_id', memberId)
    .eq('player_id', playerId)
    .single()

  if (alreadyPicked) {
    return { valid: false, error: 'Este jogador já foi atribuído' }
  }

  // 6. Validar slots (11 starter + 5 bench)
  const { data: currentTeam } = await admin
    .from('team_players')
    .select('id, slot')
    .eq('group_member_id', memberId)

  if (!currentTeam) {
    return { valid: false, error: 'Erro ao validar time' }
  }

  const starterCount = currentTeam.filter(t => t.slot === 'starter').length
  const benchCount = currentTeam.filter(t => t.slot === 'bench').length

  if (slot === 'starter' && starterCount >= STARTER_SLOTS) {
    return { valid: false, error: `Máximo de ${STARTER_SLOTS} titulares atingido` }
  }

  if (slot === 'bench' && benchCount >= BENCH_SLOTS) {
    return { valid: false, error: `Máximo de ${BENCH_SLOTS} reservas atingido` }
  }

  return { valid: true }
}

/**
 * Validar composição completa do time
 */
export function validateTeamComposition(team: TeamPlayer[]): { valid: boolean; error?: string } {
  const starters = team.filter(t => t.slot === 'starter')
  const bench = team.filter(t => t.slot === 'bench')

  if (starters.length < STARTER_SLOTS) {
    return { valid: false, error: `Faltam ${STARTER_SLOTS - starters.length} titulares` }
  }

  if (starters.length > STARTER_SLOTS) {
    return { valid: false, error: 'Titulares em excesso' }
  }

  if (bench.length < BENCH_SLOTS) {
    return { valid: false, error: `Faltam ${BENCH_SLOTS - bench.length} reservas` }
  }

  if (bench.length > BENCH_SLOTS) {
    return { valid: false, error: 'Reservas em excesso' }
  }

  return { valid: true }
}

/**
 * Contar slots restantes para um membro
 */
export async function getSlotsCounts(memberId: string): Promise<{
  starter: number
  bench: number
  total: number
  starterRemaining: number
  benchRemaining: number
}> {
  const admin = supabaseAdmin()

  const { data: currentTeam } = await admin
    .from('team_players')
    .select('slot')
    .eq('group_member_id', memberId)

  if (!currentTeam) {
    return {
      starter: 0,
      bench: 0,
      total: 0,
      starterRemaining: STARTER_SLOTS,
      benchRemaining: BENCH_SLOTS,
    }
  }

  const starterCount = currentTeam.filter(t => t.slot === 'starter').length
  const benchCount = currentTeam.filter(t => t.slot === 'bench').length

  return {
    starter: starterCount,
    bench: benchCount,
    total: starterCount + benchCount,
    starterRemaining: Math.max(0, STARTER_SLOTS - starterCount),
    benchRemaining: Math.max(0, BENCH_SLOTS - benchCount),
  }
}

/**
 * Buscar jogadores disponíveis (não atribuídos no grupo)
 */
export async function getAvailablePlayers(groupId: string, query?: string) {
  const admin = supabaseAdmin()

  // Pegar todos os player_ids já atribuídos no grupo
  const { data: draftedPlayers } = await admin
    .from('team_players')
    .select('player_id')

  const draftedIds = draftedPlayers?.map(tp => tp.player_id) || []

  // Buscar jogadores não drafted
  let queryBuilder = admin
    .from('players')
    .select('id, name, team_id, team_name, position, photo_url, api_position, number')

  // Filtrar drafted
  if (draftedIds.length > 0) {
    queryBuilder = queryBuilder.not('id', 'in', `(${draftedIds.join(',')})`)
  }

  // Filtrar por query
  if (query && query.trim()) {
    queryBuilder = queryBuilder.ilike('name', `%${query}%`)
  }

  // Order e limit
  const { data, error } = await queryBuilder
    .order('team_name', { ascending: true })
    .order('name', { ascending: true })
    .limit(100)

  if (error) {
    console.error('[Draft] Erro ao buscar jogadores:', error)
    return []
  }

  return data || []
}

/**
 * Buscar time atual de um membro com detalhes dos jogadores
 */
export async function getMemberTeam(memberId: string) {
  const admin = supabaseAdmin()

  const { data, error } = await admin
    .from('team_players')
    .select(
      `
      id,
      player_id,
      slot,
      position_slot,
      created_at,
      players (
        id,
        name,
        team_id,
        team_name,
        position,
        photo_url,
        number
      )
    `
    )
    .eq('group_member_id', memberId)
    .order('slot', { ascending: false })
    .order('position_slot', { ascending: true })

  if (error) {
    console.error('[Draft] Erro ao buscar time:', error)
    return []
  }

  return data || []
}

/**
 * Verificar se draft está completo (todos os membros têm 16 jogadores)
 */
export async function isDraftComplete(groupId: string): Promise<boolean> {
  const admin = supabaseAdmin()

  // Contar membros
  const { count: memberCount } = await admin
    .from('group_members')
    .select('id', { count: 'exact' })
    .eq('group_id', groupId)

  // Contar times completos (16 jogadores por membro)
  const { data: memberStats } = await admin
    .from('team_players')
    .select('group_member_id')

  if (!memberStats) return false

  const completedMembers = new Set<string>()
  const memberTeamCounts: Record<string, number> = {}

  for (const stat of memberStats) {
    memberTeamCounts[stat.group_member_id] = (memberTeamCounts[stat.group_member_id] || 0) + 1
    if (memberTeamCounts[stat.group_member_id] === TOTAL_SLOTS) {
      completedMembers.add(stat.group_member_id)
    }
  }

  return completedMembers.size === memberCount
}
