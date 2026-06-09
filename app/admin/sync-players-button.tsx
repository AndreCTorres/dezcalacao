'use client'

import { useState } from 'react'
import { syncPlayers } from './actions'

export function SyncPlayersButton() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function handleSync() {
    if (syncing) return
    
    const confirmed = confirm(
      'Sincronizar jogadores da Copa 2026?\n\n' +
      'Isso pode levar alguns minutos e usar ~150 requisições da API.\n' +
      'Tem certeza?'
    )

    if (!confirmed) return

    setSyncing(true)
    setResult(null)

    try {
      const res = await syncPlayers()
      setResult(res)
      
      if (res.success) {
        alert(
          `✓ Sincronização concluída!\n\n` +
          `Seleções resolvidas: ${res.teamsResolved} / 48\n` +
          `Jogadores inseridos: ${res.playersInserted}\n` +
          (res.teamsPending.length > 0 
            ? `\n⚠️ Seleções pendentes:\n${res.teamsPending.join(', ')}` 
            : '')
        )
      } else {
        alert(`✗ Erro: ${res.error}`)
      }
    } catch (error: any) {
      alert(`✗ Erro: ${error.message}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-4 py-2 bg-lime-400 text-gray-900 rounded hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {syncing ? 'Sincronizando...' : '🔄 Sincronizar Jogadores'}
      </button>

      {result && result.success && (
        <div className="p-4 bg-gray-800 rounded border border-lime-400/30 text-sm">
          <h3 className="font-bold text-lime-400 mb-2">Resultado da Sincronização</h3>
          <div className="space-y-1 text-gray-300">
            <p>✓ Seleções resolvidas: <span className="font-mono">{result.teamsResolved} / 48</span></p>
            <p>✓ Jogadores inseridos/atualizados: <span className="font-mono">{result.playersInserted}</span></p>
            
            {result.teamsPending.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-yellow-400 font-medium">⚠️ Seleções pendentes ({result.teamsPending.length}):</p>
                <p className="text-xs mt-1">{result.teamsPending.join(', ')}</p>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-red-400 font-medium">✗ Erros ({result.errors.length}):</p>
                <p className="text-xs mt-1">{result.errors.slice(0, 5).join('; ')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
