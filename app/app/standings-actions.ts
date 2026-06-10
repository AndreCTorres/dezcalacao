'use server'

// app/app/standings-actions.ts
// Server Actions para buscar standings (pontuação do grupo)

import { supabaseAdmin } from '@/lib/supabase-server'

export type MemberStanding = {
  memberId: string
  memberName: string
  totalPoints: number
  lastRoundPoints: number
}

export async function getGroupStandingsWithRounds(groupId: string) {
  const admin = supabaseAdmin()

  try {
    // 1. Buscar todas as rodadas do grupo para contexto
    const { data: rounds } = await admin
      .from('rounds')
      .select('id, name, status')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (!rounds) {
      return { success: false, error: 'Nenhuma rodada encontrada', standings: [] }
    }

    // 2. Buscar scores de todas as rodadas
    const { data: scores } = await admin
      .from('round_scores')
      .select(
        `
        id,
        group_member_id,
        round_id,
        total_points,
        group_members (
          id,
          display_name
        ),
        rounds (
          id,
          group_id
        )
      `
      )

    if (!scores) {
      return { success: false, error: 'Erro ao buscar scores', standings: [] }
    }

    // 3. Filtrar scores apenas do grupo especificado
    const groupScores = scores.filter((s: any) => s.rounds?.group_id === groupId)

    // 4. Agrupar por membro e calcular totais
    const memberScores = new Map<string, { name: string; total: number; lastRound: number }>()

    groupScores.forEach((score: any) => {
      const memberId = score.group_member_id
      const memberName = score.group_members?.display_name || 'Desconhecido'
      const points = score.total_points || 0

      if (!memberScores.has(memberId)) {
        memberScores.set(memberId, {
          name: memberName,
          total: 0,
          lastRound: 0,
        })
      }

      const current = memberScores.get(memberId)!
      current.total += points

      // Pegar o score mais recente (da rodada mais recente)
      if (current.lastRound === 0 || groupScores.indexOf(score) === 0) {
        current.lastRound = points
      }
    })

    // 5. Converter para array e ordenar
    const standings: MemberStanding[] = Array.from(memberScores.entries())
      .map(([memberId, data]) => ({
        memberId,
        memberName: data.name,
        totalPoints: Math.round(data.total * 100) / 100,
        lastRoundPoints: Math.round(data.lastRound * 100) / 100,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)

    return {
      success: true,
      standings,
      roundCount: rounds.length,
      lastRound: rounds[0],
    }
  } catch (error: any) {
    console.error('[Standings] Erro:', error.message)
    return {
      success: false,
      error: 'Erro ao buscar standings',
      standings: [],
    }
  }
}

export async function getGroupMembers(groupId: string) {
  const admin = supabaseAdmin()

  try {
    const { data: members } = await admin
      .from('group_members')
      .select('id, display_name, status')
      .eq('group_id', groupId)
      .eq('status', 'joined')

    if (!members) {
      return { success: false, error: 'Erro ao buscar membros', members: [] }
    }

    return { success: true, members }
  } catch (error: any) {
    console.error('[Members] Erro:', error.message)
    return { success: false, error: 'Erro ao buscar membros', members: [] }
  }
}
