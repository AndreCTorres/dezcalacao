/**
 * Scoring Service
 * Orquestração da pontuação (combina scoring.ts com dados do banco)
 */

import {
  basePoints,
  bonusPoints,
  selecaoDaRodada,
  craquesDaRodada,
  type ScoringConfig as PureScoringConfig,
} from '@/lib/scoring'
import { supabaseAdmin } from '@/lib/supabase-server'
import type {
  ScoringConfig,
  TeamPlayer,
  PlayerRoundRating,
  Substitution,
  RoundScore,
} from '@/lib/types'

/**
 * Calcular pontuação de um membro em uma rodada
 */
export async function calculateMemberRoundScore(
  groupMemberId: string,
  roundId: string,
  group: { max_subs_por_rodada: number; min_minutos: number }
): Promise<RoundScore | null> {
  const admin = supabaseAdmin()

  // Buscar team_players (draft inicial)
  const { data: teamPlayers } = await admin
    .from('team_players')
    .select('id, player_id, slot, position_slot')
    .eq('group_member_id', groupMemberId)

  if (!teamPlayers || teamPlayers.length === 0) return null

  // Buscar substituições da rodada
  const { data: substitutions } = await admin
    .from('substitutions')
    .select('out_player_id, in_player_id')
    .eq('group_member_id', groupMemberId)
    .eq('round_id', roundId)

  // Construir lineup efetivo (considerar substituições)
  const effectiveLineup = applySubstitutions(
    teamPlayers as TeamPlayer[],
    substitutions as Substitution[]
  )

  // Buscar ratings de todos os jogadores da rodada
  const playerIds = teamPlayers.map((tp) => tp.player_id)
  const { data: allRatings } = await admin
    .from('player_round_ratings')
    .select('player_id, rating, minutes')
    .eq('round_id', roundId)
    .in('player_id', playerIds)

  if (!allRatings) return null

  // Criar map de ratings para lookup rápido
  const ratingsMap = new Map<number, PlayerRoundRating>()
  allRatings.forEach((r) => ratingsMap.set(r.player_id as number, r))

  // Criar map de ratings por posição (para bônus)
  const ratingsByPosition = new Map<string, PlayerRoundRating[]>()
  allRatings.forEach((r) => {
    const tp = teamPlayers.find((t) => t.player_id === r.player_id)
    if (tp) {
      if (!ratingsByPosition.has(tp.position_slot)) {
        ratingsByPosition.set(tp.position_slot, [])
      }
      ratingsByPosition.get(tp.position_slot)!.push(r)
    }
  })

  // Calcular pontos base
  const pureScoringConfig: PureScoringConfig = {
    minMinutes: group.min_minutos,
    neutralRating: 6.0,
    bonusSelecaoRodada: false,
    bonusCraquePartida: false,
    pointsSelecaoRodada: 1.0,
    pointsCraquePartida: 1.0,
  }

  const basePts = basePoints(
    effectiveLineup,
    ratingsMap,
    pureScoringConfig
  )

  // Por enquanto, sem bônus (fase 2)
  const bonusPts = 0

  const totalPts = basePts + bonusPts

  // Inserir/atualizar round_scores
  const { data: score } = await admin
    .from('round_scores')
    .upsert({
      group_member_id: groupMemberId,
      round_id: roundId,
      base_points: basePts,
      bonus_points: bonusPts,
      total_points: totalPts,
      computed_at: new Date().toISOString(),
    })
    .select()
    .single()

  return score as RoundScore | null
}

/**
 * Calcular pontuação de todos os membros em uma rodada
 */
export async function calculateRoundScores(
  groupId: string,
  roundId: string
): Promise<{ success: boolean; error?: string; count?: number }> {
  const admin = supabaseAdmin()

  try {
    // Buscar grupo (configuração)
    const { data: group } = await admin
      .from('groups')
      .select('max_subs_por_rodada, min_minutos')
      .eq('id', groupId)
      .single()

    if (!group)
      return { success: false, error: 'Grupo não encontrado' }

    // Buscar membros do grupo
    const { data: members } = await admin
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)

    if (!members) return { success: false, error: 'Membros não encontrados' }

    let count = 0

    // Calcular score para cada membro
    for (const member of members) {
      const result = await calculateMemberRoundScore(
        member.id,
        roundId,
        group
      )
      if (result) count++
    }

    // Atualizar status da rodada para 'scored'
    await admin
      .from('rounds')
      .update({ status: 'scored' })
      .eq('id', roundId)

    return { success: true, count }
  } catch (error) {
    console.error('[Scoring] Erro ao calcular rodada:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Aplicar substituições ao lineup (substituir out_player por in_player)
 */
function applySubstitutions(
  teamPlayers: TeamPlayer[],
  substitutions: Substitution[]
): TeamPlayer[] {
  const subs = new Map<number, number>() // out_player_id -> in_player_id

  substitutions.forEach((sub) => {
    subs.set(sub.out_player_id, sub.in_player_id)
  })

  return teamPlayers.map((tp) => {
    const replacement = subs.get(tp.player_id)
    if (replacement && tp.slot === 'starter') {
      // Substituir
      return {
        ...tp,
        player_id: replacement,
      }
    }
    return tp
  })
}

/**
 * Obter classificação do grupo (standings)
 */
export async function getGroupStandings(groupId: string, roundId?: string) {
  const admin = supabaseAdmin()

  let query = admin
    .from('round_scores')
    .select(
      `
      group_member_id,
      total_points,
      group_members (
        display_name
      )
    `
    )

  // Se roundId não fornecido, pegar pontuação acumulada (group by member, sum)
  if (roundId) {
    query = query.eq('round_id', roundId)
  }

  // Filtrar por grupo
  const { data: scores } = await query

  if (!scores) return []

  // Agrupar e somar se não for round específico
  const standings = scores
    .map((score) => ({
      memberId: score.group_member_id,
      memberName: score.group_members?.display_name || 'Desconhecido',
      points: score.total_points,
    }))
    .sort((a, b) => b.points - a.points)

  return standings
}
