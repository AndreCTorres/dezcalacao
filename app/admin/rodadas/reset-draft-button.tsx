'use client'

// app/admin/rodadas/reset-draft-button.tsx
// Botão para resetar o draft após os 16avos de final.
// Apaga todos os times e substituições, preservando os scores históricos.

import { useState } from 'react'
import { resetDraftForNewPhase } from './actions'

type Props = {
  groupId: string
}

export function ResetDraftButton({ groupId }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClick = () => {
    setShowConfirm(true)
    setResult(null)
  }

  const handleConfirm = async () => {
    setShowConfirm(false)
    setLoading(true)
    setResult(null)

    const res = await resetDraftForNewPhase(groupId)
    setResult(res)
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      {/* Caixa de aviso */}
      <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
        <h3 className="text-orange-400 font-bold text-sm mb-1">⚠️ Reset do Draft — Nova Fase</h3>
        <p className="text-gray-400 text-xs leading-relaxed">
          Use após os 16avos de final. Apaga os times de todos os participantes e libera novo draft.
          <br />
          <span className="text-lime-400 font-semibold">✓ Scores históricos são preservados.</span>
          {' '}Rodadas, pontuações e ranking não são afetados.
        </p>
      </div>

      {/* Resultado */}
      {result && (
        <div className={`p-3 rounded-lg text-sm ${
          result.success
            ? 'bg-lime-500/10 border border-lime-500/30 text-lime-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {result.success ? result.message : result.error}
        </div>
      )}

      {/* Modal de confirmação inline */}
      {showConfirm ? (
        <div className="p-4 bg-red-900/20 border border-red-500/40 rounded-lg space-y-3">
          <p className="text-white text-sm font-semibold">Tem certeza absoluta?</p>
          <p className="text-gray-400 text-xs">
            Isso vai apagar <strong className="text-white">todos os times</strong> de todos os participantes.
            Essa ação não pode ser desfeita.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-lg transition"
            >
              Sim, resetar o draft
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleClick}
          disabled={loading || result?.success === true}
          className="w-full py-2.5 px-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-400 font-semibold text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '⏳ Resetando...' : result?.success ? '✓ Draft Resetado' : '🔄 Resetar Draft (Nova Fase)'}
        </button>
      )}
    </div>
  )
}
