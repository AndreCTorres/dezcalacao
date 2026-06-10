// app/api/rounds/[groupId]/details/route.ts
// Buscar detalhes de pontuação por rodada

import { supabaseAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const { groupId } = params
    const admin = supabaseAdmin()

    // 1. Buscar rodadas do grupo (ordenadas mais recentes primeiro)
    const { data: rounds, error: roundsError } = await admin
      .from('rounds')
      .select('id, name, status')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (roundsError || !rounds) {
      return NextResponse.json(
        { error: 'Erro ao buscar rodadas', rounds: [] },
        { status: 400 }
      )
    }

    // 2. Para cada rodada, buscar scores
    const roundDetails = await Promise.all(
      rounds.map(async (round) => {
        const { data: scores } = await admin
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
          .eq('round_id', round.id)
          .order('total_points', { ascending: false })

        return {
          roundId: round.id,
          roundName: round.name,
          status: round.status,
          scores: (scores || []).map((s: any) => ({
            memberId: s.group_member_id,
            memberName: s.group_members?.display_name || 'Desconhecido',
            points: s.total_points || 0,
          })),
        }
      })
    )

    return NextResponse.json({ rounds: roundDetails })
  } catch (error: any) {
    console.error('[RoundDetails API] Erro:', error.message)
    return NextResponse.json(
      { error: 'Erro ao buscar detalhes de rodadas', rounds: [] },
      { status: 500 }
    )
  }
}
