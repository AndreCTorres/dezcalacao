// app/api/rounds/[groupId]/details/route.ts
// Buscar detalhes de pontuação por rodada

import { supabaseAdmin } from '@/lib/supabase-server'
import { getLiveRoundScores } from '@/lib/services/live-score.service'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const admin = supabaseAdmin()

    const roundDetails = await getLiveRoundScores(admin, groupId)

    if (roundDetails.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao buscar rodadas', rounds: [] },
        { status: 400 }
      )
    }

    return NextResponse.json({ rounds: roundDetails })
  } catch (error: any) {
    console.error('[RoundDetails API] Erro:', error.message)
    return NextResponse.json(
      { error: 'Erro ao buscar detalhes de rodadas', rounds: [] },
      { status: 500 }
    )
  }
}
