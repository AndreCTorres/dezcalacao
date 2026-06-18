'use client'

// app/app/post-round-swaps.tsx
// Trocas pós-rodada: participante vê as notas e pode trocar até 3 reservas
// que pontuaram melhor que os titulares, e confirmar o score final.

import { useState } from 'react'
import Image from 'next/image'
import { confirmPostRoundSwaps, resetPostRoundSwaps } from './post-round-actions'
import type { PostRoundPlayer, PostRoundSwap } from './post-round-actions'

type Props = {
  groupMemberId: string
  roundId: string
  roundName: string
  players: PostRoundPlayer[]
  confirmedSwaps: { id: string; out_player_id: number; in_player_id: number; position_slot: string }[]
  maxSwaps: number
}

const POSITION_BADGE: Record<string, string> = {
  GK:  'bg-yellow-500 text-gray-900',
  ZAG: 'bg-blue-500 text-white',
  LAT: 'bg-cyan-500 text-gray-900',
  MEI: 'bg-lime-500 text-gray-900',
  ATK: 'bg-red-500 text-white',
}

function ratingColor(r: number | null) {
  if (r == null) return 'text-gray-400'
  if (r >= 8) return 'text-yellow-400 font-bold'
  if (r >= 7) return 'text-lime-400 font-bold'
  if (r >= 6) return 'text-white'
  return 'text-red-400'
}

