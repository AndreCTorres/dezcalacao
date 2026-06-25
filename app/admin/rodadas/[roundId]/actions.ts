'use server'

// app/admin/rodadas/[roundId]/actions.ts
// Server Actions para gerenciamento manual de ratings por rodada

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { calculateRoundScores } from '@/lib/services/scoring.service'

/**
 * Criar um fixture manual vinculado a uma rodada
 * (sem depender da API-Football Ã¢â‚¬â€ admin registra os jogos manualmente)
 */
export async function createManualFixture(
  roundId: string,
  homeTeam: string,
  awayTeam: string,
  label?: string
) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'NÃƒÂ£o autenticado' }

  const admin = supabaseAdmin()
  const cleanHome = homeTeam.trim()
  const cleanAway = awayTeam.trim()
  const cleanLabel = label?.trim()

  if (!cleanHome || !cleanAway) {
    return { success: false, error: 'Informe as duas selecoes' }
  }

  // Validar que a rodada pertence a um grupo do qual o user ÃƒÂ© admin
  const { data: round } = await admin
    .from('rounds')
    .select('id, group_id, groups!inner(admin_id)')
    .eq('id', roundId)
    .single()

  if (!round || (round.groups as any).admin_id !== user.id) {
    return { success: false, error: 'Sem permissÃƒÂ£o' }
  }

  const { data: existingFixtures } = await admin
    .from('fixtures')
    .select('id, round_id, home_team, away_team, label, status, home_goals, away_goals, kickoff')
    .eq('round_id', roundId)
    .eq('home_team', cleanHome)
    .eq('away_team', cleanAway)
    .order('id', { ascending: true })
    .limit(1)

  const existingFixture = existingFixtures?.[0]
  if (existingFixture) {
    return { success: true, fixture: existingFixture, alreadyExists: true }
  }

  // Gerar um ID ÃƒÂºnico para o fixture manual (usa timestamp + random para evitar colisÃƒÂ£o)
  const manualId = Date.now() * 1000 + Math.floor(Math.random() * 1000)

  const { data: fixture, error } = await admin
    .from('fixtures')
    .insert({
      id: manualId,
      round_id: roundId,
      home_team: cleanHome,
      away_team: cleanAway,
      label: cleanLabel || `${cleanHome} x ${cleanAway}`,
      status: 'FT',
    })
    .select()
    .single()

  if (error) {
    console.error('[ManualRatings] Erro ao criar fixture:', error)
    return { success: false, error: error.message }
  }

  const { data: roundFixtures } = await admin
    .from('fixtures')
    .select('id')
    .eq('round_id', roundId)

  const fixtureIds = (roundFixtures ?? []).map((f: any) => f.id)
  await admin
    .from('rounds')
    .update({
      fixture_ids: fixtureIds,
      fixtures_total: fixtureIds.length,
      fixtures_done: fixtureIds.length,
    })
    .eq('id', roundId)

  revalidatePath(`/admin/rodadas/${roundId}`)
  revalidatePath('/admin/rodadas')
  return { success: true, fixture }
}

/**
 * Upsert de rating manual de um jogador em uma rodada
 * Usado pelo admin ao digitar as notas do Sofascore/FotMob
 */
