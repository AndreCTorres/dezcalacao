// app/api/test-football/route.ts
// TESTE DE SANIDADE: Confirma se /players/squads já retorna convocados de 2026
// APENAS PARA DESENVOLVIMENTO - remover antes de produção.

import { NextResponse } from 'next/server'

const BASE_URL = 'https://v3.football.api-sports.io'

async function apiFootballGet(endpoint: string, params: Record<string, string | number> = {}) {
  const apiKey = process.env.API_FOOTBALL_KEY

  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY não está configurada no .env.local')
  }

  const url = new URL(`${BASE_URL}${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })

  console.log('[Test API] Chamando:', url.toString())

  const response = await fetch(url.toString(), {
    headers: {
      'x-apisports-key': apiKey,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API-Football erro ${response.status}: ${text}`)
  }

  const json = await response.json()
  console.log('[Test API] Resposta completa:', JSON.stringify(json, null, 2))
  return json
}

export async function GET() {
  try {
    console.log('\n========================================')
    console.log('[Test API] TESTE DE SANIDADE: SQUAD BRASIL 2026')
    console.log('========================================\n')

    const results: any = {
      success: true,
      test: 'Verificar se /players/squads retorna convocados de 2026',
      brazilTeamId: 6,
    }

    // ========================================
    // TESTE: Squad do Brasil (team_id = 6)
    // ========================================
    console.log('[Test API] Buscando squad do Brasil (ID: 6)...')
    
    const squadData = await apiFootballGet('/players/squads', { team: 6 })
    const squads = squadData.response || []

    if (squads.length === 0) {
      throw new Error('Nenhum squad retornado para o Brasil')
    }

    const squad = squads[0]
    const players = squad.players || []

    console.log('[Test API] Time:', squad.team?.name)
    console.log('[Test API] Total de jogadores:', players.length)

    // Jogadores que confirmam 2026 (não estavam em 2022 ou são muito jovens)
    const expectedPlayers2026 = ['Endrick', 'Vini', 'Vinicius', 'Rodrygo', 'Savinho']
    const playersFound2026: any[] = []
    const allPlayers: any[] = []

    console.log('\n[Test API] === LISTAGEM COMPLETA ===')
    players.forEach((player: any, idx: number) => {
      const playerInfo = {
        id: player.id,
        name: player.name,
        position: player.position,
        age: player.age,
        number: player.number,
      }

      allPlayers.push(playerInfo)

      console.log(`${idx + 1}. ${player.name} - ${player.position} (Idade: ${player.age}, ID: ${player.id})`)

      // Verificar se é um jogador característico de 2026
      if (expectedPlayers2026.some(name => player.name.includes(name))) {
        playersFound2026.push(playerInfo)
      }
    })

    // Análise
    console.log('\n[Test API] === ANÁLISE ===')
    console.log('[Test API] Jogadores encontrados:', players.length)
    console.log('[Test API] Jogadores característicos de 2026:', playersFound2026.length)

    if (playersFound2026.length > 0) {
      console.log('\n[Test API] ✓ CONFIRMADO: Squad é de 2026!')
      console.log('[Test API] Jogadores identificados:')
      playersFound2026.forEach(p => {
        console.log(`  - ${p.name} (${p.position}, ${p.age} anos)`)
      })
    } else {
      console.log('\n[Test API] ⚠️ ATENÇÃO: Não encontrei jogadores característicos de 2026')
      console.log('[Test API] Pode ser squad antigo ou nomes diferentes')
    }

    // Verificar goleiros e atacantes famosos
    const goalkeepers = players.filter((p: any) => p.position === 'Goalkeeper')
    const attackers = players.filter((p: any) => p.position === 'Attacker')

    console.log('\n[Test API] === POSIÇÕES ===')
    console.log('[Test API] Goleiros:', goalkeepers.length)
    goalkeepers.forEach((p: any) => console.log(`  - ${p.name} (${p.age} anos)`))
    
    console.log('[Test API] Atacantes:', attackers.length)
    attackers.forEach((p: any) => console.log(`  - ${p.name} (${p.age} anos)`))

    results.squad = {
      team: {
        id: squad.team?.id,
        name: squad.team?.name,
      },
      playersCount: players.length,
      playersFound2026,
      allPlayers,
      conclusion: playersFound2026.length > 0 
        ? '✓ SQUAD DE 2026 CONFIRMADO' 
        : '⚠️ Verificar manualmente se é 2026',
    }

    console.log('\n========================================')
    console.log('[Test API] CONCLUSÃO:', results.squad.conclusion)
    console.log('========================================\n')

    return NextResponse.json(results, { status: 200 })
  } catch (error: any) {
    console.error('\n[Test API] ❌ ERRO:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
