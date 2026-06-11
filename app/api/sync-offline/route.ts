// app/api/sync-offline/route.ts
// Sincronização OFFLINE: usar dados já resolvidos + completar manualmente os 4 pendentes
// Sem gastar requisições da API-Football!

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    console.log('\n========================================')
    console.log('[Sync Offline] Sincronizando offline (sem gastar requests)')
    console.log('========================================\n')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Faltam variáveis de ambiente do Supabase')
    }

    const admin = createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'public' },
    })

    // ========================================
    // PASSO 1: Completar os 4 times pendentes
    // ========================================
    console.log('[Sync Offline] Passo 1: Adicionando 4 seleções pendentes...')

    const pendingTeams = [
      { id: 2500, name: 'Bosnia', country: 'Bosnia and Herzegovina' },
      { id: 2501, name: 'Turkey', country: 'Turkey' },
      { id: 2502, name: 'Curacao', country: 'Curacao' },
      { id: 2503, name: 'Ivory Coast', country: 'Ivory Coast' },
    ]

    for (const team of pendingTeams) {
      const { error } = await admin.from('teams').upsert(
        {
          id: team.id,
          name: team.name,
          country: team.country,
          api_name: team.name,
          national: true,
          season: 'WC2026',
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

      if (error) {
        console.error(`[Sync Offline] ✗ Erro ao adicionar ${team.country}:`, error.message)
      } else {
        console.log(`[Sync Offline] ✓ ${team.country} adicionado`)
      }
    }

    // ========================================
    // PASSO 2: Buscar todos os times já resolvidos
    // ========================================
    console.log('\n[Sync Offline] Passo 2: Verificando times já resolvidos...')

    const { data: allTeams, error: teamsError } = await admin
      .from('teams')
      .select('id, name, country')
      .eq('national', true)
      .eq('season', 'WC2026')

    if (teamsError) {
      throw new Error(`Erro ao buscar times: ${teamsError.message}`)
    }

    console.log(`[Sync Offline] ✓ ${allTeams?.length || 0} times encontrados`)

    // ========================================
    // PASSO 3: Status da sincronização
    // ========================================
    const { data: playerCount, error: countError } = await admin
      .from('players')
      .select('id', { count: 'exact', head: true })

    const totalPlayers = playerCount ? playerCount.length : 0

    console.log('\n[Sync Offline] ========================================')
    console.log('[Sync Offline] STATUS')
    console.log('[Sync Offline] ========================================')
    console.log(`[Sync Offline] Times no banco: ${allTeams?.length || 0}/48`)
    console.log(`[Sync Offline] Jogadores no banco: ${totalPlayers}`)
    console.log('[Sync Offline] ========================================\n')

    return NextResponse.json({
      success: true,
      message: 'Offline sync completo. Use API-Football amanhã pra puxar jogadores.',
      data: {
        teamsInDatabase: allTeams?.length || 0,
        playersInDatabase: totalPlayers,
        nextStep: 'syncPlayers() com 48 times disponíveis',
        recommendation:
          'Você tem 2 requests sobrando hoje. Guarde pra amanhã quando reset. Rodas syncPlayers() amanhã pra puxar todos os elencos.',
      },
    })
  } catch (error: any) {
    console.error('[Sync Offline] ❌ Erro:', error.message)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