export async function upsertPlayerRating(
  roundId: string,
  playerId: number,
  rating: number | null,
  minutes: number,
  fixtureId?: number
) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'NÃƒÂ£o autenticado' }

  const admin = supabaseAdmin()

  // Validar que a rodada pertence a grupo administrado pelo user
  const { data: round } = await admin
    .from('rounds')
    .select('id, group_id, groups!inner(admin_id)')
    .eq('id', roundId)
    .single()

  if (!round || (round.groups as any).admin_id !== user.id) {
    return { success: false, error: 'Sem permissÃƒÂ£o' }
  }

  // Validar rating (0-10, duas casas decimais)
  if (rating !== null && (rating < 0 || rating > 10)) {
    return { success: false, error: 'Nota deve ser entre 0 e 10' }
  }

  const { error } = await admin
    .from('player_round_ratings')
    .upsert(
      {
        player_id: playerId,
        round_id: roundId,
        fixture_id: fixtureId ?? null,
        rating: rating !== null ? parseFloat(rating.toFixed(2)) : null,
        minutes,
        source: 'manual',
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'player_id,round_id' }
    )

  if (error) {
    console.error('[ManualRatings] Erro ao upsert rating:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/admin/rodadas/${roundId}`)
  revalidatePath('/app')
  return { success: true }
}

/**
 * Upsert em batch Ã¢â‚¬â€ recebe um array de ratings do mesmo jogo
 * Mais eficiente que chamar upsertPlayerRating N vezes
 */
export async function upsertBatchRatings(
  roundId: string,
  fixtureId: number,
  ratings: Array<{ playerId: number; rating: number | null; minutes: number; lineupRole?: 'starter' | 'substitute' | null }>
) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'NÃƒÂ£o autenticado' }

  const admin = supabaseAdmin()

  // Validar permissÃƒÂ£o
  const { data: round } = await admin
    .from('rounds')
    .select('id, group_id, groups!inner(admin_id)')
    .eq('id', roundId)
    .single()

  if (!round || (round.groups as any).admin_id !== user.id) {
    return { success: false, error: 'Sem permissÃƒÂ£o' }
  }

  for (const r of ratings) {
    if (r.rating !== null && (r.rating < 0 || r.rating > 10)) {
      return { success: false, error: 'Notas devem estar entre 0 e 10' }
    }
    if (r.minutes < 0 || r.minutes > 120) {
      return { success: false, error: 'Minutos devem estar entre 0 e 120' }
    }
  }

  // Validar que fixture_id ÃƒÂ© vÃƒÂ¡lido
  if (!fixtureId || fixtureId <= 0) {
    return { success: false, error: 'Fixture invÃƒÂ¡lido' }
  }

  const rows = ratings
    .filter((r) => r.rating !== null)
    .map((r) => ({
      player_id: r.playerId,
      round_id: roundId,
      fixture_id: fixtureId,
      rating: parseFloat(r.rating!.toFixed(2)),
      minutes: r.minutes,
      lineup_role: r.lineupRole ?? null,
      source: 'manual' as const,
      fetched_at: new Date().toISOString(),
    }))

  if (rows.length === 0) {
    return { success: false, error: 'Preencha pelo menos uma nota antes de salvar.' }
  }

  console.log(`[ManualRatings] Salvando ${rows.length} ratings para fixture ${fixtureId}, rodada ${roundId}`)

  const { error } = await admin
    .from('player_round_ratings')
    .upsert(rows, { onConflict: 'player_id,round_id' })

  if (error) {
    console.error('[ManualRatings] Erro no batch upsert:', error)
    return { success: false, error: error.message }
  }

  console.log(`[ManualRatings] Ã¢Å“â€¦ ${rows.length} ratings salvos com sucesso para fixture ${fixtureId}, rodada ${roundId}`)

  revalidatePath(`/admin/rodadas/${roundId}`)
  revalidatePath('/app')
  return { success: true, inserted: rows.length }
}

