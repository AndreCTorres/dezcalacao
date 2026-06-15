'use client'

// app/admin/rodadas/[roundId]/round-ratings-manager.tsx
// Fluxo manual: cria jogos, edita notas por partida e recalcula a rodada.

import { useState, useTransition } from 'react'
import { createManualFixture, upsertBatchRatings, recalculateRound } from './actions'

type Fixture = {
  id: number
  home_team: string
  away_team: string
  label: string
  status: string
  ratedCount: number
}

type PlayerRating = {
  id: number
  name: string
  team_name: string
  position: string
  rating: number | null
  minutes: number
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
    setLoadingPlayers(true)
    setPlayers([])
    setLocalRatings({})
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
      nextPlayers.forEach((p: PlayerRating) => {
        initial[p.id] = {
          rating: p.rating !== null ? String(p.rating) : '',
          minutes: String(p.minutes ?? 90),
        }
      })
      setLocalRatings(initial)
    } catch {
      setFeedback({ type: 'error', msg: 'Erro ao carregar jogadores.' })
    } finally {
      setLoadingPlayers(false)
    }
  }

  function parseLocalRatings() {
    const parsed = players.map((player) => {
      const val = localRatings[player.id] ?? { rating: '', minutes: '90' }
      const rating = val.rating.trim() === '' ? null : Number(val.rating.replace(',', '.'))
      const minutes = Number.parseInt(val.minutes, 10)

      return {
        playerId: player.id,
        rating,
        minutes: Number.isFinite(minutes) ? minutes : 0,
      }
    })

    const invalid = parsed.find(r =>
      (r.rating !== null && (!Number.isFinite(r.rating) || r.rating < 0 || r.rating > 10)) ||
      r.minutes < 0 ||
      r.minutes > 120
    )

    if (invalid) return null
    return parsed
  }

  async function saveSelectedFixture() {
    if (!selectedFixture) return

    const parsed = parseLocalRatings()
    if (!parsed) {
      setFeedback({ type: 'error', msg: 'Revise as notas e minutos antes de salvar.' })
      return
    }

    setSavingFixture(true)
    const result = await upsertBatchRatings(roundId, selectedFixture.id, parsed)
    setSavingFixture(false)

    if (!result.success) {
      setFeedback({ type: 'error', msg: result.error ?? 'Erro ao salvar notas' })
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

      setFixtureList(prev => [...prev, fixture])
      setFixtureRatedCounts(prev => ({ ...prev, [fixture.id]: 0 }))
      setNewFixture({ homeTeam: '', awayTeam: '', label: '' })
      setFeedback({ type: 'success', msg: 'Jogo criado. Agora voce pode preencher as notas.' })
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

        return (
          <button
            key={fixture.id}
            onClick={() => openFixture(fixture)}
            className="w-full text-left bg-gray-800 hover:bg-gray-700/80 border border-gray-700 hover:border-lime-500/40 rounded-xl p-4 transition group"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-base group-hover:text-lime-300 transition">
                  {fixture.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fixture.home_team} x {fixture.away_team}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {hasRatings ? (
                  <span className="text-xs text-lime-400 font-medium">
                    {count} notas
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">Sem notas</span>
                )}
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
              )}

              {!loadingPlayers && players.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  Nenhum jogador encontrado para este jogo
                </div>
              )}

              {!loadingPlayers && Object.entries(playersByTeam).map(([teamName, teamPlayers]) => (
                <div key={teamName}>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    {teamName}
                  </h3>
                  <div className="bg-gray-800 rounded-xl overflow-hidden divide-y divide-gray-700/50">
                    {teamPlayers.map((player) => {
                      const val = localRatings[player.id] ?? { rating: '', minutes: '90' }
                      const ratingNum = val.rating.trim() !== '' ? Number(val.rating.replace(',', '.')) : null

                      return (
                        <div key={player.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-700/30 transition">
                          <span className="text-xs text-gray-500 w-7 shrink-0 text-right">
                            {POSITION_LABELS[player.position] ?? player.position}
                          </span>

                          <span className="flex-1 text-sm text-white truncate">{player.name}</span>

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
                              [player.id]: { ...(prev[player.id] ?? { minutes: '90' }), rating: e.target.value },
                            }))}
                            className="w-14 bg-gray-700 border border-gray-600 text-white text-center text-xs rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                            placeholder="7.5"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-700 shrink-0 flex justify-between items-center gap-3">
              <p className="text-xs text-gray-500">
                {players.filter(p => localRatings[p.id]?.rating?.trim() !== '').length}/{players.length} notas preenchidas
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
