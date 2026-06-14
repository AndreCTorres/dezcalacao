// app/api/rounds/auto-close/route.ts
// Verifica se rodadas abertas podem ser fechadas automaticamente.
// Lógica:
//   1. Busca rodadas com status='open', auto_close=true e ends_at no passado
//   2. Verifica via API se todos os fixtures dessa rodada terminaram
//   3. Se sim: fecha a rodada e calcula pontuações automaticamente
//
// Chamado por:
//   - Cron do Vercel (vercel.json) — a cada hora
//   - Botão "Verificar Agora" no painel admin (GET com ?manual=true)
//
// Custo de API: 1 req por rodada que ainda não tem ends_at + 1 req por rodada
//   que está aguardando fechamento. Mínimo possível.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getFixturesStatus, isFixtureFinished } from '@/lib/apiFootball'
import { calculateRoundScores } from '@/lib/services/scoring.service'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  // Validar autenticação: cron secret ou chamada manual do admin
  const isManual = req.nextUrl.searchParams.get('manual') === 'true'
  const authHeader = req.headers.get('authorization')

  if (!isManual && CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = supabaseAdmin()

  try {
    console.log('[AutoClose] Verificando rodadas para fechamento automático...')

    // 1. Buscar rodadas abertas com auto_close=true
    const { data: openRounds } = await admin
      .from('rounds')
      .select('id, name, status, ends_at, fixture_ids, fixtures_done, fixtures_total, group_id')
      .eq('status', 'open')
      .eq('auto_close', true)

    if (!openRounds || openRounds.length === 0) {
      console.log('[AutoClose] Nenhuma rodada aberta com auto_close=true')
      return NextResponse.json({ message: 'Nenhuma rodada para verificar', closed: 0 })
    }

    console.log(`[AutoClose] ${openRounds.length} rodada(s) abertas para verificar`)

    const results: { round: string; action: string }[] = []

    for (const round of openRounds) {
      // Rodadas sem fixture_ids ainda não foram sincronizadas com a API
      if (!round.fixture_ids || round.fixture_ids.length === 0) {
        console.log(`[AutoClose] ${round.name}: sem fixtures vinculados, pulando`)
        results.push({ round: round.name, action: 'sem_fixtures' })
        continue
      }

      // Se ends_at está no futuro, os jogos ainda não acabaram
      if (round.ends_at && new Date(round.ends_at) > new Date()) {
        const minutesLeft = Math.round((new Date(round.ends_at).getTime() - Date.now()) / 60000)
        console.log(`[AutoClose] ${round.name}: ${minutesLeft}min até o fim estimado`)
        results.push({ round: round.name, action: `aguardando_${minutesLeft}min` })
        continue
      }

      // Verificar status real dos fixtures via API (1 req por rodada)
      console.log(`[AutoClose] ${round.name}: verificando ${round.fixture_ids.length} fixtures...`)

      let allDone = false
      let doneCount = 0

      try {
        const fixturesData = await getFixturesStatus(round.fixture_ids)
        doneCount = fixturesData.filter((f: any) =>
          isFixtureFinished(f.fixture?.status?.short)
        ).length

        allDone = doneCount === round.fixture_ids.length

        // Atualizar progresso no banco
        await admin
          .from('rounds')
          .update({ fixtures_done: doneCount })
          .eq('id', round.id)

        console.log(`[AutoClose] ${round.name}: ${doneCount}/${round.fixture_ids.length} jogos encerrados`)
      } catch (apiError: any) {
        console.warn(`[AutoClose] Erro ao verificar fixtures de ${round.name}:`, apiError.message)
        results.push({ round: round.name, action: 'erro_api' })
        continue
      }

      if (!allDone) {
        results.push({ round: round.name, action: `aguardando_${doneCount}/${round.fixture_ids.length}` })
        continue
      }

      // Todos os jogos terminaram — fechar a rodada!
      console.log(`[AutoClose] ✓ ${round.name}: todos os jogos encerrados. Fechando...`)

      try {
        // Buscar stats e calcular pontuações
        const scoreResult = await calculateRoundScores(round.group_id, round.id)

        if (!scoreResult.success) {
          console.error(`[AutoClose] Erro ao calcular scores de ${round.name}:`, scoreResult.error)
          results.push({ round: round.name, action: 'erro_scoring' })
          continue
        }

        // Marcar rodada como scored
        await admin
          .from('rounds')
          .update({
            status: 'scored',
            locked_at: new Date().toISOString(),
            fixtures_done: round.fixture_ids.length,
          })
          .eq('id', round.id)

        console.log(`[AutoClose] ✅ ${round.name} fechada automaticamente! ${scoreResult.count} membros pontuados.`)
        results.push({ round: round.name, action: 'fechada_automaticamente' })
      } catch (scoringError: any) {
        console.error(`[AutoClose] Erro ao fechar ${round.name}:`, scoringError.message)
        results.push({ round: round.name, action: 'erro_fechamento' })
      }
    }

    const closed = results.filter(r => r.action === 'fechada_automaticamente').length

    return NextResponse.json({
      checked: openRounds.length,
      closed,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[AutoClose] Erro geral:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
