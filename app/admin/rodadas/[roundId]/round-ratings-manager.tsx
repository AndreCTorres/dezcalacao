'use client'

// app/admin/rodadas/[roundId]/round-ratings-manager.tsx
// Fluxo manual: cria jogos, edita notas por partida e recalcula a rodada.

import { useState, useTransition } from 'react'
import { createManualFixture, upsertBatchRatings, upsertManualRatingsByName, recalculateRound, updateFixtureScore, updateFixtureTeams, reorderFixtures } from './actions'

type Fixture = {
  id: number
  home_team: string
  away_team: string
  label: string
  status: string
  ratedCount: number
  home_goals?: number | null
  away_goals?: number | null
  kickoff?: string | null
}

type PlayerRating = {
  id: number
  name: string
  team_name: string
  position: string
  rating: number | null
  minutes: number
  lineup_role?: 'starter' | 'substitute' | null
}

interface Props {
  groupId: string
  roundId: string
  roundName: string
  roundStatus: string
  fixtures: Fixture[]
  teamOptions: string[]
}

const POSITION_LABELS: Record<string, string> = {
  GK: 'GL',
  ZAG: 'ZAG',
  LAT: 'LAT',
  MEI: 'MEI',
  ATK: 'ATK',
}

function ratingColor(r: number | null) {
  if (r === null || !Number.isFinite(r)) return 'bg-gray-700 text-gray-400'
  if (r >= 8.0) return 'bg-green-500 text-white'
  if (r >= 7.0) return 'bg-lime-500 text-white'
  if (r >= 6.0) return 'bg-yellow-500 text-black'
  if (r >= 5.0) return 'bg-orange-500 text-white'
  return 'bg-red-600 text-white'
}

function hasFixtureScore(fixture: Fixture) {
  return fixture.home_goals !== null && fixture.home_goals !== undefined &&
    fixture.away_goals !== null && fixture.away_goals !== undefined
}

function hasPartialFixtureScore(fixture: Fixture) {
  const hasHome = fixture.home_goals !== null && fixture.home_goals !== undefined
  const hasAway = fixture.away_goals !== null && fixture.away_goals !== undefined
  return hasHome !== hasAway
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseRatingLine(line: string) {
  const cleanLine = line.trim()
  const match = cleanLine.match(/^(.*?)(?:\s+|\t|;|,)(\d{1,2}(?:[.,]\d)?)(?:\s+|\t|;|,)?(\d{1,3})?$/)
  if (!match) return null

  const name = match[1].trim()
  const rating = Number(match[2].replace(',', '.'))
  const minutes = match[3] ? Number.parseInt(match[3], 10) : null

  if (!name || !Number.isFinite(rating) || rating < 0 || rating > 10) return null
  if (minutes !== null && (!Number.isFinite(minutes) || minutes < 0 || minutes > 120)) return null

  return { name, rating, minutes }
}

type ManualSuggestion = {
  id: number
  name: string
  team: string
  position: string
}

type ManualUnmatchedDetail = {
  name: string
  suggestions: ManualSuggestion[]
  options?: ManualSuggestion[]
}

function parseManualBulkInput(text: string) {
  const trimmed = text.trim()

  if (!trimmed) {
    return {
      entries: [] as Array<{ name: string; team?: string; rating: number; minutes: number }>,
      unmatched: [] as string[],
      teamHints: [] as string[],
    }
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      const sourcePlayers = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.players)
          ? parsed.players
          : []
      const teamHints = Array.from(new Set([
        parsed?.fixture?.homeTeam,
        parsed?.fixture?.awayTeam,
        parsed?.fixture?.home_team,
        parsed?.fixture?.away_team,
      ].map((value) => String(value ?? '').trim()).filter(Boolean)))

      const entries = sourcePlayers
        .map((item: any) => ({
          name: String(item?.name ?? '').trim(),
          team: String(item?.team ?? item?.team_name ?? '').trim(),
          rating: Number(item?.rating),
          minutes: Number(item?.minutes ?? 90),
        }))
        .filter((item: any) => item.name && Number.isFinite(item.rating))

      return { entries, unmatched: [] as string[], teamHints }
    } catch {
      // cai para o modo linha-a-linha
    }
  }

  const entries: Array<{ name: string; team?: string; rating: number; minutes: number }> = []
  const unmatched: string[] = []

  for (const line of trimmed.split(/\r?\n/)) {
    const parsed = parseRatingLine(line)
    if (!parsed) {
      unmatched.push(line)
      continue
    }
    entries.push({
      name: parsed.name,
      team: '',
      rating: parsed.rating,
      minutes: parsed.minutes ?? 90,
    })
  }

  return { entries, unmatched, teamHints: [] as string[] }
}

type ManualEntry = ReturnType<typeof parseManualBulkInput>['entries'][number]

function correctionKey(name: string, team?: string) {
  return `${normalizeText(name)}::${normalizeText(team ?? '')}`
}

function nameTokens(value: string) {
  return normalizeText(value).split(' ').filter((part) => part.length > 1)
}

function hasCompatibleName(source: string, candidate: string) {
  const sourceName = normalizeText(source)
  const candidateName = normalizeText(candidate)
  if (candidateName === sourceName || candidateName.includes(sourceName) || sourceName.includes(candidateName)) {
    return true
  }

  const sourceTokens = nameTokens(source)
  const candidateTokens = nameTokens(candidate)
  const sourceLast = sourceTokens[sourceTokens.length - 1]
  const candidateLast = candidateTokens[candidateTokens.length - 1]

  if (sourceLast && candidateLast && sourceLast === candidateLast) return true

  return sourceTokens.some((sourceToken) =>
    sourceToken.length >= 4 &&
    candidateTokens.some((candidateToken) =>
      candidateToken === sourceToken ||
      candidateToken.includes(sourceToken) ||
      sourceToken.includes(candidateToken)
    )
  )
}

function applyDetectedFixtureTeams(
  text: string,
  currentTeams: { home_team: string; away_team: string },
  validTeams: string[]
) {
  const parsed = parseManualBulkInput(text)
  if (parsed.teamHints.length < 2) return currentTeams

  const [homeTeam, awayTeam] = parsed.teamHints
  const homeIsValid = validTeams.includes(currentTeams.home_team)
  const awayIsValid = validTeams.includes(currentTeams.away_team)

  return {
    home_team: homeIsValid ? currentTeams.home_team : homeTeam,
    away_team: awayIsValid ? currentTeams.away_team : awayTeam,
  }
}