export async function upsertManualRatingsByName(
  roundId: string,
  fixtureId: number,
  entries: Array<{ name: string; team?: string; rating: number; minutes: number; lineupRole?: 'starter' | 'substitute' | null; playerId?: number }>,
  teamHints: string[] = []
) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Nao autenticado' }

  const admin = supabaseAdmin()

  const { data: round } = await admin
    .from('rounds')
    .select('id, group_id, groups!inner(admin_id)')
    .eq('id', roundId)
    .single()

  if (!round || (round.groups as any).admin_id !== user.id) {
    return { success: false, error: 'Sem permissao' }
  }

  const { data: players } = await admin
    .from('players')
    .select('id, name, team_name, position')

  if (!players || players.length === 0) {
    return { success: false, error: 'Nenhum jogador cadastrado no banco' }
  }

  const { data: fixture } = await admin
    .from('fixtures')
    .select('home_team, away_team, label')
    .eq('id', fixtureId)
    .single()

  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const TEAM_ALIASES: Record<string, string[]> = {
    // SuÃƒÂ­ÃƒÂ§a
    suica: ['switzerland', 'swiss', 'sui'],
    switzerland: ['suica', 'swiss', 'sui'],
    // Qatar / Catar
    catar: ['qatar'],
    qatar: ['catar'],
    // Coreia do Sul
    'coreia do sul': ['south korea', 'korea republic'],
    'south korea': ['coreia do sul', 'korea republic'],
    'korea republic': ['south korea', 'coreia do sul'],
    // RepÃƒÂºblica Tcheca
    'rep tcheca': ['czech republic', 'czechia'],
    'republica tcheca': ['czech republic', 'czechia'],
    'czech republic': ['rep tcheca', 'republica tcheca', 'czechia'],
    czechia: ['czech republic', 'rep tcheca'],
    // EUA
    eua: ['usa', 'united states', 'estados unidos'],
    usa: ['eua', 'united states', 'estados unidos'],
    'united states': ['usa', 'eua', 'estados unidos'],
    'estados unidos': ['usa', 'united states', 'eua'],
    // Alemanha
    alemanha: ['germany'],
    germany: ['alemanha'],
    // Brasil
    brasil: ['brazil'],
    brazil: ['brasil'],
    // JapÃƒÂ£o
    japao: ['japan'],
    japan: ['japao'],
    // Marrocos
    marrocos: ['morocco'],
    morocco: ['marrocos'],
    // CuraÃƒÂ§ao
    curacao: ['curacao'],
    // Turquia
    turquia: ['turkiye', 'turkey'],
    turkey: ['turkiye', 'turquia'],
    turkiye: ['turkey', 'turquia'],
    // BÃƒÂ³snia
    bosnia: ['bosnia & herzegovina', 'bosnia and herzegovina'],
    'bosnia & herzegovina': ['bosnia', 'bosnia and herzegovina'],
    'bosnia and herzegovina': ['bosnia', 'bosnia & herzegovina'],
    'bosnia herzegovina': ['bosnia', 'bosnia & herzegovina', 'bosnia and herzegovina'],
    // Holanda
    holanda: ['netherlands'],
    netherlands: ['holanda'],
    // Costa do Marfim
    'costa do marfim': ['ivory coast', 'cote d ivoire', 'cote divoire'],
    'ivory coast': ['costa do marfim', 'cote d ivoire', 'cote divoire'],
    'cote d ivoire': ['ivory coast', 'costa do marfim', 'cote divoire'],
    'cote divoire': ['ivory coast', 'costa do marfim', 'cote d ivoire'],
    // Equador
    equador: ['ecuador'],
    ecuador: ['equador'],
    // Paraguai
    paraguai: ['paraguay'],
    paraguay: ['paraguai'],
    // MÃƒÂ©xico
    mexico: ['mexico'],
    // ÃƒÂfrica do Sul
    'africa do sul': ['south africa'],
    'south africa': ['africa do sul'],
    // Cabo Verde
    'cape verde': ['cape verde islands', 'cabo verde'],
    'cape verde islands': ['cape verde', 'cabo verde'],
    'cabo verde': ['cape verde islands', 'cape verde'],
    // Congo
    'dr congo': ['congo dr', 'democratic republic of the congo', 'rd congo', 'republica democratica do congo'],
    'congo dr': ['dr congo', 'democratic republic of the congo', 'rd congo', 'republica democratica do congo'],
    'democratic republic of the congo': ['dr congo', 'congo dr', 'rd congo', 'republica democratica do congo'],
    'rd congo': ['dr congo', 'congo dr', 'democratic republic of the congo'],
    'republica democratica do congo': ['dr congo', 'congo dr', 'democratic republic of the congo'],
    // EscÃƒÂ³cia
    escocia: ['scotland'],
    scotland: ['escocia'],
    // ArgÃƒÂ©lia
    argelia: ['algeria'],
    algeria: ['argelia'],
    // IrÃƒÂ£
    ira: ['iran'],
    iran: ['ira'],
    // Nova ZelÃƒÂ¢ndia
    'nova zelandia': ['new zealand'],
    'new zealand': ['nova zelandia'],
    // UzbequistÃƒÂ£o
    uzbequistao: ['uzbekistan'],
    uzbekistan: ['uzbequistao'],
    // TunÃƒÂ­sia
    tunisia: ['tunis', 'tunisia'],
    tunis: ['tunisia', 'tunisia'],
    // Egito
    egito: ['egypt'],
    egypt: ['egito'],
    // ArÃƒÂ¡bia Saudita
    'arabia saudita': ['saudi arabia'],
    'saudi arabia': ['arabia saudita'],
    // Iraque
    iraque: ['iraq'],
    iraq: ['iraque'],
    // JordÃƒÂ¢nia
    jordania: ['jordan'],
    jordan: ['jordania'],
    // Noruega
    noruega: ['norway'],
    norway: ['noruega'],
    // CroÃƒÂ¡cia
    croacia: ['croatia'],
    croatia: ['croacia'],
    // Espanha
    espanha: ['spain'],
    spain: ['espanha'],
    // FranÃƒÂ§a
    franca: ['france'],
    france: ['franca'],
    // BÃƒÂ©lgica
    belgica: ['belgium'],
    belgium: ['belgica'],
    // SuÃƒÂ©cia
    suecia: ['sweden'],
    sweden: ['suecia'],
    // Inglaterra
    inglaterra: ['england'],
    england: ['inglaterra'],
    // Gana
    gana: ['ghana'],
    ghana: ['gana'],
    // Uruguai
    uruguai: ['uruguay'],
    uruguay: ['uruguai'],
    // ColÃƒÂ´mbia
    colombia: ['colombia'],
    argentina: ['argentina'],
    australia: ['australia'],
    austria: ['austria'],
    canada: ['canada'],
    haiti: ['haiti'],
    panama: ['panama'],
    portugal: ['portugal'],
    senegal: ['senegal'],
  }

  const teamVariants = (value?: string | null) => {
    const base = normalize(value ?? '')
    if (!base) return []
    return Array.from(new Set([base, ...(TEAM_ALIASES[base] ?? [])].map(normalize)))
  }

  const teamsMatch = (playerTeam: string | null | undefined, expectedTeam: string | null | undefined) => {
    const playerVariants = teamVariants(playerTeam)
    const expectedVariants = teamVariants(expectedTeam)
    if (playerVariants.length === 0 || expectedVariants.length === 0) return false
    return playerVariants.some((playerVariant) =>
      expectedVariants.some((expectedVariant) =>
        playerVariant === expectedVariant ||
        playerVariant.includes(expectedVariant) ||
        expectedVariant.includes(playerVariant)
      )
    )
  }

  const initials = (value: string) =>
    normalize(value)
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')

  const tokens = (value: string) =>
    normalize(value)
      .split(' ')
      .filter((part) => part.length > 1)

  const lastToken = (value: string) => {
    const parts = tokens(value)
    return parts[parts.length - 1] ?? ''
  }

  const tokenScore = (source: string, target: string) => {
    const srcTokens = new Set(tokens(source))
    const targetTokens = new Set(tokens(target))
    if (srcTokens.size === 0 || targetTokens.size === 0) return 0
    let hits = 0
    for (const token of srcTokens) {
      if (targetTokens.has(token)) hits += 1
    }
    return hits / Math.max(srcTokens.size, targetTokens.size)
  }

  const hasStrongTokenMatch = (source: string, target: string) => {
    const sourceTokens = tokens(source)
    const targetTokens = tokens(target)
    return sourceTokens.some((sourceToken) =>
      sourceToken.length >= 4 &&
      targetTokens.some((targetToken) =>
        targetToken === sourceToken ||
        targetToken.includes(sourceToken) ||
        sourceToken.includes(targetToken)
      )
    )
  }

  const playerMap = new Map<string, any[]>()
  for (const player of players as any[]) {
    const key = normalize(player.name)
    if (!playerMap.has(key)) playerMap.set(key, [])
    playerMap.get(key)!.push(player)
  }

  const entryTeams = Array.from(new Set(entries.map((entry) => entry.team?.trim()).filter(Boolean))) as string[]
  const fixtureTeams = Array.from(new Set([
    fixture?.home_team,
    fixture?.away_team,
    ...teamHints,
    ...entryTeams,
  ].filter(Boolean))) as string[]
  const fixturePlayers = fixtureTeams.length > 0
    ? (players as any[]).filter((player) =>
        fixtureTeams.some((team) => teamsMatch(player.team_name, team))
      )
    : (players as any[])

  const scopedPlayersFor = (entryTeam?: string) => {
    if (entryTeam?.trim()) {
      const byEntryTeam = (players as any[]).filter((player) => teamsMatch(player.team_name, entryTeam))
      if (byEntryTeam.length > 0) return byEntryTeam
      if (fixturePlayers.length > 0) return fixturePlayers
      return []
    }
    if (fixturePlayers.length > 0) return fixturePlayers
    return players as any[]
  }

  const manualOptionsFor = (entryTeam?: string) => {
    const byEntryTeam = entryTeam?.trim()
      ? (players as any[]).filter((player) => teamsMatch(player.team_name, entryTeam))
      : []
    const source = fixturePlayers.length > 0
      ? [...fixturePlayers, ...byEntryTeam]
      : byEntryTeam.length > 0
        ? byEntryTeam
        : (players as any[])
    return Array.from(new Map(source.map((player) => [player.id, player])).values())
  }

  const { data: aliases } = await admin
    .from('player_name_aliases')
    .select('alias, normalized_alias, team_name, normalized_team_name, player_id, players(id, name, team_name, position)')

  const aliasMap = new Map<string, any>()
  for (const alias of aliases ?? []) {
    aliasMap.set(`${alias.normalized_alias}::${alias.normalized_team_name ?? ''}`, alias)
  }

  const aliasKeysFor = (name: string, team?: string) => {
    const normalizedName = normalize(name)
    const teamKeys = teamVariants(team)
    return [
      ...teamKeys.map((teamKey) => `${normalizedName}::${teamKey}`),
      `${normalizedName}::`,
    ]
  }

  const findAliasPlayer = (name: string, team?: string) => {
    for (const key of aliasKeysFor(name, team)) {
      const alias = aliasMap.get(key)
      const player = Array.isArray(alias?.players) ? alias.players[0] : alias?.players
      if (player) return player
    }
    return null
  }

  const saveAlias = async (entryName: string, entryTeam: string | undefined, player: any) => {
    const normalizedAlias = normalize(entryName)
    if (!normalizedAlias) return

    const normalizedTeams = teamVariants(entryTeam)
    const normalizedTeamName = normalizedTeams[0] ?? normalize(player.team_name ?? '')

    await admin
      .from('player_name_aliases')
      .upsert(
        {
          alias: entryName,
          normalized_alias: normalizedAlias,
          team_name: entryTeam?.trim() || player.team_name || null,
          normalized_team_name: normalizedTeamName || null,
          player_id: player.id,
          source: 'manual',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'normalized_alias,normalized_team_name' }
      )
  }

  const rows: Array<{
    player_id: number
    round_id: string
    fixture_id: number
    rating: number
    minutes: number
    lineup_role: 'starter' | 'substitute' | null
    source: 'manual'
    fetched_at: string
  }> = []

  const unmatched: string[] = []
  const unmatchedDetails: Array<{
    name: string
    suggestions: Array<{
      id: number
      name: string
      team: string
      position: string
    }>
    options: Array<{
      id: number
      name: string
      team: string
      position: string
    }>
  }> = []

  const distance = (a: string, b: string) => {
    const s = normalize(a)
    const t = normalize(b)
    const dp = Array.from({ length: s.length + 1 }, () => Array(t.length + 1).fill(0))
    for (let i = 0; i <= s.length; i++) dp[i][0] = i
    for (let j = 0; j <= t.length; j++) dp[0][j] = j
    for (let i = 1; i <= s.length; i++) {
      for (let j = 1; j <= t.length; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1)
        )
      }
    }
    return dp[s.length][t.length]
  }

  for (const entry of entries) {
    const entryName = normalize(entry.name)
    const entryTeam = normalize(entry.team ?? '')
    const scopedPlayers = scopedPlayersFor(entry.team)
    const explicitPlayer = entry.playerId
      ? (players as any[]).find((player) => player.id === entry.playerId)
      : null
    const aliasPlayer = explicitPlayer ?? findAliasPlayer(entry.name, entry.team)

    if (aliasPlayer) {
      rows.push({
        player_id: aliasPlayer.id,
        round_id: roundId,
        fixture_id: fixtureId,
        rating: parseFloat(entry.rating.toFixed(2)),
        minutes: entry.minutes,
        lineup_role: entry.lineupRole ?? null,
        source: 'manual',
        fetched_at: new Date().toISOString(),
      })

      if (explicitPlayer) {
        await saveAlias(entry.name, entry.team, explicitPlayer)
      }
      continue
    }

    const candidates = (playerMap.get(entryName) ?? []).filter((player) =>
      scopedPlayers.some((scopedPlayer) => scopedPlayer.id === player.id)
    )
    if (candidates.length === 0) {
      const fuzzy = scopedPlayers
        .map((player) => {
          const playerName = normalize(player.name)
          const playerTeam = normalize(player.team_name ?? '')
          const overlap = tokenScore(entry.name, player.name)
          const sharedStrongToken = hasStrongTokenMatch(entry.name, player.name)
          const sameLastToken = lastToken(entry.name) && lastToken(entry.name) === lastToken(player.name)
          const sameInitials = initials(player.name) === initials(entry.name)
          const nameMatches =
            playerName.includes(entryName) ||
            entryName.includes(playerName) ||
            sameLastToken ||
            sharedStrongToken ||
            overlap >= 0.4 ||
            (sameInitials && overlap >= 0.2)
          const teamMatches = !entryTeam || teamsMatch(playerTeam, entryTeam)
          const score =
            (nameMatches ? 2 : 0) +
            (teamMatches ? 1 : 0) +
            overlap * 4 +
            (sharedStrongToken ? 2 : 0) +
            (sameLastToken ? 1.5 : 0) +
            (sameInitials ? 0.25 : 0) +
            (playerName.startsWith(entryName) || entryName.startsWith(playerName) ? 0.5 : 0)
          return { player, score, nameMatches, teamMatches }
        })
        .filter((item) => item.nameMatches && item.teamMatches)
        .sort((a, b) => b.score - a.score)[0]?.player
      if (fuzzy) {
        rows.push({
          player_id: fuzzy.id,
          round_id: roundId,
          fixture_id: fixtureId,
          rating: parseFloat(entry.rating.toFixed(2)),
          minutes: entry.minutes,
          lineup_role: entry.lineupRole ?? null,
          source: 'manual',
          fetched_at: new Date().toISOString(),
        })
      } else {
        unmatched.push(entry.name)
        const playerOptions = manualOptionsFor()
          .map((player) => ({
            id: player.id as number,
            name: player.name as string,
            team: (player.team_name as string) ?? '',
            position: (player.position as string) ?? '',
          }))
          .sort((a, b) =>
            a.team.localeCompare(b.team) ||
            a.position.localeCompare(b.position) ||
            a.name.localeCompare(b.name)
          )
        const suggestions = scopedPlayers
          .map((player) => ({
            id: player.id as number,
            name: player.name as string,
            team: (player.team_name as string) ?? '',
            position: (player.position as string) ?? '',
            score:
              distance(entry.name, player.name) -
              (entryTeam && teamsMatch(player.team_name, entryTeam) ? 3 : 0) -
              tokenScore(entry.name, player.name) * 4 -
              (hasStrongTokenMatch(entry.name, player.name) ? 3 : 0) -
              (lastToken(entry.name) && lastToken(entry.name) === lastToken(player.name) ? 2 : 0),
          }))
          .sort((a, b) => a.score - b.score)
          .slice(0, 3)
          .map(({ score, ...item }) => item)
        unmatchedDetails.push({ name: entry.name, suggestions, options: playerOptions })
      }
      continue
    }

    const chosen =
      candidates.find((p) => entryTeam && teamsMatch(p.team_name, entryTeam)) ??
      candidates.find((p) => hasStrongTokenMatch(entry.name, p.name)) ??
      candidates.find((p) => lastToken(entry.name) && lastToken(entry.name) === lastToken(p.name)) ??
      candidates.find((p) => tokenScore(entry.name, p.name) >= 0.4) ??
      candidates.find((p) => initials(p.name) === initials(entry.name) && tokenScore(entry.name, p.name) >= 0.2) ??
      candidates.find((p) => p.team_name) ??
      candidates[0]
    rows.push({
      player_id: chosen.id,
      round_id: roundId,
      fixture_id: fixtureId,
      rating: parseFloat(entry.rating.toFixed(2)),
      minutes: entry.minutes,
      lineup_role: entry.lineupRole ?? null,
      source: 'manual',
      fetched_at: new Date().toISOString(),
    })
  }

  if (rows.length === 0) {
    return { success: false, error: 'Nao achei nenhum jogador correspondente.', unmatched, unmatchedDetails }
  }

  const { error } = await admin
    .from('player_round_ratings')
    .upsert(rows, { onConflict: 'player_id,round_id' })

  if (error) {
    return { success: false, error: error.message, unmatched, unmatchedDetails }
  }

  revalidatePath(`/admin/rodadas/${roundId}`)
  revalidatePath('/app')
  return { success: true, inserted: rows.length, unmatched, unmatchedDetails }
}

