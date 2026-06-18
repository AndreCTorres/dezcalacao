#!/usr/bin/env node

/**
 * scripts/bulk-insert-ratings.mjs
 * 
 * Script para inserir notas de jogadores em massa, a partir de JSON
 * extraído do ChatGPT (via screenshots).
 * 
 * SETUP:
 * 1. Extraia dados com PROMPT_EXTRAIR_NOTAS.md (usando ChatGPT)
 * 2. Cole o JSON aqui embaixo (substitua PASTE_JSON_HERE)
 * 3. Rode: node scripts/bulk-insert-ratings.mjs
 * 
 * SAÍDA:
 * - Mostra resumo dos dados
 * - Confirma antes de inserir
 * - Insere no banco + mostra resultados
 */

import { createClient } from '@supabase/supabase-js'

// ============================================================================
// COLE O JSON DO CHATGPT AQUI (formato com múltiplos jogos):
// ============================================================================

const DATA = [
  // COPIAR JSON DO CHATGPT AQUI, ex:
  // {
  //   "fixture": { "title": "BRASIL x URUGUAI", "homeTeam": "Brasil", "awayTeam": "Uruguai", "homeGoals": 2, "awayGoals": 1 },
  //   "players": [
  //     { "name": "Vinicius Jr", "team": "Brasil", "rating": 8.5, "minutes": 90 },
  //     { "name": "Luis Suárez", "team": "Uruguai", "rating": 6.8, "minutes": 88 }
  //   ]
  // }
]

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERRO: Variáveis de ambiente não configuradas!')
  console.error('   Certifique-se de ter .env.local com:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ============================================================================
// FUNÇÕES
// ============================================================================

async function findRound() {
  const { data: rounds, error } = await supabase
    .from('rounds')
    .select('id, name, group_id')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !rounds?.length) {
    console.error('❌ Nenhuma rodada aberta encontrada. Verifique o banco.')
    process.exit(1)
  }

  return rounds[0]
}

async function findFixtureByTeams(groupId, homeTeam, awayTeam) {
  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select('id, label, home_team, away_team')
    .eq('group_id', groupId)
    .or(`and(home_team.ilike.%${homeTeam}%,away_team.ilike.%${awayTeam}%),and(home_team.ilike.%${awayTeam}%,away_team.ilike.%${homeTeam}%)`)
    .limit(1)

  if (!fixtures?.length) return null
  return fixtures[0]
}

async function findPlayersByName(names) {
  const { data: players, error } = await supabase
    .from('players')
    .select('api_player_id, name, team_name')
    .in('name', names)

  if (error) console.warn('⚠️  Aviso ao buscar jogadores:', error.message)
  return players ?? []
}

async function insertRatings(roundId, fixtureId, ratings) {
  const { error } = await supabase
    .from('player_round_ratings')
    .upsert(ratings, { onConflict: 'player_id,fixture_id,round_id' })

  if (error) {
    console.error('❌ Erro ao inserir:', error.message)
    return false
  }
  return true
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n📊 BULK INSERT - Notas de Jogadores')
  console.log('=' .repeat(60))

  if (DATA.length === 0) {
    console.log(
      '❌ Nenhum dado encontrado.\n' +
      '   1. Copie o JSON do ChatGPT (PROMPT_EXTRAIR_NOTAS.md)\n' +
      '   2. Cole dentro de DATA = [ ... ] (linhas 20-40)\n' +
      '   3. Rode novamente\n'
    )
    process.exit(1)
  }

  console.log(`\n✅ ${DATA.length} jogo(s) para processar\n`)

  // Encontrar rodada aberta
  console.log('🔍 Procurando rodada aberta...')
  const round = await findRound()
  console.log(`   ✓ Rodada: "${round.name}" (ID: ${round.id})\n`)

  let totalPlayers = 0
  let totalInserted = 0

  // Processar cada jogo
  for (const [idx, job] of DATA.entries()) {
    const { fixture, players } = job
    console.log(`\n📍 Jogo ${idx + 1}: ${fixture.title}`)
    console.log(`   ${fixture.homeGoals} x ${fixture.awayGoals}`)

    // Encontrar fixture
    const fx = await findFixtureByTeams(round.group_id, fixture.homeTeam, fixture.awayTeam)
    if (!fx) {
      console.warn(`   ⚠️  Jogo não encontrado no banco (home: ${fixture.homeTeam}, away: ${fixture.awayTeam})`)
      console.warn(`       Pulando...\n`)
      continue
    }

    console.log(`   ✓ Fixture ID: ${fx.id}`)

    // Buscar jogadores
    const playerNames = players.map(p => p.name)
    const foundPlayers = await findPlayersByName(playerNames)

    console.log(`   👥 Jogadores: ${players.length} fornecidos, ${foundPlayers.length} encontrados`)

    // Montar ratings
    const ratings = []
    for (const p of players) {
      const found = foundPlayers.find(fp => fp.name === p.name)
      if (!found) {
        console.warn(`      ⚠️  "${p.name}" não encontrado (${p.team})`)
        continue
      }
      ratings.push({
        round_id: round.id,
        fixture_id: fx.id,
        player_id: found.api_player_id,
        rating: p.rating,
        minutes: p.minutes,
      })
    }

    totalPlayers += ratings.length

    // Inserir
    const ok = await insertRatings(round.id, fx.id, ratings)
    if (ok) {
      console.log(`   ✓ ${ratings.length} notas inseridas`)
      totalInserted += ratings.length
    } else {
      console.error(`   ✗ Erro ao inserir notas`)
    }
  }

  // Resumo
  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ CONCLUÍDO: ${totalInserted} notas inseridas no banco`)
  console.log(`   Rodada: "${round.name}"`)
  console.log(`   Jogos processados: ${DATA.length}`)
  console.log(`\n🎯 Próximos passos:`)
  console.log(`   1. Verifique em /admin/rodadas/${round.id}`)
  console.log(`   2. Se tudo certo, feche a rodada (calcular pontuação)`)
  console.log(`   3. Veja em /app/notas\n`)
}

main().catch(err => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
