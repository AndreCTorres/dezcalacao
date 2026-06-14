'use client'

// app/admin/rodadas/[roundId]/round-ratings-manager.tsx
// Lista de jogos clicáveis + modal de notas por jogo

import { useState, useTransition, useEffect } from 'react'
import { upsertPlayerRating, recalculateRound } from './actions'

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
}

const POSITION_LABELS: Record<string, string> = {
  GK: 'GL', ZAG: 'ZAG', LAT: 'LAT', MEI: 'MEI', ATK: 'ATK'
}

function ratingColor(r: number | null) {
  if (r === null) return 'bg-gray-700 text-gray-400'
  if (r >= 8.0) return 'bg-green-500 text-white'
  if (r >= 7.0) return 'bg-lime-500 text-white'
  if (r >= 6.0) return 'bg-yellow-500 text-black'
  if (r >= 5.0) return 'bg-orange-500 text-white'
  return 'bg-red-600 text-white'
}

export function RoundRatingsManager({ groupId, roundId, roundName, roundStatus, fixtures }: Props) {
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null)
  const [players, setPlayers] = useState<PlayerRating[]>([])
  const [localRatings, setLocalRatings] = useState<Record<number, { rating: string; minutes: string }>>({})
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [saving, setSaving] = useState<number | null>(null)
  const [recalculating, startRecalc] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [fixtureRatedCounts, setFixtureRatedCounts] = useState<Record<number, number>>(
    Object.fromEntries(fixtures.map(f => [f.id, f.ratedCount]))
  )

  // Abre modal e carrega jogadores do fixture
  async function openFixture(fixture: Fixture) {
    setSelectedFixture(fixture)
    setLoadingPlayers(true)
    setPlayers([])
    setLocalRatings({})

    try {
      const res = await fetch(`/api/rounds/${roundId}/fixture-players?fixtureId=${fixture.id}`)
      if (res.ok) {
        const data = await res.json()
        setPlayers(data.players ?? [])
        // Pré-preencher com ratings existentes
        const initial: Record<number, { rating: string; minutes: string }> = {}
        data.players?.forEach((p: PlayerRating) => {
          initial[p.id] = {
            rating: p.rating !== null ? String(p.rating) : '',
            minutes: String(p.minutes ?? 90),
          }
        })
        setLocalRatings(initial)
      }
    } catch (err) {
      console.error(err)
    }
    setLoadingPlayers(false)
  }

  async function saveRating(playerId: number) {
    const val = localRatings[playerId]
    if (!val) return

    const ratingNum = val.rating.trim() === '' ? null : parseFloat(val.rating.replace(',', '.'))
    const minutesNum = parseInt(val.minutes) || 0

    if (ratingNum !== null && (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 10)) {
      setFeedback({ type: 'error', msg: 'Nota deve ser entre 0 e 10' })
      return
    }

    setSaving(playerId)
    const result = await upsertPlayerRating(roundId, playerId, ratingNum, minutesNum, selectedFixture?.id)
    setSaving(null)

    if (!result.success) {
      setFeedback({ type: 'error', msg: result.error ?? 'Erro ao salvar' })
    } else {
      setFeedback({ type: 'success', msg: 'Salvo!' })
      setTimeout(() => setFeedback(null), 1500)
      // Atualiza contagem do fixture
      if (selectedFixture && ratingNum !== null) {
        setFixtureRatedCounts(prev => ({
          ...prev,
          [selectedFixture.id]: (prev[selectedFixture.id] ?? 0) + 1,
        }))
      }
    }
  }

  function handleRecalc() {
    startRecalc(async () => {
      const result = await recalculateRound(groupId, roundId)
      if (result.success) {
        setFeedback({ type: 'success', msg: `✅ Pontuação recalculada para ${result.membrosCalculados} participantes!` })
      } else {
        setFeedback({ type: 'error', msg: result.error ?? 'Erro ao recalcular' })
      }
      setTimeout(() => setFeedback(null), 4000)
    })
  }

  // Agrupar jogadores por seleção
  const playersByTeam = players.reduce<Record<string, PlayerRating[]>>((acc, p) => {
    if (!acc[p.team_name]) acc[p.team_name] = []
    acc[p.team_name].push(p)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Feedback global */}
      {feedback && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-lime-500/20 text-lime-300 border border-lime-500/30'
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          {feedback.msg}
        </div>
      )}

      {/* Sem jogos ainda */}
      {fixtures.length === 0 && (
        <div className="p-8 bg-gray-800 rounded-xl border border-gray-700 text-center text-gray-400">
          <p className="text-lg mb-1">Nenhum jogo nesta rodada ainda</p>
          <p className="text-sm">Os jogos aparecem aqui após serem inseridos via SQL/migration.</p>
        </div>
      )}

      {/* Lista de jogos */}
      {fixtures.map((fixture) => {
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
                  {fixture.home_team} × {fixture.away_team}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {hasRatings ? (
                  <span className="text-xs text-lime-400 font-medium">
                    ✅ {count} notas
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">Sem notas</span>
                )}
                <span className="text-gray-400 group-hover:text-lime-400 transition text-lg">›</span>
              </div>
            </div>
          </button>
        )
      })}

      {/* Botão recalcular */}
      {fixtures.length > 0 && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleRecalc}
            disabled={recalculating}
            className="bg-lime-400 hover:bg-lime-300 disabled:bg-gray-600 text-black font-bold px-6 py-2.5 rounded-lg transition text-sm"
          >
            {recalculating ? '⏳ Calculando...' : '🔢 Recalcular Pontuação'}
          </button>
        </div>
      )}

      {/* Modal de notas */}
      {selectedFixture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

            {/* Header modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
              <div>
                <h2 className="font-bold text-white text-lg">{selectedFixture.label}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Clique ✓ para salvar cada nota</p>
              </div>
              <button
                onClick={() => setSelectedFixture(null)}
                className="text-gray-400 hover:text-white text-2xl leading-none transition p-1"
              >
                ×
              </button>
            </div>

            {/* Feedback no modal */}
            {feedback && (
              <div className={`mx-5 mt-3 p-2 rounded text-xs font-medium shrink-0 ${
                feedback.type === 'success'
                  ? 'bg-lime-500/20 text-lime-300'
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {feedback.msg}
              </div>
            )}

            {/* Conteúdo scrollável */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              {loadingPlayers && (
                <div className="text-center text-gray-400 py-8">⏳ Carregando jogadores...</div>
              )}

              {!loadingPlayers && players.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  Nenhum jogador encontrado para este jogo
                </div>
              )}

              {!loadingPlayers && Object.entries(playersByTeam).map(([teamName, teamPlayers]) => (
                <div key={teamName}>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    🏳️ {teamName}
                  </h3>
                  <div className="bg-gray-800 rounded-xl overflow-hidden divide-y divide-gray-700/50">
                    {teamPlayers.map((player) => {
                      const val = localRatings[player.id] ?? { rating: '', minutes: '90' }
                      const ratingNum = val.rating.trim() !== '' ? parseFloat(val.rating.replace(',', '.')) : null
                      const isSaving = saving === player.id

                      return (
                        <div key={player.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-700/30 transition">
                          {/* Posição */}
                          <span className="text-xs text-gray-500 w-7 shrink-0 text-right">
                            {POSITION_LABELS[player.position] ?? player.position}
                          </span>

                          {/* Nome */}
                          <span className="flex-1 text-sm text-white truncate">{player.name}</span>

                          {/* Badge nota atual */}
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded w-10 text-center shrink-0 ${ratingColor(ratingNum)}`}>
                            {ratingNum !== null ? ratingNum.toFixed(1) : '–'}
                          </span>

                          {/* Minutos */}
                          <input
                            type="number"
                            min={0}
                            max={120}
                            value={val.minutes}
                            onChange={(e) => setLocalRatings(prev => ({
                              ...prev,
                              [player.id]: { ...prev[player.id] ?? { rating: '' }, minutes: e.target.value }
                            }))}
                            className="w-12 bg-gray-700 border border-gray-600 text-white text-center text-xs rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                            placeholder="90"
                          />

                          {/* Nota */}
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.1}
                            value={val.rating}
                            onChange={(e) => setLocalRatings(prev => ({
                              ...prev,
                              [player.id]: { ...prev[player.id] ?? { minutes: '90' }, rating: e.target.value }
                            }))}
                            className="w-14 bg-gray-700 border border-gray-600 text-white text-center text-xs rounded px-1 py-1.5 focus:outline-none focus:border-lime-400 shrink-0"
                            placeholder="7.5"
                          />

                          {/* Salvar */}
                          <button
                            onClick={() => saveRating(player.id)}
                            disabled={isSaving}
                            className="shrink-0 bg-lime-500 hover:bg-lime-400 disabled:bg-gray-600 text-black text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
                          >
                            {isSaving ? '…' : '✓'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer modal */}
            <div className="px-5 py-4 border-t border-gray-700 shrink-0 flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {players.filter(p => {
                  const val = localRatings[p.id]
                  return val?.rating?.trim() !== ''
                }).length}/{players.length} notas preenchidas
              </p>
              <button
                onClick={() => setSelectedFixture(null)}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
