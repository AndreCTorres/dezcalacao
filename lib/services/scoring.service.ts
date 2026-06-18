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

  const { data: postRoundSwaps } = await admin
    .from('post_round_swaps')
    .select('out_player_id, in_player_id')
    .eq('group_member_id', groupMemberId)
    .eq('round_id', roundId)

  // Construir lineup efetivo (considerar substituições)
  const effectiveLineup = applySubstitutions(
    applySubstitutions(teamPlayers as TeamPlayer[], substitutions as Substitution[]),
    (postRoundSwaps ?? []) as Substitution[]
  )

  // Buscar ratings de todos os jogadores da rodada
  const playerIds = Array.from(new Set(effectiveLineup.map((tp) => tp.player_id)))
  const { data: allRatings } = await admin
    .from('player_round_ratings')
    .select('id, player_id, round_id, fixture_id, rating, minutes, source, fetched_at')
    .eq('round_id', roundId)
    .in('player_id', playerIds)

  if (!allRatings) return null

  // Criar map de ratings para lookup rápido
  const ratingsMap = new Map<number, PlayerRoundRating>()
  allRatings.forEach((r) => ratingsMap.set(r.player_id as number, r as PlayerRoundRating))

  // Criar map de ratings por posição (para bônus)
  const ratingsByPosition = new Map<string, PlayerRoundRating[]>()
  allRatings.forEach((r) => {
    const tp = teamPlayers.find((t) => t.player_id === r.player_id)
    if (tp) {
      if (!ratingsByPosition.has(tp.position_slot)) {
        ratingsByPosition.set(tp.position_slot, [])
      }
      ratingsByPosition.get(tp.position_slot)!.push(r as PlayerRoundRating)
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

  // Converter PlayerRoundRating para PlayerRating (tipo esperado por basePoints)
  const playerRatingsMap = new Map<number, any>()
  ratingsMap.forEach((roundRating, playerId) => {
    const teamPlayer = teamPlayers.find(tp => tp.player_id === playerId)
    if (teamPlayer) {
      playerRatingsMap.set(playerId, {
        playerId: playerId,
        teamId: 0, // não usado no cálculo
        position: teamPlayer.position_slot,
        rating: roundRating.rating,
        minutes: roundRating.minutes,
      })
    }
  })

  // Converter TeamPlayer para LineupSlot
  const lineupSlots = effectiveLineup.map((tp) => ({
    playerId: tp.player_id,
    position: tp.position_slot,
    slot: tp.slot,
  }))

  const basePts = basePoints(
    lineupSlots,
    playerRatingsMap,
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

  try {
    // Buscar todas as rodadas do grupo para validação
    const { data: rounds } = await admin
      .from('rounds')
      .select('id, group_id')
      .eq('group_id', groupId)

    if (!rounds || rounds.length === 0) return []

    const roundIds = rounds.map((r) => r.id)

    // Buscar scores apenas das rodadas deste grupo
    let query = admin
      .from('round_scores')
      .select(
        `
        group_member_id,
        total_points,
        round_id,
        group_members (
          display_name
        )
      `
      )
      .in('round_id', roundIds)

    if (roundId) {
      query = query.eq('round_id', roundId)
    }

    const { data: scores } = await query

    if (!scores || scores.length === 0) return []

    // Agrupar por membro e somar pontos
    const memberScores = new Map<string, { name: string; total: number }>()

    scores.forEach((score: any) => {
      const memberId = score.group_member_id
      const name = score.group_members?.display_name || 'Desconhecido'
      const points = score.total_points || 0

      if (!memberScores.has(memberId)) {
        memberScores.set(memberId, { name, total: 0 })
      }

      const current = memberScores.get(memberId)!
      current.total += points
    })

    // Converter para array e ordenar
    const standings = Array.from(memberScores.entries())
      .map(([memberId, data]) => ({
        memberId,
        memberName: data.name,
        points: Math.round(data.total * 100) / 100,
      }))
      .sort((a, b) => b.points - a.points)

    return standings
  } catch (error) {
    console.error('[Standings] Erro ao buscar:', error)
    return []
  }
}