export function RoundRatingsManager({ groupId, roundId, fixtures, teamOptions }: Props) {
  const [fixtureList, setFixtureList] = useState(fixtures)
  const [draggedFixtureId, setDraggedFixtureId] = useState<number | null>(null)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  const [players, setPlayers] = useState<PlayerRating[]>([])
  const [localRatings, setLocalRatings] = useState<Record<number, { rating: string; minutes: string }>>({})
  const [committedRatings, setCommittedRatings] = useState<Record<number, { rating: string; minutes: string }>>({})
  const [lineupOverrides, setLineupOverrides] = useState<Record<number, 'starter' | 'substitute' | 'not_played'>>({})
  const [fixtureTeams, setFixtureTeams] = useState({ home_team: '', away_team: '' })
  const [fixtureScore, setFixtureScore] = useState({ home_goals: '', away_goals: '' })
  const [bulkText, setBulkText] = useState('')
  const [bulkResult, setBulkResult] = useState<{ matched: number; unmatched: string[] } | null>(null)
  const [manualBulkText, setManualBulkText] = useState('')
  const [manualBulkResult, setManualBulkResult] = useState<{ matched: number; unmatched: string[]; unmatchedDetails?: ManualUnmatchedDetail[] } | null>(null)
  const [manualCorrections, setManualCorrections] = useState<Record<string, ManualSuggestion>>({})
  const [savingManualBulk, setSavingManualBulk] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [savingFixture, setSavingFixture] = useState(false)
  const [creatingFixture, startCreateFixture] = useTransition()
  const [recalculating, startRecalc] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [newFixture, setNewFixture] = useState({ homeTeam: '', awayTeam: '', label: '' })
  const [fixtureRatedCounts, setFixtureRatedCounts] = useState<Record<number, number>>(
    Object.fromEntries(fixtures.map(f => [f.id, f.ratedCount]))
  )

  const totalFixtures = fixtureList.length
  const completeFixtures = fixtureList.filter(f => (fixtureRatedCounts[f.id] ?? 0) > 0).length
  const hasIncompleteFixtures = totalFixtures > 0 && completeFixtures < totalFixtures
  const fixturesWithScore = fixtureList.filter(hasFixtureScore).length
  const fixturesWithPartialScore = fixtureList.filter(hasPartialFixtureScore).length
  const hasPendingScores = totalFixtures > 0 && fixturesWithScore < totalFixtures

  async function openFixture(fixture: Fixture) {
    setSelectedFixture(fixture)
    setFixtureScore({
      home_goals: fixture.home_goals !== null && fixture.home_goals !== undefined ? String(fixture.home_goals) : '',
      away_goals: fixture.away_goals !== null && fixture.away_goals !== undefined ? String(fixture.away_goals) : '',
    })
    setFixtureTeams({
      home_team: fixture.home_team,
      away_team: fixture.away_team,
    })
    setLoadingPlayers(true)
    setPlayers([])
    setLocalRatings({})
    setCommittedRatings({})
    setLineupOverrides({})
    setBulkText('')
    setBulkResult(null)
    setManualBulkText('')
    setManualBulkResult(null)
    setManualCorrections({})

    try {
      const res = await fetch(`/api/rounds/${groupId}/fixture-players?fixtureId=${fixture.id}&roundId=${roundId}`)
      if (!res.ok) {
        setFeedback({ type: 'error', msg: 'Nao foi possivel carregar os jogadores deste jogo.' })
        return
      }

      const data = await res.json()
      const nextPlayers = data.players ?? []
      setPlayers(nextPlayers)

      const initial: Record<number, { rating: string; minutes: string }> = {}
      const initialOverrides: Record<number, 'starter' | 'substitute'> = {}
      nextPlayers.forEach((p: PlayerRating) => {
        initial[p.id] = {
          rating: p.rating !== null ? String(p.rating) : '',
          minutes: String(p.minutes ?? 0),
        }
        if (p.lineup_role === 'starter' || p.lineup_role === 'substitute') {
          initialOverrides[p.id] = p.lineup_role
        }
      })
      setLocalRatings(initial)
      setCommittedRatings(initial)
      setLineupOverrides(initialOverrides)
    } catch {
      setFeedback({ type: 'error', msg: 'Erro ao carregar jogadores.' })
    } finally {
      setLoadingPlayers(false)
    }
  }

  function parseLocalRatings() {
    const parsed = players.map((player) => {
      const val = localRatings[player.id] ?? { rating: '', minutes: '0' }
      const override = lineupOverrides[player.id]
      if (override === 'not_played') {
        return {
          playerId: player.id,
          rating: null,
          minutes: 0,
          lineupRole: null,
        }
      }
      const rating = val.rating.trim() === '' ? null : Number(val.rating.replace(',', '.'))
      const minutes = rating === null ? 0 : Number.parseInt(val.minutes, 10)

      return {
        playerId: player.id,
        rating,
        minutes: Number.isFinite(minutes) ? minutes : 0,
        lineupRole: rating === null ? null : (override === 'starter' || override === 'substitute' ? override : null),
      }
    })

    const invalid = parsed.find(r =>
      (r.rating !== null && (!Number.isFinite(r.rating) || r.rating < 0 || r.rating > 10)) ||
      (r.rating !== null && r.minutes <= 0) ||
      r.minutes < 0 ||
      r.minutes > 120
    )

    if (invalid) return null
    return parsed
  }

  function getCommittedValue(playerId: number) {
    return committedRatings[playerId] ?? { rating: '', minutes: '0' }
  }

  function updateLocalPlayerValue(playerId: number, field: 'rating' | 'minutes', value: string) {
    setLocalRatings(prev => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] ?? getCommittedValue(playerId)),
        [field]: value,
      },
    }))
  }

  function commitPlayerValue(playerId: number) {
    setCommittedRatings(prev => ({
      ...prev,
      [playerId]: localRatings[playerId] ?? prev[playerId] ?? { rating: '', minutes: '0' },
    }))
  }

  function isParticipating(player: PlayerRating) {
    if (lineupOverrides[player.id] === 'not_played') return false
    const val = committedRatings[player.id]
    if (!val?.rating.trim()) return false
    const minutes = Number.parseInt(val.minutes || '0', 10)
    return Number.isFinite(minutes) && minutes > 0
  }

  function getPlayerMinutes(player: PlayerRating) {
    const minutes = Number.parseInt(committedRatings[player.id]?.minutes || '0', 10)
    return Number.isFinite(minutes) ? minutes : 0
  }

  function sortPlayersByPosition(a: PlayerRating, b: PlayerRating) {
    const posOrder: Record<string, number> = { GK: 0, ZAG: 1, LAT: 2, MEI: 3, ATK: 4 }
    const posA = posOrder[a.position] ?? 99
    const posB = posOrder[b.position] ?? 99
    return posA - posB ||
      getPlayerMinutes(b) - getPlayerMinutes(a) ||
      a.name.localeCompare(b.name)
  }

  function getTeamLineup(teamPlayers: PlayerRating[]) {
    const participating = teamPlayers
      .filter(isParticipating)
      .sort((a, b) => getPlayerMinutes(b) - getPlayerMinutes(a))
    const forcedStarters = participating.filter(player => lineupOverrides[player.id] === 'starter')
    const forcedSubstitutes = participating.filter(player => lineupOverrides[player.id] === 'substitute')
    const automaticPool = participating.filter(player => !lineupOverrides[player.id])
    const starters = forcedStarters.length >= 11
      ? forcedStarters
      : [...forcedStarters, ...automaticPool].slice(0, 11)
    const starterIds = new Set(starters.map(player => player.id))
    const substitutes = [
      ...forcedSubstitutes,
      ...participating.filter(player => !starterIds.has(player.id) && lineupOverrides[player.id] !== 'substitute'),
    ]

    return {
      starters: [...starters].sort(sortPlayersByPosition),
      substitutes: [...substitutes].sort(sortPlayersByPosition),
      notPlayed: teamPlayers.filter(player => !isParticipating(player) || lineupOverrides[player.id] === 'not_played').sort(sortPlayersByPosition),
      participating,
    }
  }

  function substituteEntryMinute(minutesPlayed: number) {
    return Math.max(0, 90 - minutesPlayed)
  }

  function setPlayerLineupRole(playerId: number, role: 'auto' | 'starter' | 'substitute' | 'not_played') {
    if (role === 'auto') {
      setCommittedRatings(prev => ({
        ...prev,
        [playerId]: localRatings[playerId] ?? prev[playerId] ?? { rating: '', minutes: '0' },
      }))
      setLineupOverrides(prev => {
        const next = { ...prev }
        delete next[playerId]
        return next
      })
      return
    }

    if (role === 'not_played') {
      const cleared = { rating: '', minutes: '0' }
      setLocalRatings(prev => ({ ...prev, [playerId]: cleared }))
      setCommittedRatings(prev => ({ ...prev, [playerId]: cleared }))
    } else {
      setCommittedRatings(prev => ({
        ...prev,
        [playerId]: localRatings[playerId] ?? prev[playerId] ?? { rating: '', minutes: '0' },
      }))
    }

    setLineupOverrides(prev => ({ ...prev, [playerId]: role }))
  }

  async function saveSelectedFixture() {
    if (!selectedFixture) return

    const parsed = parseLocalRatings()
    if (!parsed) {
      setFeedback({ type: 'error', msg: 'Revise as notas e minutos: quem tem nota precisa ter minutos acima de 0.' })
      return
    }

    const playersByTeamForValidation = players.reduce<Record<string, PlayerRating[]>>((acc, player) => {
      if (!acc[player.team_name]) acc[player.team_name] = []
      acc[player.team_name].push(player)
      return acc
    }, {})

    const invalidTeam = Object.entries(playersByTeamForValidation).find(([, teamPlayers]) => {
      const lineup = getTeamLineup(teamPlayers)
      return lineup.participating.length > 16 || lineup.starters.length > 11 || lineup.substitutes.length > 5
    })

    if (invalidTeam) {
      setFeedback({ type: 'error', msg: `${invalidTeam[0]} passou do limite de 11 titulares, 5 reservas ou 16 jogadores. Revise antes de salvar.` })
      return
    }

    setSavingFixture(true)
    
    // Salvar ratings
    const ratingsResult = await upsertBatchRatings(roundId, selectedFixture.id, parsed)
    let fixtureTeamUpdate: Awaited<ReturnType<typeof updateFixtureTeams>> | null = null
    const teamsChanged =
      fixtureTeams.home_team.trim() !== selectedFixture.home_team ||
      fixtureTeams.away_team.trim() !== selectedFixture.away_team

    if (teamsChanged) {
      fixtureTeamUpdate = await updateFixtureTeams(
        selectedFixture.id,
        roundId,
        fixtureTeams.home_team,
        fixtureTeams.away_team
      )

      if (!fixtureTeamUpdate.success) {
        setFeedback({ type: 'error', msg: fixtureTeamUpdate.error ?? 'Nao foi possivel atualizar os times do jogo.' })
        setSavingFixture(false)
        return
      }
    }

    const homeGoals = fixtureScore.home_goals.trim() !== '' ? parseInt(fixtureScore.home_goals, 10) : null
    const awayGoals = fixtureScore.away_goals.trim() !== '' ? parseInt(fixtureScore.away_goals, 10) : null
    
    // Salvar placar se fornecido
    if (fixtureScore.home_goals.trim() !== '' || fixtureScore.away_goals.trim() !== '') {
      if ((homeGoals !== null && !Number.isFinite(homeGoals)) || (awayGoals !== null && !Number.isFinite(awayGoals))) {
        setFeedback({ type: 'error', msg: 'Placar deve conter números válidos.' })
        setSavingFixture(false)
        return
      }
      
      await updateFixtureScore(selectedFixture.id, homeGoals, awayGoals, roundId)
    }
    
    setSavingFixture(false)

    if (!ratingsResult.success) {
      setFeedback({ type: 'error', msg: ratingsResult.error ?? 'Erro ao salvar notas' })
      return
    }

    const ratedCount = parsed.filter(r => r.rating !== null).length
    const updatedHomeTeam = fixtureTeamUpdate?.fixture?.home_team ?? selectedFixture.home_team
    const updatedAwayTeam = fixtureTeamUpdate?.fixture?.away_team ?? selectedFixture.away_team
    const updatedLabel = fixtureTeamUpdate?.fixture?.label ?? selectedFixture.label
    setFixtureRatedCounts(prev => ({ ...prev, [selectedFixture.id]: ratedCount }))
    setFixtureList(prev => prev.map(f => (
      f.id === selectedFixture.id
        ? {
            ...f,
            home_team: updatedHomeTeam,
            away_team: updatedAwayTeam,
            label: updatedLabel,
            home_goals: homeGoals,
            away_goals: awayGoals,
          }
        : f
    )))
    setSelectedFixture(prev => prev ? {
      ...prev,
      home_team: updatedHomeTeam,
      away_team: updatedAwayTeam,
      label: updatedLabel,
      home_goals: homeGoals,
      away_goals: awayGoals,
    } : prev)
    setFeedback({ type: 'success', msg: `${ratedCount} notas salvas para este jogo.` })
    setTimeout(() => setFeedback(null), 2500)
  }

  function applyBulkText() {
    const parsedBulk = parseManualBulkInput(bulkText)
    const parsedJsonEntries = bulkText.trim().startsWith('{') || bulkText.trim().startsWith('[')
      ? parsedBulk.entries
      : []
    const lines = parsedJsonEntries.length > 0
      ? []
      : bulkText
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean)

    if (lines.length === 0 && parsedJsonEntries.length === 0) {
      setBulkResult({ matched: 0, unmatched: [] })
      return
    }

    const nextRatings = { ...localRatings }
    const usedPlayerIds = new Set<number>()
    const unmatched: string[] = []
    let matched = 0

    const entriesToApply = parsedJsonEntries.length > 0
      ? parsedJsonEntries
      : lines.map((line) => {
          const parsed = parseRatingLine(line)
          return parsed ? { ...parsed, team: '' } : { line }
        })

    for (const entry of entriesToApply) {
      if ('line' in entry) {
        unmatched.push(entry.line)
        continue
      }

      const parsed = entry
      if (!parsed) {
        continue
      }

      const targetName = normalizeText(parsed.name)
      const player = players.find((candidate) => {
        if (usedPlayerIds.has(candidate.id)) return false
        if (parsed.team && normalizeText(candidate.team_name) !== normalizeText(parsed.team)) return false
        return hasCompatibleName(parsed.name, candidate.name)
      })

      if (!player) {
        unmatched.push(parsed.name)
        continue
      }

      usedPlayerIds.add(player.id)
      nextRatings[player.id] = {
        rating: String(parsed.rating),
        minutes: parsed.minutes !== null
          ? String(parsed.minutes)
          : (nextRatings[player.id]?.minutes || '90'),
      }
      matched++
    }

    setLocalRatings(nextRatings)
    setCommittedRatings(nextRatings)
    setBulkResult({ matched, unmatched })
  }

  async function saveManualBulkText() {
    if (!selectedFixture) return

    const { entries, unmatched, teamHints } = parseManualBulkInput(manualBulkText)
    
    // Aplicar aliases aos teamHints detectados do JSON
    const correctedTeamHints = teamHints.map(hint => {
      const normalized = hint
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      // Mapeamento hardcoded de correções comuns para hints detectados do JSON
      const corrections: Record<string, string> = {
        'cape verde': 'Cape Verde Islands',
        'capeverde': 'Cape Verde Islands',
      }
      
      const corrected = corrections[normalized]
      return corrected || hint
    })
    
    const parsedEntries: Array<ManualEntry & { playerId?: number }> = entries.map((entry) => {
      const correction = manualCorrections[correctionKey(entry.name, entry.team)]
      return correction ? { ...entry, playerId: correction.id } : entry
    })

    if (parsedEntries.length === 0) {
      setManualBulkResult({ matched: 0, unmatched, unmatchedDetails: [] })
      return
    }

    setSavingManualBulk(true)
    const result = await upsertManualRatingsByName(roundId, selectedFixture.id, parsedEntries, correctedTeamHints)
    setSavingManualBulk(false)

    if (!result.success) {
      setManualBulkResult({
        matched: 0,
        unmatched: [...unmatched, ...(result.unmatched ?? [])],
        unmatchedDetails: result.unmatchedDetails ?? [],
      })
      setFeedback({ type: 'error', msg: result.error ?? 'Nao foi possivel salvar as notas manuais.' })
      return
    }

    const totalMatched = (result.inserted ?? 0)
    setManualBulkResult({
      matched: totalMatched,
      unmatched: [...unmatched, ...(result.unmatched ?? [])],
      unmatchedDetails: result.unmatchedDetails ?? [],
    })
    setFeedback({
      type: 'success',
      msg: `${totalMatched} notas salvas no modo manual.`,
    })
    setTimeout(() => setFeedback(null), 2500)
  }

  function applyManualSuggestion(sourceName: string, suggestion: ManualSuggestion) {
    const confirmed = window.confirm(
      `Trocar "${sourceName}" por "${suggestion.name}"?\n${suggestion.position} · ${suggestion.team || 'sem time'}`
    )
    if (!confirmed) return

    const escaped = sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const nextText = manualBulkText.replace(new RegExp(escaped, 'g'), suggestion.name)
    const { entries } = parseManualBulkInput(manualBulkText)
    const sourceEntry = entries.find(entry => entry.name === sourceName)
    setManualCorrections(prev => ({
      ...prev,
      [correctionKey(sourceName, sourceEntry?.team)]: suggestion,
      [correctionKey(suggestion.name, sourceEntry?.team)]: suggestion,
    }))
    setManualBulkText(nextText)
  }

  async function saveFixtureTeamsOnly() {
    if (!selectedFixture) return

    setSavingFixture(true)
    const result = await updateFixtureTeams(
      selectedFixture.id,
      roundId,
      fixtureTeams.home_team,
      fixtureTeams.away_team
    )
    setSavingFixture(false)

    if (!result.success || !result.fixture) {
      setFeedback({ type: 'error', msg: result.error ?? 'Nao foi possivel atualizar os times do jogo.' })
      return
    }

    const updatedFixture = {
      ...selectedFixture,
      home_team: result.fixture.home_team,
      away_team: result.fixture.away_team,
      label: result.fixture.label,
    }

    setFixtureList(prev => prev.map(f => (
      f.id === selectedFixture.id ? { ...f, ...updatedFixture } : f
    )))
    setSelectedFixture(updatedFixture)
    setFeedback({ type: 'success', msg: 'Times do jogo atualizados.' })
    setTimeout(() => setFeedback(null), 2500)
    await openFixture(updatedFixture)
  }

  function ignoreManualUnmatched(sourceName: string) {
    setManualBulkResult(prev => {
      if (!prev) return prev
      return {
        ...prev,
        unmatched: prev.unmatched.filter(name => name !== sourceName),
        unmatchedDetails: prev.unmatchedDetails?.filter(item => item.name !== sourceName) ?? [],
      }
    })
  }

  function handleCreateFixture() {
    startCreateFixture(async () => {
      const result = await createManualFixture(
        roundId,
        newFixture.homeTeam,
        newFixture.awayTeam,
        newFixture.label
      )

      if (!result.success || !result.fixture) {
        setFeedback({ type: 'error', msg: result.error ?? 'Erro ao criar jogo' })
        return
      }

      const fixture = {
        ...result.fixture,
        label: result.fixture.label || `${result.fixture.home_team} x ${result.fixture.away_team}`,
        ratedCount: 0,
      }

      setFixtureList(prev => {
        if (prev.some(item => item.id === fixture.id)) return prev
        return [...prev, fixture].sort((a, b) => Number(a.id) - Number(b.id))
      })
      setFixtureRatedCounts(prev => ({ ...prev, [fixture.id]: 0 }))
      setNewFixture({ homeTeam: '', awayTeam: '', label: '' })
      setFeedback({
        type: 'success',
        msg: (result as any).alreadyExists
          ? 'Este jogo ja existia na rodada. Abri ele na lista para voce preencher.'
          : 'Jogo criado. Agora voce pode preencher as notas.',
      })
      setTimeout(() => setFeedback(null), 2500)
    })
  }

  function handleDragFixtureStart(fixtureId: number) {
    setDraggedFixtureId(fixtureId)
  }

  function handleDragFixtureOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDropFixture(targetFixtureId: number) {
    if (!draggedFixtureId || draggedFixtureId === targetFixtureId) {
      setDraggedFixtureId(null)
      return
    }

    const draggedIndex = fixtureList.findIndex(f => f.id === draggedFixtureId)
    const targetIndex = fixtureList.findIndex(f => f.id === targetFixtureId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedFixtureId(null)
      return
    }

    const newList = [...fixtureList]
    const [removed] = newList.splice(draggedIndex, 1)
    newList.splice(targetIndex, 0, removed)

    setFixtureList(newList)
    setDraggedFixtureId(null)
    saveFixtureOrder(newList)
  }

  async function saveFixtureOrder(newList: Fixture[]) {
    setIsSavingOrder(true)
    const result = await reorderFixtures(roundId, newList.map(f => f.id))
    setIsSavingOrder(false)
    if (!result.success) {
      setFeedback({ type: 'error', msg: result.error ?? 'Erro ao salvar ordem dos jogos' })
    }
  }

  function handleRecalc() {
    if (hasIncompleteFixtures) {
      const ok = window.confirm(
        `Ainda ha ${totalFixtures - completeFixtures} jogo(s) sem notas. Recalcular mesmo assim?`
      )
      if (!ok) return
    }

    startRecalc(async () => {
      const result = await recalculateRound(groupId, roundId)
      if (result.success) {
        setFeedback({ type: 'success', msg: `Pontuacao recalculada para ${result.membrosCalculados} participantes.` })
      } else {
        setFeedback({ type: 'error', msg: result.error ?? 'Erro ao recalcular' })
      }
      setTimeout(() => setFeedback(null), 4000)
    })
  }

  const playersByTeam = players.reduce<Record<string, PlayerRating[]>>((acc, p) => {
    if (!acc[p.team_name]) acc[p.team_name] = []
    acc[p.team_name].push(p)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {feedback && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-lime-500/20 text-lime-300 border border-lime-500/30'
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          {feedback.msg}
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <datalist id="team-options">
          {teamOptions.map((team) => (
            <option key={team} value={team} />
          ))}
        </datalist>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={newFixture.homeTeam}
            onChange={(e) => setNewFixture(prev => ({ ...prev, homeTeam: e.target.value }))}
            list="team-options"
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-lime-400"
            placeholder="Selecao mandante"
          />
          <input
            value={newFixture.awayTeam}
            onChange={(e) => setNewFixture(prev => ({ ...prev, awayTeam: e.target.value }))}
            list="team-options"
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-lime-400"
            placeholder="Selecao visitante"
          />
          <input
            value={newFixture.label}
            onChange={(e) => setNewFixture(prev => ({ ...prev, label: e.target.value }))}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-lime-400"
            placeholder="Rotulo opcional"
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Use os nomes de selecao iguais aos cadastrados nos jogadores.</p>
          <button
            onClick={handleCreateFixture}
            disabled={creatingFixture}
            className="shrink-0 bg-lime-400 hover:bg-lime-300 disabled:bg-gray-600 text-black font-bold px-4 py-2 rounded-lg transition text-sm"
          >
            {creatingFixture ? 'Criando...' : 'Criar jogo'}
          </button>
        </div>
      </div>

      {fixtureList.length === 0 && (
        <div className="p-8 bg-gray-800 rounded-xl border border-gray-700 text-center text-gray-400">
          <p className="text-lg mb-1">Nenhum jogo nesta rodada ainda</p>
          <p className="text-sm">Crie os jogos acima para comecar a preencher as notas.</p>
        </div>
      )}

      {fixtureList.length > 0 && (
        <div className={`rounded-xl border p-4 ${
          hasPendingScores
            ? 'bg-yellow-500/10 border-yellow-500/25'
            : 'bg-lime-500/10 border-lime-500/25'
        }`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-bold text-white">Placar dos jogos</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Confira se todos os resultados foram preenchidos antes de fechar a rodada.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-lime-400/15 text-lime-300 border border-lime-400/25 px-2.5 py-1 font-bold">
                {fixturesWithScore}/{totalFixtures} com placar
              </span>
              {fixturesWithPartialScore > 0 && (
                <span className="rounded-full bg-orange-400/15 text-orange-300 border border-orange-400/25 px-2.5 py-1 font-bold">
                  {fixturesWithPartialScore} parcial
                </span>
              )}
              {hasPendingScores && (
                <span className="rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-400/25 px-2.5 py-1 font-bold">
                  {totalFixtures - fixturesWithScore} pendente
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {fixtureList.length > 0 && isSavingOrder && (
        <div className="p-2 text-xs text-blue-400 text-center">💾 Salvando ordem...</div>
      )}

      {fixtureList.length > 0 && (
        <p className="text-xs text-gray-500 px-1">
          ⠿ Arraste os jogos para reordenar conforme aconteceram
        </p>
      )}

      {fixtureList.map((fixture) => {
        const count = fixtureRatedCounts[fixture.id] ?? 0
        const hasRatings = count > 0
        const hasScore = hasFixtureScore(fixture)
        const hasPartialScore = hasPartialFixtureScore(fixture)
        const kickoffDate = fixture.kickoff ? new Date(fixture.kickoff) : null
        const isDragging = draggedFixtureId === fixture.id

        return (
          <div
            key={fixture.id}
            draggable
            onDragStart={() => handleDragFixtureStart(fixture.id)}
            onDragOver={handleDragFixtureOver}
            onDrop={() => handleDropFixture(fixture.id)}
            className={`flex items-stretch gap-0 transition ${isDragging ? 'opacity-40 scale-95' : ''}`}
          >
            {/* Handle de drag */}
            <div
              className="flex items-center px-2 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 bg-gray-800 border border-r-0 border-gray-700 rounded-l-xl transition"
              title="Arrastar para reordenar"
            >
              <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor">
                <circle cx="4" cy="4" r="1.5"/>
                <circle cx="8" cy="4" r="1.5"/>
                <circle cx="4" cy="10" r="1.5"/>
                <circle cx="8" cy="10" r="1.5"/>
                <circle cx="4" cy="16" r="1.5"/>
                <circle cx="8" cy="16" r="1.5"/>
              </svg>
            </div>

            {/* Card clicável */}
            <button
              onClick={() => openFixture(fixture)}
              className="flex-1 text-left bg-gray-800 hover:bg-gray-700/80 border border-l-0 border-gray-700 hover:border-lime-500/40 rounded-r-xl p-4 transition group min-w-0"
            >
              <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <p className="truncate text-right text-sm font-bold text-white group-hover:text-lime-300 transition">
                  {fixture.home_team}
                </p>
                <div className={`rounded-xl border px-3 py-2 min-w-24 text-center ${
                  hasScore
                    ? 'bg-lime-400/10 border-lime-400/30'
                    : hasPartialScore
                      ? 'bg-orange-400/10 border-orange-400/30'
                      : 'bg-gray-900/70 border-gray-600'
                }`}>
                  <div className="flex items-center justify-center gap-2 font-mono font-black text-lg">
                    <span className={hasScore || hasPartialScore ? 'text-white' : 'text-gray-500'}>
                      {fixture.home_goals ?? '-'}
                    </span>
                    <span className="text-xs text-gray-500">x</span>
                    <span className={hasScore || hasPartialScore ? 'text-white' : 'text-gray-500'}>
                      {fixture.away_goals ?? '-'}
                    </span>
                  </div>
                  <span className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wide ${
                    hasScore ? 'text-lime-300' : hasPartialScore ? 'text-orange-300' : 'text-yellow-300'
                  }`}>
                    {hasScore ? 'Placar ok' : hasPartialScore ? 'Parcial' : 'Pendente'}
                  </span>
                </div>
                <p className="truncate text-left text-sm font-bold text-white group-hover:text-lime-300 transition">
                  {fixture.away_team}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-semibold text-white text-base group-hover:text-lime-300 transition">
                      {fixture.label || `${fixture.home_team} x ${fixture.away_team}`}
                    </p>
                    {hasScore && (
                      <span className="text-sm font-bold text-lime-300 px-2 py-0.5 bg-lime-500/10 rounded">
                        {fixture.home_goals} x {fixture.away_goals}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <span>{fixture.home_team} x {fixture.away_team}</span>
                    {kickoffDate && (
                      <span className="text-gray-600">
                        • {kickoffDate.toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    {hasRatings ? (
                      <span className="text-xs text-lime-400 font-medium">
                        {count} notas
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Sem notas</span>
                    )}
                    {!hasRatings && (
                      <span className="text-xs text-gray-600">0/{count || '?'}</span>
                    )}
                  </div>
                  <span className="text-gray-400 group-hover:text-lime-400 transition text-lg">{'>'}</span>
                </div>
              </div>
            </button>
          </div>
        )
      })}

      {fixtureList.length > 0 && (
        <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
          <p className={`text-xs ${hasIncompleteFixtures ? 'text-yellow-400' : 'text-lime-400'}`}>
            {completeFixtures}/{totalFixtures} jogos com notas
          </p>
          <button
            onClick={handleRecalc}
            disabled={recalculating}
            className="bg-lime-400 hover:bg-lime-300 disabled:bg-gray-600 text-black font-bold px-6 py-2.5 rounded-lg transition text-sm"
          >
            {recalculating ? 'Calculando...' : 'Recalcular pontuacao'}
          </button>
        </div>
      )}

      {selectedFixture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
              <div>
                <h2 className="font-bold text-white text-lg">{selectedFixture.label}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Preencha as notas e salve o jogo inteiro.</p>
              </div>
              <button
                onClick={() => setSelectedFixture(null)}
                className="text-gray-400 hover:text-white text-2xl leading-none transition p-1"
              >
                x
              </button>
            </div>

            {feedback && (
              <div className={`mx-5 mt-3 p-2 rounded text-xs font-medium shrink-0 ${
                feedback.type === 'success'
                  ? 'bg-lime-500/20 text-lime-300'
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {feedback.msg}
              </div>
            )}

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              {loadingPlayers && (
                <div className="text-center text-gray-400 py-8">Carregando jogadores...</div>
              )}

              {!loadingPlayers && players.length > 0 && (
                <>
                  {/* Card de resumo (por time) — lado a lado */}
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(playersByTeam).map(([teamName, teamPlayers]) => {
                    const lineup = getTeamLineup(teamPlayers)
                    const teamPlayed = lineup.participating.length
                    const teamNotPlayed = lineup.notPlayed.length
                    const startersFull = lineup.starters.filter(player => getPlayerMinutes(player) >= 80).length
                    const startersSubbed = lineup.starters.length - startersFull
                    const teamPlayedFull = startersFull
                    const teamPlayedPartial = startersSubbed
                    // Máximo 11 titulares + 5 subs = 16 por time
                    const subsCount = lineup.substitutes.length
                    const hasTooManyPlayers = teamPlayed > 16
                    const hasInvalidLineup = hasTooManyPlayers || lineup.starters.length > 11 || subsCount > 5

                    return (
                      <div key={teamName} className={`bg-gradient-to-r from-lime-500/10 to-blue-500/10 border rounded-xl p-3 ${
                        hasInvalidLineup ? 'border-red-500/60' : 'border-lime-500/30'
                      }`}>
                        <p className="text-xs font-bold text-gray-300 mb-2">{teamName}</p>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <p className="text-gray-500 mb-1">Jogaram</p>
                            <p className={`text-lg font-bold ${hasTooManyPlayers ? 'text-red-400' : 'text-lime-400'}`}>{teamPlayed}</p>
                            <p className="text-gray-600 text-xs mt-1">max 16</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Titulares</p>
                            <p className={`text-lg font-bold ${lineup.starters.length > 11 ? 'text-red-400' : 'text-white'}`}>{lineup.starters.length}/11</p>
                            <p className="text-gray-600 text-xs mt-1">{teamPlayedFull} completos{teamPlayedPartial > 0 ? ` +${teamPlayedPartial}` : ''}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Reservas</p>
                            <p className={`text-lg font-bold ${subsCount > 5 ? 'text-red-400' : 'text-orange-400'}`}>{subsCount}/5</p>
                            <p className={`text-gray-600 text-xs mt-1 ${subsCount === 5 ? 'text-orange-400 font-semibold' : ''}`}>
                              {subsCount === 5 ? 'Completo' : 'Banco: ' + teamNotPlayed}
                            </p>
                          </div>
                        </div>
                        {hasInvalidLineup && (
                          <p className="mt-2 text-xs font-semibold text-red-300">
                            Revise: a partida passou do limite de titulares/reservas.
                          </p>
                        )}
                      </div>
                    )
                  })}
                  </div>

                  {/* Seção de placar */}
                  <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Times do jogo</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Mandante</label>
                        <select
                          value={fixtureTeams.home_team}
                          onChange={(e) => setFixtureTeams(prev => ({ ...prev, home_team: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-lime-400"
                        >
                          <option value="">Selecione</option>
                          {teamOptions.map((team) => (
                            <option key={team} value={team}>{team}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Visitante</label>
                        <select
                          value={fixtureTeams.away_team}
                          onChange={(e) => setFixtureTeams(prev => ({ ...prev, away_team: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-lime-400"
                        >
                          <option value="">Selecione</option>
                          {teamOptions.map((team) => (
                            <option key={team} value={team}>{team}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        Ajuste aqui jogos antigos cadastrados com selecoes incorretas.
                      </p>
                      <button
                        type="button"
                        onClick={saveFixtureTeamsOnly}
                        disabled={savingFixture}
                        className="shrink-0 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 px-3 py-2 text-xs font-bold text-white transition"
                      >
                        Atualizar times
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Placar do Jogo</h4>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">{fixtureTeams.home_team || selectedFixture.home_team}</p>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={fixtureScore.home_goals}
                          onChange={(e) => setFixtureScore(prev => ({ ...prev, home_goals: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 text-white text-center text-lg font-bold rounded-lg px-2 py-2 focus:outline-none focus:border-lime-400"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1 text-gray-500">
                        <span className="text-xs">x</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">{fixtureTeams.away_team || selectedFixture.away_team}</p>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={fixtureScore.away_goals}
                          onChange={(e) => setFixtureScore(prev => ({ ...prev, away_goals: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 text-white text-center text-lg font-bold rounded-lg px-2 py-2 focus:outline-none focus:border-lime-400"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Opcional: preencha para registrar o placar.</p>
                  </div>

                  {/* Seção de bulk ratings */}
                  <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-3">
                    <textarea
                      value={bulkText}
                      onChange={(e) => {
                        setBulkText(e.target.value)
                        setBulkResult(null)
                      }}
                      className="w-full min-h-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400 resize-y"
                      placeholder={'Cole linhas assim:\nNome do jogador 7.4 90\nOutro jogador 6.8 72'}
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        A colagem preenche a tela; revise antes de salvar.
                      </p>
                      <button
                        onClick={applyBulkText}
                        className="shrink-0 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                      >
                        Preencher notas
                      </button>
                    </div>
                    {bulkResult && (
                      <div className="mt-2 text-xs">
                        <span className="text-lime-400">{bulkResult.matched} linhas preenchidas</span>
                        {bulkResult.unmatched.length > 0 && (
                          <span className="text-yellow-400">
                            {' '}· {bulkResult.unmatched.length} sem correspondencia
                          </span>
                        )}
                        {bulkResult.unmatched.length > 0 && (
                          <p className="mt-1 text-gray-500 truncate">
                            Revisar: {bulkResult.unmatched.slice(0, 4).join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {!loadingPlayers && players.length === 0 && (
                <div className="space-y-4">
                  <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Times do jogo</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Mandante</label>
                        <select
                          value={fixtureTeams.home_team}
                          onChange={(e) => setFixtureTeams(prev => ({ ...prev, home_team: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-lime-400"
                        >
                          <option value="">Selecione</option>
                          {teamOptions.map((team) => (
                            <option key={team} value={team}>{team}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Visitante</label>
                        <select
                          value={fixtureTeams.away_team}
                          onChange={(e) => setFixtureTeams(prev => ({ ...prev, away_team: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-lime-400"
                        >
                          <option value="">Selecione</option>
                          {teamOptions.map((team) => (
                            <option key={team} value={team}>{team}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        Corrija jogos antigos antes de preencher as notas.
                      </p>
                      <button
                        type="button"
                        onClick={saveFixtureTeamsOnly}
                        disabled={savingFixture}
                        className="shrink-0 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 px-3 py-2 text-xs font-bold text-white transition"
                      >
                        Atualizar times
                      </button>
                    </div>
                  </div>
                  <div className="text-center text-gray-400 py-4">
                    <p className="text-base font-semibold text-white mb-2">Nenhum jogador encontrado para este jogo</p>
                    <p className="text-sm text-gray-500">
                      Você ainda pode preencher as notas manualmente colando as linhas abaixo.
                    </p>
                  </div>

                  <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-3">
                    <textarea
                      value={manualBulkText}
                      onChange={(e) => {
                        const nextText = e.target.value
                        setManualBulkText(nextText)
                        setFixtureTeams(prev => applyDetectedFixtureTeams(nextText, prev, teamOptions))
                        setManualBulkResult(null)
                      }}
                      className="w-full min-h-28 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400 resize-y"
                      placeholder={'Aceita JSON com players ou linhas soltas.\nEx:\nNome do jogador 7.4 90\nOutro jogador 6.8 72'}
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">
                        O sistema vai buscar os jogadores no banco pelo nome.
                      </p>
                      <button
                        onClick={saveManualBulkText}
                        disabled={savingManualBulk}
                        className="shrink-0 bg-lime-400 hover:bg-lime-300 disabled:bg-gray-600 text-black text-xs font-bold px-3 py-2 rounded-lg transition"
                      >
                        {savingManualBulk ? 'Salvando...' : 'Salvar manual'}
                      </button>
                    </div>
                    {manualBulkResult && (
                      <div className="mt-2 text-xs">
                        <span className="text-lime-400">{manualBulkResult.matched} linhas preenchidas</span>
                        {manualBulkResult.unmatched.length > 0 && (
                          <span className="text-yellow-400">
                            {' '}· {manualBulkResult.unmatched.length} sem correspondencia
                          </span>
                        )}
                        {manualBulkResult.unmatchedDetails && manualBulkResult.unmatchedDetails.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {manualBulkResult.unmatchedDetails.slice(0, 8).map((item) => (
                              <div key={item.name} className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 px-3 py-2">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="font-semibold text-yellow-200">{item.name}</p>
                                  <button
                                    type="button"
                                    onClick={() => ignoreManualUnmatched(item.name)}
                                    className="shrink-0 rounded border border-gray-500/40 bg-gray-900/60 px-2 py-1 text-[11px] font-semibold text-gray-200 hover:bg-gray-700 transition"
                                  >
                                    Ignorar
                                  </button>
                                </div>
                                <p className="mt-1 text-[11px] text-yellow-100/70">
                                  Escolha uma opção antes de substituir.
                                </p>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {(item.suggestions.length > 0 ? item.suggestions : []).map((suggestion) => (
                                    <button
                                      key={`${suggestion.id}-${suggestion.name}`}
                                      type="button"
                                      onClick={() => applyManualSuggestion(item.name, suggestion)}
                                      className="rounded-full border border-yellow-400/25 bg-black/20 px-2 py-1 text-[11px] text-yellow-100 hover:bg-yellow-400/15 transition text-left"
                                      title={`${suggestion.position} · ${suggestion.team || 'sem time'} · ${suggestion.name}`}
                                    >
                                      {suggestion.position || '--'} · {suggestion.team || 'sem time'} · {suggestion.name}
                                    </button>
                                  ))}
                                </div>
                                <label className="mt-3 block">
                                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-yellow-100/60">
                                    Conectar com jogador dos times do jogo
                                  </span>
                                  <select
                                    defaultValue=""
                                    onChange={(event) => {
                                      const selected = (item.options ?? []).find(option => String(option.id) === event.target.value)
                                      if (selected) applyManualSuggestion(item.name, selected)
                                      event.currentTarget.value = ''
                                    }}
                                    className="w-full rounded-lg border border-yellow-400/20 bg-gray-950 px-2 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                                  >
                                    <option value="">
                                      {item.options?.length ? 'Escolher jogador...' : 'Nenhuma opcao do time encontrada'}
                                    </option>
                                    {(item.options ?? []).map(option => (
                                      <option key={option.id} value={option.id}>
                                        {option.position || '--'} - {option.team || 'sem time'} - {option.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <p className="mt-2 text-[11px] text-yellow-100/60">
                                  Depois de conectar, clique em Salvar manual novamente.
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!loadingPlayers && Object.entries(playersByTeam).map(([teamName, teamPlayers]) => {
                // Separar em duas listas: quem jogou (minutos > 0) e quem não jogou
                const lineup = getTeamLineup(teamPlayers)
                const played = lineup.starters
                const substitutes = lineup.substitutes

                const notPlayed = lineup.notPlayed
                /*
                const notPlayedOld = lineup.notPlayed.sort((a, b) => {
                  // Ordenar por posição
                  const posOrder = { GK: 0, ZAG: 1, LAT: 2, MEI: 3, ATK: 4 }
                  const posA = (posOrder as any)[a.position] ?? 99
                  const posB = (posOrder as any)[b.position] ?? 99
                  return posA - posB
                })
                */

                return (
                  <div key={teamName}>
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
                      <span>{teamName}</span>
                      <span className="text-gray-600 font-normal">({lineup.participating.length} jogaram)</span>
                    </h3>

                    <p className="text-xs font-semibold text-lime-300 mb-2 px-1">
                      Titulares provaveis
                    </p>
                    {/* Titulares provaveis */}
                    {played.length > 0 && (
                      <div className="bg-gray-800/70 rounded-xl overflow-hidden divide-y divide-gray-700/50 mb-3">
                        {played.map((player) => {
                          const val = localRatings[player.id] ?? { rating: '', minutes: '0' }
                          const ratingNum = val.rating.trim() !== '' ? Number(val.rating.replace(',', '.')) : null
                          const mins = parseInt(val.minutes, 10)
                          const played90 = mins >= 80 // Consideramos como "jogou completo"

                          return (
                            <div key={player.id} className={`flex items-center gap-2 px-3 py-2.5 hover:bg-gray-700/30 transition ${played90 ? 'bg-gray-800/40' : 'bg-gray-800/60'}`}>
                              <span className="text-xs text-gray-500 w-7 shrink-0 text-right">
                                {POSITION_LABELS[player.position] ?? player.position}
                              </span>

                              <span className="flex-1 text-sm text-white truncate">{player.name}</span>

                              <span className="text-xs text-gray-600 w-20 text-center shrink-0">
                                {mins >= 90 ? '90min' : `Saiu ${mins}'`}
                              </span>

                              <select
                                value={lineupOverrides[player.id] ?? 'auto'}
                                onChange={(e) => setPlayerLineupRole(player.id, e.target.value as 'auto' | 'starter' | 'substitute' | 'not_played')}
                                className="w-24 bg-gray-700 border border-gray-600 text-white text-[11px] rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                              >
                                <option value="auto">Auto</option>
                                <option value="starter">Titular</option>
                                <option value="substitute">Reserva</option>
                                <option value="not_played">Nao rel.</option>
                              </select>

                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded w-10 text-center shrink-0 ${ratingColor(ratingNum)}`}>
                                {ratingNum !== null && Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : '-'}
                              </span>

                              <input
                                type="number"
                                min={0}
                                max={120}
                                value={val.minutes}
                                onChange={(e) => updateLocalPlayerValue(player.id, 'minutes', e.target.value)}
                                onBlur={() => commitPlayerValue(player.id)}
                                className="w-12 bg-gray-700 border border-gray-600 text-white text-center text-xs rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                                placeholder="90"
                              />

                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={val.rating}
                                onChange={(e) => updateLocalPlayerValue(player.id, 'rating', e.target.value)}
                                onBlur={() => commitPlayerValue(player.id)}
                                className="w-14 bg-gray-700 border border-gray-600 text-white text-center text-xs rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                                placeholder="7.5"
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Jogadores que não jogaram (ou entraram) */}
                    {substitutes.length > 0 && (
                      <>
                        <p className="text-xs font-semibold text-orange-300 mb-2 px-1">
                          Reservas que entraram
                        </p>
                        <div className="bg-orange-500/10 rounded-xl overflow-hidden divide-y divide-orange-500/10 mb-3 border border-orange-500/20">
                          {substitutes.map((player) => {
                            const val = localRatings[player.id] ?? { rating: '', minutes: '0' }
                            const ratingNum = val.rating.trim() !== '' ? Number(val.rating.replace(',', '.')) : null
                            const mins = parseInt(val.minutes, 10)
                            const entryMinute = substituteEntryMinute(mins)

                            return (
                              <div key={player.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-orange-500/10 transition">
                                <span className="text-xs text-gray-500 w-7 shrink-0 text-right">
                                  {POSITION_LABELS[player.position] ?? player.position}
                                </span>
                                <span className="flex-1 text-sm text-white truncate">{player.name}</span>
                                <span className="text-xs text-orange-300 w-24 text-center shrink-0">
                                  {entryMinute}' / {mins}min
                                </span>
                                <select
                                  value={lineupOverrides[player.id] ?? 'auto'}
                                  onChange={(e) => setPlayerLineupRole(player.id, e.target.value as 'auto' | 'starter' | 'substitute' | 'not_played')}
                                  className="w-24 bg-gray-700 border border-gray-600 text-white text-[11px] rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                                >
                                  <option value="auto">Auto</option>
                                  <option value="starter">Titular</option>
                                  <option value="substitute">Reserva</option>
                                  <option value="not_played">Nao rel.</option>
                                </select>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded w-10 text-center shrink-0 ${ratingColor(ratingNum)}`}>
                                  {ratingNum !== null && Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : '-'}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={120}
                                  value={val.minutes}
                                  onChange={(e) => updateLocalPlayerValue(player.id, 'minutes', e.target.value)}
                                  onBlur={() => commitPlayerValue(player.id)}
                                  className="w-12 bg-gray-700 border border-gray-600 text-white text-center text-xs rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                                  placeholder="14"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  step={0.1}
                                  value={val.rating}
                                  onChange={(e) => updateLocalPlayerValue(player.id, 'rating', e.target.value)}
                                  onBlur={() => commitPlayerValue(player.id)}
                                  className="w-14 bg-gray-700 border border-gray-600 text-white text-center text-xs rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                                  placeholder="7.5"
                                />
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}

                    {notPlayed.length > 0 && (
                      <div className="bg-gray-800/30 rounded-xl overflow-hidden divide-y divide-gray-700/30">
                        {notPlayed.map((player) => {
                          const val = localRatings[player.id] ?? { rating: '', minutes: '0' }
                          const ratingNum = val.rating.trim() !== '' ? Number(val.rating.replace(',', '.')) : null

                          return (
                            <div key={player.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-700/20 transition opacity-60">
                              <span className="text-xs text-gray-600 w-7 shrink-0 text-right">
                                {POSITION_LABELS[player.position] ?? player.position}
                              </span>

                              <span className="flex-1 text-sm text-gray-400 truncate">{player.name}</span>

                              <select
                                value={lineupOverrides[player.id] ?? 'auto'}
                                onChange={(e) => setPlayerLineupRole(player.id, e.target.value as 'auto' | 'starter' | 'substitute' | 'not_played')}
                                className="w-24 bg-gray-700 border border-gray-600 text-white text-[11px] rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                              >
                                <option value="auto">Auto</option>
                                <option value="starter">Titular</option>
                                <option value="substitute">Reserva</option>
                                <option value="not_played">Nao rel.</option>
                              </select>

                              <span className="text-xs text-gray-700 w-12 text-center shrink-0">—</span>

                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded w-10 text-center shrink-0 ${ratingColor(ratingNum)}`}>
                                {ratingNum !== null && Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : '-'}
                              </span>

                              <input
                                type="number"
                                min={0}
                                max={120}
                                value={val.minutes}
                                onChange={(e) => updateLocalPlayerValue(player.id, 'minutes', e.target.value)}
                                onBlur={() => commitPlayerValue(player.id)}
                                className="w-12 bg-gray-700 border border-gray-600 text-white text-center text-xs rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                                placeholder="0"
                              />

                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={val.rating}
                                onChange={(e) => updateLocalPlayerValue(player.id, 'rating', e.target.value)}
                                onBlur={() => commitPlayerValue(player.id)}
                                className="w-14 bg-gray-700 border border-gray-600 text-white text-center text-xs rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                                placeholder="7.5"
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="px-5 py-4 border-t border-gray-700 shrink-0 flex justify-between items-center gap-3">
              <p className="text-xs text-gray-500">
                {players.filter(isParticipating).length} notas preenchidas
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedFixture(null)}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                >
                  Fechar
                </button>
                <button
                  onClick={saveSelectedFixture}
                  disabled={savingFixture || loadingPlayers || players.length === 0}
                  className="bg-lime-400 hover:bg-lime-300 disabled:bg-gray-600 text-black text-sm font-bold px-4 py-2 rounded-lg transition"
                >
                  {savingFixture ? 'Salvando...' : 'Salvar jogo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