/**
 * Atualizar placar de um fixture
 */
export async function updateFixtureScore(
  fixtureId: number,
  homeGoals: number | null,
  awayGoals: number | null,
  roundId: string
) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'NÃƒÂ£o autenticado' }

  const admin = supabaseAdmin()

  // Validar permissÃƒÂ£o (verificar que ÃƒÂ© admin da rodada)
  const { data: round } = await admin
    .from('rounds')
    .select('id, group_id, groups!inner(admin_id)')
    .eq('id', roundId)
    .single()

  if (!round || (round.groups as any).admin_id !== user.id) {
    return { success: false, error: 'Sem permissÃƒÂ£o' }
  }

  const { error } = await admin
    .from('fixtures')
    .update({
      home_goals: homeGoals,
      away_goals: awayGoals,
    })
    .eq('id', fixtureId)

  if (error) {
    console.error('[Fixtures] Erro ao atualizar placar:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/admin/rodadas/${roundId}`)
  return { success: true }
}

export async function updateFixtureTeams(
  fixtureId: number,
  roundId: string,
  homeTeam: string,
  awayTeam: string
) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'Nao autenticado' }

  const cleanHome = homeTeam.trim()
  const cleanAway = awayTeam.trim()

  if (!cleanHome || !cleanAway) {
    return { success: false, error: 'Informe mandante e visitante.' }
  }

  if (cleanHome === cleanAway) {
    return { success: false, error: 'Mandante e visitante precisam ser diferentes.' }
  }

  const admin = supabaseAdmin()

  const { data: round } = await admin
    .from('rounds')
    .select('id, group_id, groups!inner(admin_id)')
    .eq('id', roundId)
    .single()

  if (!round || (round.groups as any).admin_id !== user.id) {
    return { success: false, error: 'Sem permissao' }
  }

  const { data: fixture, error } = await admin
    .from('fixtures')
    .update({
      home_team: cleanHome,
      away_team: cleanAway,
      label: `${cleanHome} x ${cleanAway}`,
    })
    .eq('id', fixtureId)
    .eq('round_id', roundId)
    .select('id, home_team, away_team, label, home_goals, away_goals')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/admin/rodadas/${roundId}`)
  revalidatePath('/app')
  return { success: true, fixture }
}

/**
 * Recalcular pontuaÃƒÂ§ÃƒÂ£o da rodada apÃƒÂ³s inserir/editar ratings
 * Chama o motor de scoring jÃƒÂ¡ existente
 */
export async function recalculateRound(groupId: string, roundId: string) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'NÃƒÂ£o autenticado' }

  const admin = supabaseAdmin()

  // Validar que ÃƒÂ© admin do grupo
  const { data: group } = await admin
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .eq('admin_id', user.id)
    .single()

  if (!group) return { success: false, error: 'Sem permissÃƒÂ£o' }

  try {
    const result = await calculateRoundScores(groupId, roundId)
    if (!result.success) return { success: false, error: result.error }

    revalidatePath(`/admin/rodadas/${roundId}`)
    revalidatePath('/admin/rodadas')
    revalidatePath('/app')

    return { success: true, membrosCalculados: result.count }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Reordenar jogos dentro de uma rodada via drag-and-drop
 * @param roundId ID da rodada
 * @param fixtureIds Array ordenado de IDs de fixtures (nova ordem)
 */
export async function reorderFixtures(roundId: string, fixtureIds: number[]) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'NÃƒÂ£o autenticado' }

  const admin = supabaseAdmin()

  const { data: round } = await admin
    .from('rounds')
    .select('id, group_id, groups!inner(admin_id)')
    .eq('id', roundId)
    .single()

  if (!round || (round.groups as any).admin_id !== user.id) {
    return { success: false, error: 'Sem permissÃƒÂ£o' }
  }

  for (let i = 0; i < fixtureIds.length; i++) {
    const { error } = await admin
      .from('fixtures')
      .update({ sort_order: i })
      .eq('id', fixtureIds[i])
      .eq('round_id', roundId)

    if (error) {
      console.error(`[Fixtures] Erro ao reordenar fixture ${fixtureIds[i]}:`, error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath(`/admin/rodadas/${roundId}`)
  return { success: true }
}

export async function toggleRoundFinalized(roundId: string, finalized: boolean) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'NÃƒÂ£o autenticado' }

  const admin = supabaseAdmin()

  const { data: round } = await admin
    .from('rounds')
    .select('id, group_id, groups!inner(admin_id)')
    .eq('id', roundId)
    .single()

  if (!round || (round.groups as any).admin_id !== user.id) {
    return { success: false, error: 'Sem permissÃƒÂ£o' }
  }

  const { error } = await admin
    .from('rounds')
    .update({
      finalized_at: finalized ? new Date().toISOString() : null,
    })
    .eq('id', roundId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/admin/rodadas/${roundId}`)
  revalidatePath('/admin/rodadas')
  revalidatePath('/app')
  return { success: true }
}


