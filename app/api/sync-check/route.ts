// app/api/sync-check/route.ts
// Verificar ANTES de sincronizar quais seleções faltam
// Zero requisições à API-Football — só queries no banco

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Forçar execução dinâmica — nunca cachear esta rota
export const dynamic = 'force-dynamic'

const WORLD_CUP_2026_COUNTRIES = [
  'Germany', 'England', 'Austria', 'Belgium', 'Bosnia & Herzegovina', 'Croatia',
  'Scotland', 'Spain', 'France', 'Norway', 'Netherlands', 'Portugal', 'Sweden',
  'Switzerland', 'Czechia', 'Turkey', 'Argentina', 'Brazil', 'Colombia', 'Ecuador',
  'Paraguay', 'Uruguay', 'Canada', 'USA', 'Mexico', 'Curaçao', 'Haiti', 'Panama',
  'South Africa', 'Algeria', 'Cape Verde', 'Ivory Coast', 'Egypt', 'Ghana',
  'Morocco', 'DR Congo', 'Senegal', 'Tunisia', 'Saudi Arabia', 'Australia', 'Iraq',
  'Japan', 'Jordan', 'Uzbekistan', 'Qatar', 'South Korea', 'Iran', 'New Zealand',
]

// Mapeamento de nomes conhecidos da API que diferem da nossa lista
// (mesmo mapeamento de app/admin/actions.ts)
const COUNTRY_NAME_MAPPING: Record<string, string> = {
  'South Korea': 'Korea Republic',
  'DR Congo': 'Congo DR',
  'Czechia': 'Czech Republic',
  'Turkey': 'Türkiye',
  'Ivory Coast': "Cote D'Ivoire",
  'Cape Verde': 'Cape Verde Islands',
  'Bosnia & Herzegovina': 'Bosnia',
  'Curaçao': 'Curacao',
  'New Zealand': 'New Zealand',
  'USA': 'United States',
}

