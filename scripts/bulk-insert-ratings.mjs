import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName)
  if (!existsSync(filePath)) return

  const content = readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const eqIndex = line.indexOf('=')
    if (eqIndex === -1) continue

    const key = line.slice(0, eqIndex).trim()
    let value = line.slice(eqIndex + 1).trim()
    value = value.replace(/^['"]|['"]$/g, '')

    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const args = process.argv.slice(2)
const options = {
  dryRun: args.includes('--dry-run'),
  allowUnmatched: args.includes('--allow-unmatched'),
  minScore: Number(args.find((arg) => arg.startsWith('--min-score='))?.split('=')[1] ?? 0.72),
}
const positional = args.filter((arg) => !arg.startsWith('--'))
const [groupId, roundId, inputFile] = positional

function usage() {
  console.log(`
Uso:
  node scripts/bulk-insert-ratings.mjs <groupId> <roundId> <arquivo.json> [--dry-run] [--allow-unmatched] [--min-score=0.72]

Formato do JSON:
  {
    "matches": [
      {
        "label": "Qatar x Switzerland",
        "home": "Qatar",
        "away": "Switzerland",
        "ratings": [
          { "name": "M. I. Abunada", "rating": 6.9, "minutes": 90 }
        ]
      }
    ]
  }
`)
}

if (!groupId || !roundId || !inputFile) {
  usage()
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no ambiente ou .env.local.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  const rows = Array.from({ length: b.length + 1 }, (_, i) => [i])
  for (let j = 0; j <= a.length; j++) rows[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      rows[i][j] = b[i - 1] === a[j - 1]
        ? rows[i - 1][j - 1]
        : Math.min(rows[i - 1][j - 1] + 1, rows[i][j - 1] + 1, rows[i - 1][j] + 1)
    }
  }

  return rows[b.length][a.length]
}

function similarityScore(a, b) {
  const left = normalizeText(a)
  const right = normalizeText(b)
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) return 0.94

  const distance = levenshtein(left, right)
  return 1 - distance / Math.max(left.length, right.length)
}

