// app/api/rounds/sync-fixtures/route.ts
// Busca todos os fixtures da Copa 2026 na API-Football (1 req)
// e vincula cada jogo à rodada correspondente no nosso banco.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getFixtures, getFixturesRaw, toApiRoundName, isFixtureFinished } from '@/lib/apiFootball'
import { createActionClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  // Apenas admins autenticados podem chamar
  const supabase = await createActionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const admin = supabaseAdmin()

  // Verificar se é admin de algum grupo
  const { data: groups } = await admin
    .from('groups')
    .select('id')
    .eq('admin_id', user.id)
    .limit(1)

  if (!groups || groups.length === 0) {
    return NextResponse.json({ error: 'Apenas admins podem sincronizar fixtures' }, { status: 403 })
  }

  try {
    console.log('[SyncFixtures] Buscando todos os fixtures da Copa 2026...')

    // Buscar resposta raw para diagnóstico
    const rawResponse = await getFixturesRaw()
    console.log('[SyncFixtures] Raw response:', {
      results: rawResponse.results,
      errors: rawResponse.errors,
      paging: rawResponse.paging,
      firstFixture: rawResponse.response?.[0]?.league?.round,
    })

    const allFixtures: any[] = rawResponse.response || []
    console.log(`[SyncFixtures] ${allFixtures.length} fixtures recebidos da API`)

    // Se a API retornou erro ou vazio, reportar com detalhes
    if (allFixtures.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'A API retornou 0 fixtures para a Copa 2026. Pode ser que os dados ainda não estejam disponíveis.',
        apiErrors: rawResponse.errors,
        apiResults: rawResponse.results,
        tip: 'Verifique /api/test-football?fixtures_diag=1 para diagnóstico detalhado.',
      })
    }

    // Buscar rodadas do nosso banco
    const { data: rounds } = await admin
      .from('rounds')
      .select('id, name, group_id')

    if (!rounds || rounds.length === 0) {
      return NextResponse.json({ error: 'Nenhuma rodada no banco. Crie as rodadas primeiro.' })
    }

    // Agrupar fixtures por round name da API
    const fixturesByRound = new Map<string, any[]>()
    for (const f of allFixtures) {
      const apiRound: string = f.league?.round || ''
      if (!fixturesByRound.has(apiRound)) {
        fixturesByRound.set(apiRound, [])
      }
      fixturesByRound.get(apiRound)!.push(f)
    }

    console.log('[SyncFixtures] Rounds na API:')
    fixturesByRound.forEach((fixtures, round) => {
      console.log(`  "${round}": ${fixtures.length} fixtures`)
    })

    // Para cada rodada nossa, encontrar os fixtures correspondentes
    const updateResults: { round: string; fixtures: number; ends_at: string | null }[] = []

    for (const round of rounds) {
      const apiRoundName = toApiRoundName(round.name)
      if (!apiRoundName) {
        console.log(`[SyncFixtures] ${round.name}: sem mapeamento de API round name`)
        continue
      }

      // Busca exata ou fuzzy
      let matchedFixtures = fixturesByRound.get(apiRoundName)

      // Tentativa fuzzy se não achou exato
      if (!matchedFixtures) {
        const lowerApi = apiRoundName.toLowerCase()
        for (const [key, val] of fixturesByRound.entries()) {
          if (key.toLowerCase().includes(lowerApi) || lowerApi.includes(key.toLowerCase())) {
            matchedFixtures = val
            console.log(`[SyncFixtures] ${round.name}: match fuzzy com "${key}"`)
            break
          }
        }
      }

      if (!matchedFixtures || matchedFixtures.length === 0) {
        console.log(`[SyncFixtures] ${round.name}: nenhum fixture encontrado para "${apiRoundName}"`)
        continue
      }

      // Calcular ends_at = horário do último jogo + 2h (tempo máximo de jogo)
      const sortedByDate = [...matchedFixtures].sort((a, b) =>
        new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime()
      )
      const lastFixtureDate = sortedByDate[0]?.fixture?.date
      const endsAt = lastFixtureDate
        ? new Date(new Date(lastFixtureDate).getTime() + 2 * 60 * 60 * 1000).toISOString()
        : null

      const fixtureIds = matchedFixtures.map((f: any) => f.fixture.id)
      const fixturesDone = matchedFixtures.filter((f: any) =>
        isFixtureFinished(f.fixture?.status?.short)
      ).length

      // Upsert nos fixtures do nosso banco
      for (const f of matchedFixtures) {
        await admin.from('fixtures').upsert({
          id: f.fixture.id,
          round_id: round.id,
          home_team: f.teams?.home?.name || '',
          away_team: f.teams?.away?.name || '',
          kickoff: f.fixture.date,
          status: f.fixture.status?.short || 'NS',
        }, { onConflict: 'id' })
      }

      // Atualizar rodada com fixture_ids e ends_at
      await admin
        .from('rounds')
        .update({
          fixture_ids: fixtureIds,
          fixtures_total: fixtureIds.length,
          fixtures_done: fixturesDone,
          ends_at: endsAt,
          starts_at: sortedByDate[sortedByDate.length - 1]?.fixture?.date || null,
        })
        .eq('id', round.id)

      console.log(`[SyncFixtures] ✓ ${round.name}: ${fixtureIds.length} fixtures, ends_at: ${endsAt}`)
      updateResults.push({ round: round.name, fixtures: fixtureIds.length, ends_at: endsAt })
    }

    return NextResponse.json({
      success: true,
      totalFixtures: allFixtures.length,
      roundsUpdated: updateResults.length,
      rounds: updateResults,
    })
  } catch (error: any) {
    console.error('[SyncFixtures] Erro:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
