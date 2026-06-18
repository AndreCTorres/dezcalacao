// app/api/admin/rounds/[roundId]/audit/route.ts
// Histórico/auditoria de mudanças de ratings para uma rodada

import { supabaseAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await params
    const admin = supabaseAdmin()

    // Query parameters
    const url = new URL(request.url)
    const playerId = url.searchParams.get('playerId') // filtro opcional
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500)

    // Buscar rodada
    const { data: round } = await admin
      .from('rounds')
      .select('id, name, status, group_id')
      .eq('id', roundId)
      .single()

    if (!round) {
      return NextResponse.json(
        { error: 'Rodada não encontrada' },
        { status: 404 }
      )
    }

    // Buscar histórico de mudanças
    let query = admin
      .from('player_rating_changes')
      .select('*')
      .eq('round_id', roundId)
      .order('created_at', { ascending: false })

    if (playerId) {
      query = query.eq('player_id', parseInt(playerId))
    }

    query = query.limit(limit)

    const { data: changes, error } = await query

    if (error) {
      console.error('[AuditAPI] Erro ao buscar histórico:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar histórico' },
        { status: 500 }
      )
    }

    // Agrupar por jogador para análise
    const byPlayer = new Map<number, typeof changes>()
    ;(changes || []).forEach((change: any) => {
      const pid = change.player_id
      if (!byPlayer.has(pid)) {
        byPlayer.set(pid, [])
      }
      byPlayer.get(pid)!.push(change)
    })

    // Detectar anomalias
    const anomalies: Array<{
      type: string
      player_id: number
      player_name: string
      description: string
      changes: number
    }> = []

    byPlayer.forEach((playerChanges, playerId) => {
      const player = playerChanges[0]

      // Detector 1: Multiple UPDATEs sem razão clara
      const updates = playerChanges.filter((c: any) => c.operation === 'UPDATE')
      if (updates.length > 3) {
        anomalies.push({
          type: 'EXCESSIVE_UPDATES',
          player_id: playerId,
          player_name: player.player_name,
          description: `${updates.length} alterações em pouco tempo`,
          changes: updates.length,
        })
      }

      // Detector 2: Rating > 10 ou < 0
      const invalidRatings = playerChanges.filter(
        (c: any) => c.anomaly_flag === 'INVALID_RATING'
      )
      if (invalidRatings.length > 0) {
        anomalies.push({
          type: 'INVALID_RATING',
          player_id: playerId,
          player_name: player.player_name,
          description: `Nota inválida detectada: ${invalidRatings[0].new_rating}`,
          changes: invalidRatings.length,
        })
      }

      // Detector 3: Possível perda de dados
      const possibleLoss = playerChanges.filter(
        (c: any) => c.anomaly_flag === 'POSSIBLE_DATA_LOSS'
      )
      if (possibleLoss.length > 0) {
        anomalies.push({
          type: 'POSSIBLE_DATA_LOSS',
          player_id: playerId,
          player_name: player.player_name,
          description: `Nota alta foi sobrescrita por NULL`,
          changes: possibleLoss.length,
        })
      }

      // Detector 4: Delete de rating com valor
      const deletedWithValue = playerChanges.filter(
        (c: any) => c.anomaly_flag === 'DELETED_WITH_RATING'
      )
      if (deletedWithValue.length > 0) {
        anomalies.push({
          type: 'DELETED_WITH_RATING',
          player_id: playerId,
          player_name: player.player_name,
          description: `Rating foi deletado (had ${deletedWithValue[0].old_rating})`,
          changes: deletedWithValue.length,
        })
      }
    })

    return NextResponse.json({
      round: {
        id: round.id,
        name: round.name,
        status: round.status,
      },
      stats: {
        totalChanges: changes?.length ?? 0,
        uniquePlayers: byPlayer.size,
        anomaliesDetected: anomalies.length,
      },
      recentChanges: (changes || []).slice(0, 50).map((c: any) => ({
        audit_id: c.audit_id,
        player_id: c.player_id,
        player_name: c.player_name,
        team_name: c.team_name,
        operation: c.operation,
        old_rating: c.old_rating,
        new_rating: c.new_rating,
        old_minutes: c.old_minutes,
        new_minutes: c.new_minutes,
        admin_email: c.admin_email,
        created_at: c.created_at,
        change_reason: c.change_reason,
        anomaly_flag: c.anomaly_flag,
      })),
      anomalies: anomalies.slice(0, 20),
    })
  } catch (error: any) {
    console.error('[AuditAPI] Erro:', error.message)
    return NextResponse.json(
      { error: 'Erro ao buscar auditoria', message: error.message },
      { status: 500 }
    )
  }
}