function findBestPlayer(inputName, candidates, usedPlayerIds) {
  let best = null
  let bestScore = options.minScore

  for (const candidate of candidates) {
    if (usedPlayerIds.has(candidate.id)) continue

    const score = similarityScore(inputName, candidate.name)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return best ? { player: best, score: bestScore } : null
}

function validateInput(payload) {
  if (!payload || !Array.isArray(payload.matches)) {
    throw new Error('O JSON precisa ter uma propriedade "matches" com uma lista de jogos.')
  }

  for (const [matchIndex, match] of payload.matches.entries()) {
    if (!match.home || !match.away) {
      throw new Error(`Jogo ${matchIndex + 1}: informe "home" e "away".`)
    }
    if (!Array.isArray(match.ratings) || match.ratings.length === 0) {
      throw new Error(`Jogo ${match.label ?? matchIndex + 1}: informe uma lista "ratings".`)
    }

    for (const [ratingIndex, row] of match.ratings.entries()) {
      const label = `${match.label ?? `${match.home} x ${match.away}`} / linha ${ratingIndex + 1}`
      if (!row.name) throw new Error(`${label}: informe o nome do jogador.`)
      if (!Number.isFinite(Number(row.rating)) || Number(row.rating) < 0 || Number(row.rating) > 10) {
        throw new Error(`${label}: nota deve ser um numero entre 0 e 10.`)
      }
      if (!Number.isInteger(Number(row.minutes)) || Number(row.minutes) < 0 || Number(row.minutes) > 120) {
        throw new Error(`${label}: minutos devem ser um inteiro entre 0 e 120.`)
      }
    }
  }
}

async function ensureRoundBelongsToGroup() {
  const { data, error } = await supabase
    .from('rounds')
    .select('id, group_id, name')
    .eq('id', roundId)
    .eq('group_id', groupId)
    .single()

  if (error || !data) {
    throw new Error('Rodada nao encontrada para este grupo.')
  }

  return data
}

async function fetchPlayersByTeam() {
  const { data, error } = await supabase
    .from('players')
    .select('id, name, team_name, position')
    .eq('season', 'WC2026')

  if (error || !data) {
    throw new Error(`Erro ao buscar jogadores: ${error?.message ?? 'sem dados'}`)
  }

  const teams = new Map()
  for (const player of data) {
    const key = normalizeText(player.team_name)
    if (!teams.has(key)) teams.set(key, [])
    teams.get(key).push(player)
  }

  return teams
}

async function findOrCreateFixture(match, index) {
  const label = match.label?.trim() || `${match.home} x ${match.away}`
  const home = match.home.trim()
  const away = match.away.trim()

  const { data: existing } = await supabase
    .from('fixtures')
    .select('id, label, home_team, away_team')
    .eq('round_id', roundId)
    .eq('home_team', home)
    .eq('away_team', away)
    .maybeSingle()

  if (existing) return existing

  if (options.dryRun) {
    return {
      id: Number(`${Date.now()}${String(index).padStart(3, '0')}`),
      label,
      home_team: home,
      away_team: away,
      dryRun: true,
    }
  }

  const fixtureId = Date.now() * 1000 + index
  const { data, error } = await supabase
    .from('fixtures')
    .insert({
      id: fixtureId,
      round_id: roundId,
      home_team: home,
      away_team: away,
      label,
      status: 'FT',
    })
    .select('id, label, home_team, away_team')
    .single()

  if (error || !data) {
    throw new Error(`Erro ao criar jogo ${label}: ${error?.message ?? 'sem dados'}`)
  }

  return data
}

async function updateRoundFixtureSummary() {
  if (options.dryRun) return

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('id')
    .eq('round_id', roundId)

  const fixtureIds = (fixtures ?? []).map((fixture) => fixture.id)
  await supabase
    .from('rounds')
    .update({
      fixture_ids: fixtureIds,
      fixtures_total: fixtureIds.length,
      fixtures_done: fixtureIds.length,
    })
    .eq('id', roundId)
}

async function run() {
  const filePath = resolve(process.cwd(), inputFile)
  const payload = JSON.parse(readFileSync(filePath, 'utf8'))
  validateInput(payload)

  const round = await ensureRoundBelongsToGroup()
  const playersByTeam = await fetchPlayersByTeam()
  const rows = []
  const unmatched = []
  const lowConfidence = []

  console.log(`Rodada: ${round.name}`)
  console.log(`Modo: ${options.dryRun ? 'simulacao' : 'gravacao'}\n`)

  for (const [index, match] of payload.matches.entries()) {
    const label = match.label?.trim() || `${match.home} x ${match.away}`
    const homePlayers = playersByTeam.get(normalizeText(match.home)) ?? []
    const awayPlayers = playersByTeam.get(normalizeText(match.away)) ?? []
    const candidates = [...homePlayers, ...awayPlayers]
    const usedPlayerIds = new Set()

    if (candidates.length === 0) {
      unmatched.push({ match: label, name: '(jogo inteiro)', reason: `Times nao encontrados: ${match.home} / ${match.away}` })
      continue
    }

    const fixture = await findOrCreateFixture(match, index)
    let matchedCount = 0

    for (const rating of match.ratings) {
      const found = findBestPlayer(rating.name, candidates, usedPlayerIds)

      if (!found) {
        const suggestions = candidates
          .map((candidate) => ({
            name: candidate.name,
            score: similarityScore(rating.name, candidate.name),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((candidate) => `${candidate.name} (${Math.round(candidate.score * 100)}%)`)

        unmatched.push({ match: label, name: rating.name, suggestions })
        continue
      }

      usedPlayerIds.add(found.player.id)
      matchedCount++

      if (found.score < 0.86) {
        lowConfidence.push({
          match: label,
          input: rating.name,
          matched: found.player.name,
          score: Math.round(found.score * 100),
        })
      }

      rows.push({
        player_id: found.player.id,
        round_id: roundId,
        fixture_id: fixture.id,
        rating: Number(Number(rating.rating).toFixed(2)),
        minutes: Number(rating.minutes),
        source: 'manual',
        fetched_at: new Date().toISOString(),
      })
    }

    console.log(`${label}: ${matchedCount}/${match.ratings.length} jogadores encontrados`)
  }

  if (lowConfidence.length > 0) {
    console.log('\nConferir matches menos obvios:')
    for (const item of lowConfidence.slice(0, 20)) {
      console.log(`- ${item.match}: "${item.input}" -> "${item.matched}" (${item.score}%)`)
    }
    if (lowConfidence.length > 20) console.log(`- ...mais ${lowConfidence.length - 20}`)
  }

  if (unmatched.length > 0) {
    console.log('\nNao encontrados:')
    for (const item of unmatched) {
      console.log(`- ${item.match}: ${item.name}`)
      if (item.reason) console.log(`  ${item.reason}`)
      if (item.suggestions?.length) console.log(`  Sugestoes: ${item.suggestions.join(', ')}`)
    }

    if (!options.allowUnmatched) {
      console.log('\nNada foi gravado. Corrija o arquivo ou rode com --allow-unmatched para gravar apenas os encontrados.')
      process.exit(1)
    }
  }

  if (options.dryRun) {
    console.log(`\nSimulacao concluida: ${rows.length} ratings prontos para gravar.`)
    return
  }

  if (rows.length === 0) {
    console.log('\nNenhum rating para gravar.')
    return
  }

  const { error } = await supabase
    .from('player_round_ratings')
    .upsert(rows, { onConflict: 'player_id,round_id' })

  if (error) {
    throw new Error(`Erro ao gravar ratings: ${error.message}`)
  }

  await updateRoundFixtureSummary()

  console.log(`\nConcluido: ${rows.length} ratings gravados.`)
  console.log('Agora recalcule a rodada pela tela /admin/rodadas ou pelo botao "Recalcular pontuacao".')
}

run().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
