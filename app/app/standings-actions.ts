'use server'

// app/app/standings-actions.ts
// Server Actions para buscar standings (pontuação do grupo)

import { supabaseAdmin } from '@/lib/supabase-server'
import { getLiveRoundScores } from '@/lib/services/live-score.service'

export type MemberStanding = {
  memberId: string
  memberName: string
  totalPoints: number
  lastRoundPoints: number
}

export async function getGroupStandingsWithRounds(groupId: string) {
  const admin = supabaseAdmin()

  try {
    const rounds = await getLiveRoundScores(admin, groupId)

    if (rounds.length === 0) {
      return { success: false, error: 'Nenhuma rodada encontrada', standings: [] }
    }

    const memberScores = new Map<string, { name: string; total: number; lastRound: number }>()

    rounds.forEach((round) => {
      round.scores.forEach((score) => {
        if (!memberScores.has(score.memberId)) {
          memberScores.set(score.memberId, {
            name: score.memberName,
            total: 0,
            lastRound: 0,
          })
        }

        const current = memberScores.get(score.memberId)!
        current.total += score.points
        if (current.lastRound === 0) current.lastRound = score.points
      })
    })

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
      lastRound: rounds[0] ? { id: rounds[0].roundId, name: rounds[0].roundName, status: rounds[0].status } : null,
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
