'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { closeRound, reopenRound } from '../actions'

type RoundStatusActionsProps = {
  groupId: string
  roundId: string
  status: string
}

export function RoundStatusActions({ groupId, roundId, status }: RoundStatusActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isOpen = status === 'open'
  const isScored = status === 'scored'

  if (!isOpen && !isScored) return null

  function runAction() {
    const message = isOpen
      ? 'Fechar rodada agora? Use isso somente depois de revisar todos os jogos e notas.'
      : 'Reabrir rodada? As notas ficam salvas, mas a rodada volta a aceitar ajustes.'

    if (!window.confirm(message)) return

    setError(null)
    startTransition(async () => {
      const result = isOpen
        ? await closeRound(groupId, roundId)
        : await reopenRound(groupId, roundId)

      if (!result.success) {
        setError(result.error ?? 'Nao foi possivel atualizar a rodada.')
        return
      }

      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={runAction}
        disabled={isPending}
        className={`text-xs font-bold px-3 py-2 rounded-lg border transition disabled:opacity-60 ${
          isOpen
            ? 'bg-lime-400 text-gray-950 border-lime-300 hover:bg-lime-300'
            : 'bg-yellow-500/15 text-yellow-300 border-yellow-400/30 hover:bg-yellow-500/25'
        }`}
      >
        {isPending
          ? isOpen ? 'Fechando...' : 'Reabrindo...'
          : isOpen ? 'Fechar rodada' : 'Reabrir rodada'}
      </button>
      {error && <span className="max-w-xs text-[11px] text-red-300">{error}</span>}
    </div>
  )
}
