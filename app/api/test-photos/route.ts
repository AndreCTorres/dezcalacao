// app/api/test-photos/route.ts
// TESTE ISOLADO: Validar se fotos da API-Football são acessíveis
// Retorna URLs de fotos de alguns jogadores famosos

import { NextResponse } from 'next/server'

const BASE_URL = 'https://v3.football.api-sports.io'

async function apiFootballGet(endpoint: string, params: Record<string, string | number> = {}) {
  const apiKey = process.env.API_FOOTBALL_KEY

  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY não está configurada')
  }

  const url = new URL(`${BASE_URL}${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })

  const response = await fetch(url.toString(), {
    headers: {
      'x-apisports-key': apiKey,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`API-Football erro ${response.status}`)
  }

  const json = await response.json()
  return json.response || []
}

async function checkPhotoUrl(url: string): Promise<{ url: string; status: number; accessible: boolean }> {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    return {
      url,
      status: response.status,
      accessible: response.status === 200,
    }
  } catch (error) {
    return {
      url,
      status: 0,
      accessible: false,
    }
  }
}

export async function GET() {
  try {
    console.log('\n========================================')
    console.log('[Test Photos] TESTE DE FOTOS')
    console.log('========================================\n')

    const results: any = {
      success: true,
      test: 'Validar se fotos da API-Football são acessíveis',
      timestamp: new Date().toISOString(),
    }

    // Buscar alguns times
    const teamsToTest = [
      { name: 'Brazil', id: 6 },
      { name: 'France', id: 25 },
      { name: 'England', id: 39 },
      { name: 'Argentina', id: 41 },
    ]

    const photoTests: any[] = []
    let totalPlayers = 0
    let totalPhotos = 0
    let accessiblePhotos = 0

    for (const team of teamsToTest) {
      console.log(`\n[Test Photos] Buscando squad de ${team.name} (ID: ${team.id})...`)

      try {
        const squadData = await apiFootballGet('/players/squads', { team: team.id })

        if (squadData.length === 0) {
          console.log(`[Test Photos] ⚠️ Nenhum squad para ${team.name}`)
          continue
        }

        const squad = squadData[0]
        const players = (squad.players || []).slice(0, 5) // Apenas 5 primeiros pra não sobrecarregar

        console.log(`[Test Photos] ${players.length} jogadores para testar`)

        for (const player of players) {
          totalPlayers++

          if (player.photo) {
            totalPhotos++
            const photoCheck = await checkPhotoUrl(player.photo)

            const status = photoCheck.accessible ? '✓' : '✗'
            console.log(
              `[Test Photos] ${status} ${player.name}: ${photoCheck.status} - ${photoCheck.accessible ? 'OK' : 'ERRO'}`
            )

            if (photoCheck.accessible) {
              accessiblePhotos++
            }

            photoTests.push({
              playerName: player.name,
              team: team.name,
              photoUrl: player.photo,
              status: photoCheck.status,
              accessible: photoCheck.accessible,
            })
          } else {
            console.log(`[Test Photos] - ${player.name}: SEM FOTO NA API`)
            photoTests.push({
              playerName: player.name,
              team: team.name,
              photoUrl: null,
              status: null,
              accessible: false,
            })
          }
        }
      } catch (error: any) {
        console.error(`[Test Photos] Erro ao buscar squad de ${team.name}:`, error.message)
      }
    }

    // Análise
    console.log('\n========================================')
    console.log('[Test Photos] === RESUMO ===')
    console.log(`[Test Photos] Total de jogadores testados: ${totalPlayers}`)
    console.log(`[Test Photos] Jogadores com foto na API: ${totalPhotos}`)
    console.log(`[Test Photos] Fotos acessíveis (HTTP 200): ${accessiblePhotos}`)

    const photoAccessRate = totalPhotos > 0 ? ((accessiblePhotos / totalPhotos) * 100).toFixed(1) : 0
    console.log(`[Test Photos] Taxa de acessibilidade: ${photoAccessRate}%`)

    if (accessiblePhotos > 0) {
      console.log('[Test Photos] ✓ FOTOS FUNCIONAM! Podem ser usadas no draft.')
    } else if (totalPhotos > 0) {
      console.log('[Test Photos] ⚠️ Fotos existem mas não são acessíveis (problema de CDN ou rate limit?)')
    } else {
      console.log('[Test Photos] ✗ API não fornece fotos ou estão vazias')
    }

    console.log('========================================\n')

    results.summary = {
      playersScanned: totalPlayers,
      playersWithPhoto: totalPhotos,
      photosAccessible: accessiblePhotos,
      accessibilityRate: `${photoAccessRate}%`,
      conclusion:
        accessiblePhotos > (totalPhotos * 0.8) ? 'VIÁVEL - Use fotos' : 'NÃO_VIÁVEL - Use tierlist externo',
    }

    results.photoTests = photoTests

    return NextResponse.json(results, { status: 200 })
  } catch (error: any) {
    console.error('[Test Photos] ❌ ERRO:', error.message)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