export async function GET() {
  try {
    const admin = supabaseAdmin()

    console.log('\n========================================')
    console.log('[Sync Check] Verificando banco (SEM requisições à API)')
    console.log('========================================\n')

    // ========================================
    // PASSO 1: Quantos times já têm ID resolvido?
    // ========================================
    console.log('[Sync Check] Passo 1: Verificando times resolvidos...')

    const { data: resolvedTeams, error: teamsError } = await admin
      .from('teams')
      .select('country, id, api_name')
      .eq('national', true)
      .eq('season', 'WC2026')

    if (teamsError) {
      throw new Error(`Erro ao buscar times: ${teamsError.message}`)
    }

    const resolvedCountries = new Set<string>()
    const resolvedMap = new Map<string, { id: number; name: string }>()

    if (resolvedTeams) {
      for (const team of resolvedTeams) {
        resolvedCountries.add(team.country)
        resolvedMap.set(team.country, { id: team.id, name: team.api_name })
      }
    }

    const pendingCountries = WORLD_CUP_2026_COUNTRIES.filter(
      (c) => !resolvedCountries.has(c)
    )

    console.log(`[Sync Check] ✓ Times resolvidos: ${resolvedCountries.size} / 48`)
    console.log(`[Sync Check] ⏳ Times pendentes: ${pendingCountries.length} / 48`)

    if (resolvedCountries.size > 0) {
      console.log('\n[Sync Check] === RESOLVIDOS (não precisa mais requisição de search) ===')
      Array.from(resolvedCountries)
        .sort()
        .forEach((country) => {
          const team = resolvedMap.get(country)
          console.log(`  ✓ ${country.padEnd(25)} (ID: ${team?.id}, ${team?.name})`)
        })
    }

    if (pendingCountries.length > 0) {
      console.log('\n[Sync Check] === PENDENTES (vai gastar 1 search + 1 squad cada) ===')
      pendingCountries.forEach((country) => {
        console.log(`  ⏳ ${country}`)
      })
    }

    // ========================================
    // PASSO 2: Para times RESOLVIDOS, quantos já têm jogadores?
    // ========================================
    console.log('\n[Sync Check] Passo 2: Verificando jogadores dos times resolvidos...')

    const teamsWithPlayers = new Set<number>()
    const teamsWithoutPlayers = new Set<number>()

    if (resolvedTeams && resolvedTeams.length > 0) {
      const { data: playersGrouped } = await admin
        .from('players')
        .select('team_id')
        .eq('season', 'WC2026')

      if (playersGrouped) {
        const teamIds = new Set(playersGrouped.map((p: any) => p.team_id))
        for (const [_, { id }] of Array.from(resolvedMap.entries())) {
          if (teamIds.has(id)) {
            teamsWithPlayers.add(id)
          } else {
            teamsWithoutPlayers.add(id)
          }
        }
      }
    }

    console.log(`[Sync Check] ✓ Times com elenco: ${teamsWithPlayers.size}`)
    console.log(`[Sync Check] ⏳ Times sem elenco: ${teamsWithoutPlayers.size}`)

    if (teamsWithoutPlayers.size > 0) {
      console.log('\n[Sync Check] === TIMES RESOLVIDOS SEM JOGADORES (vai gastar 1 squad cada) ===')
      for (const [country, { id, name }] of Array.from(resolvedMap.entries())) {
        if (teamsWithoutPlayers.has(id)) {
          console.log(`  ⏳ ${country.padEnd(25)} (ID: ${id}, ${name})`)
        }
      }
    }

    // ========================================
    // PASSO 3: Calcular requisições que será preciso gastar
    // ========================================
    console.log('\n[Sync Check] Passo 3: Cálculo de requisições necessárias...')

    const reqSearch = pendingCountries.length // 1 search por país pendente
    const reqSquad = pendingCountries.length + teamsWithoutPlayers.size // 1 squad por país pendente + times sem jogadores

    const totalReq = reqSearch + reqSquad

    console.log(`\n[Sync Check] === RESUMO DE REQUISIÇÕES ===`)
    console.log(`[Sync Check] Search de países pendentes: ${reqSearch}`)
    console.log(`[Sync Check] Squad de novos países: ${pendingCountries.length}`)
    console.log(`[Sync Check] Squad de países sem jogadores: ${teamsWithoutPlayers.size}`)
    console.log(`[Sync Check] ────────────────────────────`)
    console.log(`[Sync Check] TOTAL DE REQUISIÇÕES: ${totalReq}`)
    console.log(`[Sync Check] TEMPO ESTIMADO: ${Math.ceil(totalReq * 6.5 / 60)} minutos (com throttle 6.5s)`)

    // ========================================
    // PASSO 4: Recomendação
    // ========================================
    console.log(`\n[Sync Check] === RECOMENDAÇÃO ===`)
    if (totalReq === 0) {
      console.log('[Sync Check] ✅ Todos os times e jogadores já estão sincronizados!')
      console.log('[Sync Check] Você não precisa rodar syncPlayers() agora.')
    } else if (totalReq <= 50) {
      console.log(`[Sync Check] ⚡ Rápido! Só ${totalReq} requisições (~${Math.ceil(totalReq * 6.5 / 60)} min)`)
    } else {
      console.log(`[Sync Check] ⏱️ Vai levar ${Math.ceil(totalReq * 6.5 / 60)} minutos`)
    }

    console.log('\n========================================\n')

    // ========================================
    // RESPOSTA JSON
    // ========================================
    return NextResponse.json({
      success: true,
      summary: {
        teamsResolved: resolvedCountries.size,
        teamsPending: pendingCountries.length,
        teamsWithPlayers: teamsWithPlayers.size,
        teamsWithoutPlayers: teamsWithoutPlayers.size,
      },
      requisitions: {
        searchNeeded: reqSearch,
        squadNeeded: reqSquad,
        total: totalReq,
        estimatedMinutes: Math.ceil(totalReq * 6.5 / 60),
      },
      details: {
        resolved: Array.from(resolvedCountries).sort(),
        pending: pendingCountries,
        teamsWithoutPlayers: Array.from(teamsWithoutPlayers),
      },
      recommendation:
        totalReq === 0
          ? '✅ Nada a sincronizar'
          : totalReq <= 50
            ? `⚡ Rápido: ${totalReq} requisições (~${Math.ceil(totalReq * 6.5 / 60)} min)`
            : `⏱️ Aguarde: ${totalReq} requisições (~${Math.ceil(totalReq * 6.5 / 60)} min)`,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    })
  } catch (error: any) {
    console.error('[Sync Check] ❌ Erro:', error.message)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
