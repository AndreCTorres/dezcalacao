'use client'

import { useState } from 'react'
import { toggleRoundFinalized } from './actions'

type Props = {
  roundId: string
  finalizedAt: string | null
}

export function RoundFinalizationToggle({ roundId, finalizedAt }: Props) {
  const [loading, setLoading] = useState(false)
  const [isFinalized, setIsFinalized] = useState(!!finalizedAt)

  async function handleToggle() {
    setLoading(true)
    const result = await toggleRoundFinalized(roundId, !isFinalized)
    if (result.success) {
      setIsFinalized(!isFinalized)
      window.location.reload()
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition disabled:opacity-50 ${
        isFinalized
          ? 'bg-lime-500/20 text-lime-300 border border-lime-400/40'
          : 'bg-gray-500/15 text-gray-300 border border-gray-500/30 hover:border-lime-400/40'
      }`}
    >
      {loading ? 'Salvando...' : isFinalized ? 'Finalizada' : 'Marcar finalizada'}
    </button>
  )
}