function PlayerAvatar({ player, size = 'md' }: { player: PostRoundPlayer; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 32 : 40
  return (
    <div
      className="rounded-full overflow-hidden border-2 border-gray-700 bg-gray-700 flex-shrink-0"
      style={{ width: sz, height: sz }}
    >
      {player.photo_url ? (
        <Image src={player.photo_url} alt={player.name} width={sz} height={sz}
          className="w-full h-full object-cover object-top" unoptimized />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">👤</div>
      )}
    </div>
  )
}

export function PostRoundSwaps({ groupMemberId, roundId, roundName, players, confirmedSwaps, maxSwaps }: Props) {
  // Estado local das trocas selecionadas (antes de confirmar)
  const [pendingSwaps, setPendingSwaps] = useState<PostRoundSwap[]>([])
  const [selectedStarter, setSelectedStarter] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(confirmedSwaps.length > 0)

  const alreadyConfirmed = confirmedSwaps.length > 0

  // Mapa de jogadores por player_id
  const playerMap = new Map(players.map(p => [p.player_id, p]))

  // Quais player_ids já estão saindo (pra não usar duas vezes)
  const pendingOutIds = new Set(pendingSwaps.map(s => s.outPlayerId))
  const pendingInIds = new Set(pendingSwaps.map(s => s.inPlayerId))

  // Titular clicado — quais reservas são elegíveis?
  const eligibleBench = selectedStarter
    ? players.filter(p => {
        if (p.slot !== 'bench') return false
        if (pendingInIds.has(p.player_id)) return false

        const starter = playerMap.get(selectedStarter)
        if (!starter) return false

        // Mesma posição
        if (p.position_slot !== starter.position_slot) return false

        // Reserva precisa ter nota melhor (ou titular sem nota)
        if (p.rating === null) return false
        if (starter.rating !== null && p.rating <= starter.rating) return false

        return true
      })
    : []

  function toggleStarter(playerId: number) {
    if (alreadyConfirmed) return
    if (pendingSwaps.length >= maxSwaps && !pendingOutIds.has(playerId)) return
    setSelectedStarter(prev => prev === playerId ? null : playerId)
    setError(null)
  }

  function addSwap(inPlayerId: number) {
    if (!selectedStarter) return
    const starter = playerMap.get(selectedStarter)!
    const newSwap: PostRoundSwap = {
      outPlayerId: selectedStarter,
      inPlayerId,
      positionSlot: starter.position_slot,
    }
    setPendingSwaps(prev => [...prev.filter(s => s.outPlayerId !== selectedStarter), newSwap])
    setSelectedStarter(null)
  }

  function removeSwap(outPlayerId: number) {
    setPendingSwaps(prev => prev.filter(s => s.outPlayerId !== outPlayerId))
    setSelectedStarter(null)
  }

  async function handleConfirm() {
    if (pendingSwaps.length === 0) {
      setError('Selecione pelo menos uma troca para confirmar')
      return
    }
    setLoading(true)
    setError(null)

    const result = await confirmPostRoundSwaps(groupMemberId, roundId, pendingSwaps)

    if (result.success) {
      setDone(true)
      if (typeof window !== 'undefined' && (window as any).showToast) {
        ;(window as any).showToast('Trocas confirmadas! Score atualizado.', 'success', 4000)
      }
    } else {
      setError(result.error || 'Erro ao confirmar trocas')
    }
    setLoading(false)
  }

  async function handleReset() {
    setLoading(true)
    const result = await resetPostRoundSwaps(groupMemberId, roundId)
    if (result.success) {
      setDone(false)
      setPendingSwaps([])
      if (typeof window !== 'undefined' && (window as any).showToast) {
        ;(window as any).showToast('Trocas removidas. Score recalculado.', 'info', 3000)
      }
    }
    setLoading(false)
  }

  // Agrupar por posição para exibição
  const positions = ['GK', 'ZAG', 'LAT', 'MEI', 'ATK'] as const
  const posLabels: Record<string, string> = {
    GK: 'Goleiro', ZAG: 'Zagueiros', LAT: 'Laterais', MEI: 'Meio-campo', ATK: 'Ataque'
  }

  // Renderizar sem nenhuma troca possível
  const hasAnySswaps = positions.some(pos => {
    const starters = players.filter(p => p.slot === 'starter' && p.position_slot === pos)
    const benchers = players.filter(p => p.slot === 'bench' && p.position_slot === pos)
    return starters.length > 0 && benchers.some(b =>
      b.rating !== null && starters.some(s => s.rating === null || b.rating > s.rating)
    )
  })

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-3 py-2.5 bg-gray-900/60 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm">🔄 Trocas Pós-Rodada</h3>
          <p className="text-gray-400 text-xs mt-0.5">{roundName} • até {maxSwaps} trocas</p>
        </div>
        {alreadyConfirmed || done ? (
          <div className="flex items-center gap-2">
            <span className="text-lime-400 text-xs font-semibold">✓ Confirmadas</span>
            <button
              onClick={handleReset}
              disabled={loading}
              className="text-xs text-gray-500 hover:text-red-400 transition disabled:opacity-50"
            >
              Desfazer
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-500">
            {pendingSwaps.length} / {maxSwaps} selecionadas
          </span>
        )}
      </div>

      {/* Aviso inicial */}
      {!alreadyConfirmed && !done && (
        <div className="px-3 py-1.5 bg-lime-500/10 border-b border-lime-500/20">
          <p className="text-xs text-lime-300">
            💡 Selecione titulares e troque por reservas que pontuaram melhor. Só reservas com nota maior que o titular aparecem como elegíveis.
          </p>
        </div>
      )}

      {/* Estado confirmado */}
      {(alreadyConfirmed || done) && (
        <div className="px-3 py-2 border-b border-gray-700">
          <p className="text-xs text-gray-400 mb-1.5">Trocas confirmadas:</p>
          <div className="space-y-1.5">
            {(alreadyConfirmed ? confirmedSwaps : pendingSwaps.map(s => ({
              id: '',
              out_player_id: s.outPlayerId,
              in_player_id: s.inPlayerId,
              position_slot: s.positionSlot,
            }))).map((swap, i) => {
              const outP = playerMap.get(swap.out_player_id)
              const inP = playerMap.get(swap.in_player_id)
              return (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${POSITION_BADGE[swap.position_slot] || 'bg-gray-600 text-white'}`}>
                    {swap.position_slot}
                  </span>
                  <span className="text-red-400 line-through">{outP?.name || '?'}</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-lime-400">{inP?.name || '?'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Nenhuma troca possível */}
      {!alreadyConfirmed && !done && !hasAnySswaps && (
        <div className="px-3 py-3 text-center text-gray-500">
          <p className="text-sm">Nenhuma troca disponível nesta rodada.</p>
          <p className="text-xs text-gray-600 mt-1">Todos os titulares têm notas melhores ou iguais aos reservas.</p>
        </div>
      )}

      {/* Lista de jogadores para selecionar trocas */}
      {!alreadyConfirmed && !done && hasAnySswaps && (
        <div className="p-3 max-h-[380px] overflow-y-auto">
          <div className="md:grid md:grid-cols-2 md:gap-3 space-y-3 md:space-y-0">
            {positions.map(pos => {
              const starters = players.filter(p => p.slot === 'starter' && p.position_slot === pos)
              const benchers = players.filter(p => p.slot === 'bench' && p.position_slot === pos)
              if (starters.length === 0) return null

              return (
                <div key={pos}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    {posLabels[pos]}
                  </p>

                  {/* Titulares */}
                  <div className="space-y-1.5 mb-2">
                    {starters.map(p => {
                      const isSelected = selectedStarter === p.player_id
                      const isPendingOut = pendingOutIds.has(p.player_id)
                      const swapForThis = pendingSwaps.find(s => s.outPlayerId === p.player_id)
                      const replacingPlayer = swapForThis ? playerMap.get(swapForThis.inPlayerId) : null
                      const canSelect = !isPendingOut && benchers.some(b =>
                        !pendingInIds.has(b.player_id) &&
                        b.rating !== null &&
                        (p.rating === null || b.rating > p.rating)
                      ) && (pendingSwaps.length < maxSwaps || isPendingOut)

                      return (
                        <div key={p.player_id}>
                          {/* Card do titular */}
                          <div
                            onClick={() => canSelect || isSelected ? toggleStarter(p.player_id) : undefined}
                            className={`
                              flex items-center gap-2.5 px-3 py-2 rounded-lg transition
                              ${isPendingOut
                                ? 'bg-red-900/20 border border-red-700/50 opacity-60'
                                : isSelected
                                  ? 'bg-lime-900/30 border border-lime-400 cursor-pointer'
                                  : canSelect
                                    ? 'bg-gray-700/60 border border-gray-600 hover:border-gray-500 cursor-pointer'
                                    : 'bg-gray-700/30 border border-gray-700/50'
                              }
                            `}
                          >
                            <PlayerAvatar player={p} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${POSITION_BADGE[p.position_slot] || ''}`}>
                                  {p.position_slot}
                                </span>
                                <span className="text-white text-xs font-medium truncate">{p.name}</span>
                              </div>
                              <span className="text-gray-500 text-[10px]">{p.team_name}</span>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <span className={`text-sm font-mono ${ratingColor(p.rating)}`}>
                                {p.rating != null ? p.rating.toFixed(1) : '—'}
                              </span>
                              {isPendingOut && replacingPlayer && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeSwap(p.player_id) }}
                                  className="text-[9px] text-red-400 hover:text-red-300"
                                >
                                  ✕ reverter
                                </button>
                              )}
                              {canSelect && !isPendingOut && (
                                <span className="text-[9px] text-gray-500">clique</span>
                              )}
                            </div>
                          </div>

                          {/* Seta de troca confirmada */}
                          {isPendingOut && replacingPlayer && (
                            <div className="ml-6 mt-1 flex items-center gap-1.5 text-[10px] text-lime-400">
                              <span>↓</span>
                              <PlayerAvatar player={replacingPlayer} size="sm" />
                              <span className="font-medium truncate">{replacingPlayer.name}</span>
                              <span className={`font-mono ${ratingColor(replacingPlayer.rating)}`}>
                                {replacingPlayer.rating?.toFixed(1)}
                              </span>
                            </div>
                          )}

                          {/* Lista de reservas elegíveis (quando selecionado) */}
                          {isSelected && eligibleBench.length > 0 && (
                            <div className="mt-1.5 ml-2 space-y-1 border-l-2 border-lime-400/40 pl-3">
                              <p className="text-[10px] text-lime-400/70 mb-1">Escolha um:</p>
                              {eligibleBench.map(b => (
                                <button
                                  key={b.player_id}
                                  onClick={() => addSwap(b.player_id)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 bg-lime-900/25 hover:bg-lime-900/40 border border-lime-700/40 rounded-lg transition text-left"
                                >
                                  <PlayerAvatar player={b} size="sm" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs font-medium truncate">{b.name}</p>
                                    <p className="text-gray-500 text-[9px]">{b.team_name}</p>
                                  </div>
                                  <span className={`text-sm font-mono ${ratingColor(b.rating)}`}>
                                    {b.rating?.toFixed(1)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {isSelected && eligibleBench.length === 0 && (
                            <p className="mt-1 ml-2 text-[10px] text-gray-500 italic">
                              Nenhum reserva elegível
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Reservas (só informativo) */}
                  {benchers.length > 0 && (
                    <div className="space-y-1">
                      {benchers.map(p => {
                        const isPendingIn = pendingInIds.has(p.player_id)
                        return (
                          <div
                            key={p.player_id}
                            className={`flex items-center gap-2.5 px-3 py-1 rounded-lg border text-xs ${
                              isPendingIn
                                ? 'bg-lime-900/20 border-lime-700/50'
                                : 'bg-gray-700/20 border-gray-700/30 opacity-50'
                            }`}
                          >
                            <PlayerAvatar player={p} size="sm" />
                            <div className="flex-1 min-w-0">
                              <span className="text-gray-300 truncate">{p.name}</span>
                            </div>
                            <span className={`text-sm font-mono ${ratingColor(p.rating)}`}>
                              {p.rating != null ? p.rating.toFixed(1) : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Erro */}
          {error && (
            <div className="mt-3 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Botão confirmar */}
          {pendingSwaps.length > 0 && (
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full mt-3 py-2 bg-lime-500 hover:bg-lime-400 text-gray-900 font-bold text-sm rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Confirmando...</span>
              ) : (
                <span>✓ Confirmar {pendingSwaps.length}</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