/**
 * DiagnÃƒÂ³stico: Verificar quais ratings foram salvos para uma rodada
 * ÃƒÅ¡til para validar se notas estÃƒÂ£o sendo computadas corretamente
 */
export async function verifyRoundRatings(groupId: string, roundId: string) {
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'NÃƒÂ£o autenticado' }

  const admin = supabaseAdmin()

  // Validar permissÃƒÂ£o
  const { data: round } = await admin
    .from('rounds')
    .select('id, group_id, name, groups!inner(admin_id)')
    .eq('id', roundId)
    .eq('group_id', groupId)
    .single()

  if (!round || (round.groups as any).admin_id !== user.id) {
    return { success: false, error: 'Sem permissÃƒÂ£o' }
  }

  // Buscar todos os ratings da rodada
  const { data: allRatings } = await admin
    .from('player_round_ratings')
    .select('id, player_id, fixture_id, rating, minutes, players(name, team_name)')
    .eq('round_id', roundId)

  // Contar por status
  const withRating = (allRatings ?? []).filter(r => r.rating != null).length
  const withoutRating = (allRatings ?? []).filter(r => r.rating == null).length
  const withFixtureId = (allRatings ?? []).filter(r => r.fixture_id != null).length
  const withoutFixtureId = (allRatings ?? []).filter(r => r.fixture_id == null).length

  // Ratings problemÃƒÂ¡ticos
  const problematic = (allRatings ?? []).filter(r => r.rating == null || r.fixture_id == null)

  console.log(`[RoundDiagnostic] Rodada: ${round.name}`)
  console.log(`[RoundDiagnostic] Total ratings: ${allRatings?.length ?? 0}`)
  console.log(`[RoundDiagnostic] Com nota (rating != NULL): ${withRating}`)
  console.log(`[RoundDiagnostic] Sem nota (rating = NULL): ${withoutRating}`)
  console.log(`[RoundDiagnostic] Com fixture_id: ${withFixtureId}`)
  console.log(`[RoundDiagnostic] Sem fixture_id (NULL): ${withoutFixtureId}`)
  if (problematic.length > 0) {
    console.log(`[RoundDiagnostic] Ã¢Å¡Â Ã¯Â¸Â ${problematic.length} ratings problemÃƒÂ¡ticos encontrados:`)
    problematic.slice(0, 10).forEach(r => {
      console.log(`  - Player ${r.player_id} (${(r.players as any)?.name}): rating=${r.rating}, fixture_id=${r.fixture_id}`)
    })
  }

  return {
    success: true,
    round: {
      id: round.id,
      name: round.name,
    },
    stats: {
      total: allRatings?.length ?? 0,
      withRating,
      withoutRating,
      withFixtureId,
      withoutFixtureId,
      problematic: problematic.length,
    },
    problematicRatings: problematic.slice(0, 10).map(r => ({
      player_id: r.player_id,
      player_name: (r.players as any)?.name,
      rating: r.rating,
      fixture_id: r.fixture_id,
    })),
  }
}
