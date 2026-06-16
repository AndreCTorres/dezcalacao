'use client'

// app/admin/rodadas/[roundId]/round-ratings-manager.tsx
// Fluxo manual: cria jogos, edita notas por partida e recalcula a rodada.

import { useState, useTransition } from 'react'
import { createManualFixture, upsertBatchRatings, recalculateRound, updateFixtureScore } from './actions'

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

export function RoundRatingsManager({ groupId, roundId, fixtures, teamOptions }: Props) {
  const [fixtureList, setFixtureList] = useState(fixtures)
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  const [players, setPlayers] = useState<PlayerRating[]>([])
  const [localRatings, setLocalRatings] = useState<Record<number, { rating: string; minutes: string }>>({})
  const [lineupOverrides, setLineupOverrides] = useState<Record<number, 'starter' | 'substitute'>>({})
  const [fixtureScore, setFixtureScore] = useState({ home_goals: '', away_goals: '' })
  const [bulkText, setBulkText] = useState('')
  const [bulkResult, setBulkResult] = useState<{ matched: number; unmatched: string[] } | null>(null)
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

  async function openFixture(fixture: Fixture) {
    setSelectedFixture(fixture)
    setFixtureScore({
      home_goals: fixture.home_goals !== null && fixture.home_goals !== undefined ? String(fixture.home_goals) : '',
      away_goals: fixture.away_goals !== null && fixture.away_goals !== undefined ? String(fixture.away_goals) : '',
    })
    setLoadingPlayers(true)
    setPlayers([])
    setLocalRatings({})
    setLineupOverrides({})
    setBulkText('')
    setBulkResult(null)

    try {
      const res = await fetch(`/api/rounds/${roundId}/fixture-players?fixtureId=${fixture.id}`)
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
      const rating = val.rating.trim() === '' ? null : Number(val.rating.replace(',', '.'))
      const minutes = rating === null ? 0 : Number.parseInt(val.minutes, 10)

      return {
        playerId: player.id,
        rating,
        minutes: Number.isFinite(minutes) ? minutes : 0,
        lineupRole: rating === null ? null : lineupOverrides[player.id] ?? null,
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

  function isParticipating(player: PlayerRating) {
    const val = localRatings[player.id]
    if (!val?.rating.trim()) return false
    const minutes = Number.parseInt(val.minutes || '0', 10)
    return Number.isFinite(minutes) && minutes > 0
  }

  function getPlayerMinutes(player: PlayerRating) {
    const minutes = Number.parseInt(localRatings[player.id]?.minutes || '0', 10)
    return Number.isFinite(minutes) ? minutes : 0
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
      starters,
      substitutes,
      notPlayed: teamPlayers.filter(player => !isParticipating(player)),
      participating,
    }
  }

  function substituteEntryMinute(minutesPlayed: number) {
    return Math.max(0, 90 - minutesPlayed)
  }

  function setPlayerLineupRole(playerId: number, role: 'starter' | 'substitute') {
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
    
    // Salvar placar se fornecido
    if (fixtureScore.home_goals.trim() !== '' || fixtureScore.away_goals.trim() !== '') {
      const homeGoals = fixtureScore.home_goals.trim() !== '' ? parseInt(fixtureScore.home_goals, 10) : null
      const awayGoals = fixtureScore.away_goals.trim() !== '' ? parseInt(fixtureScore.away_goals, 10) : null
      
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
    setFixtureRatedCounts(prev => ({ ...prev, [selectedFixture.id]: ratedCount }))
    setFeedback({ type: 'success', msg: `${ratedCount} notas salvas para este jogo.` })
    setTimeout(() => setFeedback(null), 2500)
  }

  function applyBulkText() {
    const lines = bulkText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      setBulkResult({ matched: 0, unmatched: [] })
      return
    }

    const nextRatings = { ...localRatings }
    const usedPlayerIds = new Set<number>()
    const unmatched: string[] = []
    let matched = 0

    for (const line of lines) {
      const parsed = parseRatingLine(line)
      if (!parsed) {
        unmatched.push(line)
        continue
      }

      const targetName = normalizeText(parsed.name)
      const player = players.find((candidate) => {
        if (usedPlayerIds.has(candidate.id)) return false
        const candidateName = normalizeText(candidate.name)
        return candidateName === targetName ||
          candidateName.includes(targetName) ||
          targetName.includes(candidateName)
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
    setBulkResult({ matched, unmatched })
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

      {fixtureList.map((fixture) => {
        const count = fixtureRatedCounts[fixture.id] ?? 0
        const hasRatings = count > 0
        const hasScore = fixture.home_goals !== null && fixture.home_goals !== undefined && 
                         fixture.away_goals !== null && fixture.away_goals !== undefined
        const kickoffDate = fixture.kickoff ? new Date(fixture.kickoff) : null

        return (
          <button
            key={fixture.id}
            onClick={() => openFixture(fixture)}
            className="w-full text-left bg-gray-800 hover:bg-gray-700/80 border border-gray-700 hover:border-lime-500/40 rounded-xl p-4 transition group"
          >
            <div className="flex items-center justify-between gap-4">
              {/* Time e resultado */}
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

              {/* Status */}
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
                  {/* Card de resumo (por time) */}
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

                  {/* Seção de placar */}
                  <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Placar do Jogo</h4>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">{selectedFixture.home_team}</p>
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
                        <p className="text-xs text-gray-500 mb-1">{selectedFixture.away_team}</p>
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
                <div className="text-center text-gray-400 py-8">
                  Nenhum jogador encontrado para este jogo
                </div>
              )}

              {!loadingPlayers && Object.entries(playersByTeam).map(([teamName, teamPlayers]) => {
                // Separar em duas listas: quem jogou (minutos > 0) e quem não jogou
                const lineup = getTeamLineup(teamPlayers)
                const played = lineup.starters
                const substitutes = lineup.substitutes

                const notPlayed = lineup.notPlayed.sort((a, b) => {
                  // Ordenar por posição
                  const posOrder = { GK: 0, ZAG: 1, LAT: 2, MEI: 3, ATK: 4 }
                  const posA = (posOrder as any)[a.position] ?? 99
                  const posB = (posOrder as any)[b.position] ?? 99
                  return posA - posB
                })

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

                              <button
                                type="button"
                                onClick={() => setPlayerLineupRole(player.id, 'substitute')}
                                className="w-16 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-200 text-[11px] font-semibold rounded px-1 py-1.5 transition shrink-0"
                                title="Mover para reservas"
                              >
                                Reserva
                              </button>

                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded w-10 text-center shrink-0 ${ratingColor(ratingNum)}`}>
                                {ratingNum !== null && Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : '-'}
                              </span>

                              <input
                                type="number"
                                min={0}
                                max={120}
                                value={val.minutes}
                                onChange={(e) => setLocalRatings(prev => ({
                                  ...prev,
                                  [player.id]: { ...(prev[player.id] ?? { rating: '' }), minutes: e.target.value },
                                }))}
                                className="w-12 bg-gray-700 border border-gray-600 text-white text-center text-xs rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                                placeholder="90"
                              />

                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={val.rating}
                                onChange={(e) => setLocalRatings(prev => ({
                                  ...prev,
                                  [player.id]: { ...(prev[player.id] ?? { minutes: '0' }), rating: e.target.value },
                                }))}
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
                                <button
                                  type="button"
                                  onClick={() => setPlayerLineupRole(player.id, 'starter')}
                                  className="w-16 bg-lime-500/10 hover:bg-lime-500/20 border border-lime-500/30 text-lime-200 text-[11px] font-semibold rounded px-1 py-1.5 transition shrink-0"
                                  title="Mover para titulares"
                                >
                                  Titular
                                </button>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded w-10 text-center shrink-0 ${ratingColor(ratingNum)}`}>
                                  {ratingNum !== null && Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : '-'}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  max={120}
                                  value={val.minutes}
                                  onChange={(e) => setLocalRatings(prev => ({
                                    ...prev,
                                    [player.id]: { ...(prev[player.id] ?? { rating: '' }), minutes: e.target.value },
                                  }))}
                                  className="w-12 bg-gray-700 border border-gray-600 text-white text-center text-xs rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                                  placeholder="14"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  step={0.1}
                                  value={val.rating}
                                  onChange={(e) => setLocalRatings(prev => ({
                                    ...prev,
                                    [player.id]: { ...(prev[player.id] ?? { minutes: '0' }), rating: e.target.value },
                                  }))}
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

                              <span className="text-xs text-gray-700 w-12 text-center shrink-0">—</span>

                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded w-10 text-center shrink-0 ${ratingColor(ratingNum)}`}>
                                {ratingNum !== null && Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : '-'}
                              </span>

                              <input
                                type="number"
                                min={0}
                                max={120}
                                value={val.minutes}
                                onChange={(e) => setLocalRatings(prev => ({
                                  ...prev,
                                  [player.id]: { ...(prev[player.id] ?? { rating: '' }), minutes: e.target.value },
                                }))}
                                className="w-12 bg-gray-700 border border-gray-600 text-white text-center text-xs rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                                placeholder="0"
                              />

                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={val.rating}
                                onChange={(e) => setLocalRatings(prev => ({
                                  ...prev,
                                  [player.id]: { ...(prev[player.id] ?? { minutes: '0' }), rating: e.target.value },
                                }))}
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
