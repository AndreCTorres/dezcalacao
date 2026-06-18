'use client'

import { useState } from 'react'
import Link from 'next/link'
import { closeRound, reopenRound, reorderRounds } from './actions'

type Round = {
  id: string
  name: string
  status: string
  starts_at: string | null
  locked_at: string | null
  finalized_at?: string | null
  ends_at?: string | null
  fixtures_done?: number
  fixtures_total?: number
  auto_close?: boolean
  created_at: string
  sort_order?: number | null
}

type RoundListProps = {
  groupId: string
  rounds: Round[]
}

export function RoundList({ groupId, rounds }: RoundListProps) {
  const [busyRoundId, setBusyRoundId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draggedRound, setDraggedRound] = useState<string | null>(null)
  const [orderedRounds, setOrderedRounds] = useState<Round[]>(
    [...rounds].sort((a, b) => {
      // Ordenar por sort_order se existir, senão por created_at
      const aSort = a.sort_order ?? Number.MAX_VALUE
      const bSort = b.sort_order ?? Number.MAX_VALUE
      if (aSort !== bSort) return aSort - bSort
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  )
  const [isSaving, setIsSaving] = useState(false)


  async function handleClose(roundId: string) {
    if (!window.confirm('Fechar rodada agora? O sistema calculara as pontuacoes.')) return

    setBusyRoundId(roundId)
    setError(null)
    const res = await closeRound(groupId, roundId)
    if (!res.success) {
      setError(res.error ?? 'Erro ao fechar rodada')
    } else {
      window.location.reload()
    }
    setBusyRoundId(null)
  }

  async function handleReopen(roundId: string) {
    if (!window.confirm('Reabrir rodada? As notas ficam salvas, mas a rodada volta a aceitar ajustes antes do fechamento final.')) return

    setBusyRoundId(roundId)
    setError(null)
    const res = await reopenRound(groupId, roundId)
    if (!res.success) {
      setError(res.error ?? 'Erro ao reabrir rodada')
    } else {
      window.location.reload()
    }
    setBusyRoundId(null)
  }

  function handleDragStart(roundId: string) {
    setDraggedRound(roundId)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(targetRoundId: string) {
    if (!draggedRound || draggedRound === targetRoundId) {
      setDraggedRound(null)
      return
    }

    const draggedIndex = orderedRounds.findIndex(r => r.id === draggedRound)
    const targetIndex = orderedRounds.findIndex(r => r.id === targetRoundId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedRound(null)
      return
    }

    const newOrdered = [...orderedRounds]
    const [removed] = newOrdered.splice(draggedIndex, 1)
    newOrdered.splice(targetIndex, 0, removed)

    setOrderedRounds(newOrdered)
    setDraggedRound(null)
    saveNewOrder(newOrdered)
  }

  async function saveNewOrder(newOrder: Round[]) {
    setIsSaving(true)
    setError(null)
    const roundIds = newOrder.map(r => r.id)
    const res = await reorderRounds(groupId, roundIds)
    setIsSaving(false)

    if (!res.success) {
      setError(res.error ?? 'Erro ao salvar nova ordem')
      // Reverter para ordem anterior em caso de erro
      setOrderedRounds(
        [...rounds].sort((a, b) => {
          const aSort = a.sort_order ?? Number.MAX_VALUE
          const bSort = b.sort_order ?? Number.MAX_VALUE
          if (aSort !== bSort) return aSort - bSort
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
      )
    }
  }

  if (rounds.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
        <p className="text-gray-400">Nenhuma rodada criada ainda</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 text-sm">
          {error}
        </div>
      )}

      {isSaving && (
        <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-400/20 text-sm">
          💾 Salvando nova ordem...
        </div>
      )}

      <p className="text-xs text-gray-500 px-1">
        🖱️ Arraste as rodadas para reordenar conforme os jogos ocorreram
      </p>

      {orderedRounds.map((round) => (
        <div
          key={round.id}
          draggable
          onDragStart={() => handleDragStart(round.id)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(round.id)}
          className={`cursor-move transition ${draggedRound === round.id ? 'opacity-50' : ''}`}
        >
          <RoundCard
            round={round}
            busy={busyRoundId === round.id}
            onClose={handleClose}
            onReopen={handleReopen}
          />
        </div>
      ))}
    </div>
  )
}

function RoundCard({
  round,
  busy,
  onClose,
  onReopen,
}: {
  round: Round
  busy: boolean
  onClose: (id: string) => void
  onReopen: (id: string) => void
}) {
  const total = round.fixtures_total ?? 0
  const done = round.fixtures_done ?? 0
  const hasFixtures = total > 0
  const pct = hasFixtures ? Math.round((done / total) * 100) : 0
  const allDone = hasFixtures && done === total
  const isScored = round.status === 'scored'
  const isOpen = round.status === 'open'

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border transition ${
      isScored ? 'border-lime-500/25' : 'border-gray-700'
    }`}>
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm">{round.name}</h3>
          <div className="text-xs text-gray-400 mt-1 space-y-0.5">
            {round.starts_at && (
              <p>
                Inicio: {new Date(round.starts_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
            {round.locked_at && (
              <p>
                Pontuada em {new Date(round.locked_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>

        <StatusBadge status={round.status} allDone={allDone} />
      </div>

      {round.finalized_at && (
        <div className="mb-3">
          <span className="text-[11px] px-2 py-1 rounded bg-blue-500/15 text-blue-300 border border-blue-400/30">
            Finalizada para consulta
          </span>
        </div>
      )}

      {hasFixtures && isOpen && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Jogos encerrados</span>
            <span className={allDone ? 'text-lime-400 font-semibold' : ''}>
              {done}/{total}
            </span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allDone ? 'bg-lime-400' : done > 0 ? 'bg-blue-400' : 'bg-gray-600'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Link
          href={`/admin/rodadas/${round.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs text-gray-200 hover:text-lime-300 bg-gray-700/60 hover:bg-gray-700 rounded-lg transition"
        >
          Editar notas
        </Link>

        {isOpen && (
          <button
            onClick={() => onClose(round.id)}
            disabled={busy}
            className={`flex-1 py-2 px-3 text-xs rounded-lg transition disabled:opacity-50 ${
              allDone
                ? 'bg-lime-500/20 hover:bg-lime-500/30 text-lime-300 border border-lime-500/30'
                : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-400/20'
            }`}
          >
            {busy ? 'Fechando...' : 'Fechar rodada'}
          </button>
        )}

        {isScored && (
          <button
            onClick={() => onReopen(round.id)}
            disabled={busy}
            className="flex-1 py-2 px-3 text-xs rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 border border-yellow-400/20 transition disabled:opacity-50"
          >
            {busy ? 'Reabrindo...' : 'Reabrir rodada'}
          </button>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status, allDone }: { status: string; allDone: boolean }) {
  if (status === 'scored') {
    return (
      <span className="text-xs px-2 py-1 rounded bg-lime-400/15 text-lime-300 border border-lime-400/25 shrink-0">
        Pontuada
      </span>
    )
  }

  if (allDone) {
    return (
      <span className="text-xs px-2 py-1 rounded bg-lime-400/20 text-lime-400 border border-lime-400/30 shrink-0">
        Jogos encerrados
      </span>
    )
  }

  if (status === 'open') {
    return (
      <span className="text-xs px-2 py-1 rounded bg-lime-400/10 text-lime-400 border border-lime-400/20 shrink-0">
        Aberta
      </span>
    )
  }

  return (
    <span className="text-xs px-2 py-1 rounded bg-yellow-400/20 text-yellow-400 border border-yellow-400/20 shrink-0">
      Bloqueada
    </span>
  )
}
