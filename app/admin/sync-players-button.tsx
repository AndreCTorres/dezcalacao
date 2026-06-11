'use client'

import { useState } from 'react'
import { syncPlayers } from './actions'

function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast(message, type, 5000)
  }
}

export function SyncPlayersButton() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [progress, setProgress] = useState<string>('')

  async function handleSync() {
    if (syncing) return
    
    const confirmed = confirm(
      '⏱️ AVISO: Sincronização vai levar ~11 minutos (Free Plan)\n\n' +
      'Isso vai buscar ~96 seleções e jogadores da Copa 2026.\n\n' +
      'Pode deixar aberto, o navegador não precisa ficar focado.\n\n' +
      'Tem certeza?'
    )

    if (!confirmed) return

    setSyncing(true)
    setResult(null)
    setProgress('Iniciando sincronização...')
    showToast('🔄 Sincronização iniciada...', 'info')

    try {
      // Simular progresso (atualizando a cada 30s)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const messages = [
            'Iniciando sincronização...',
            'Resolvendo IDs das seleções (1/2)...',
            'Sincronizando elencos (2/2)...',
            'Finalizando...'
          ]
          const current = messages.findIndex(m => m === prev)
          return messages[(current + 1) % messages.length]
        })
      }, 30000)

      const res = await syncPlayers()
      clearInterval(progressInterval)
      setResult(res)
      setProgress('')
      
      if (res.success && 'teamsResolved' in res && 'playersInserted' in res && 'teamsPending' in res) {
        const successMsg = `✅ Sincronização concluída!\nSeleções: ${res.teamsResolved}/48\nJogadores: ${res.playersInserted}`
        showToast(res.message || successMsg, 'success')
        
        alert(
          `✓ Sincronização concluída!\n\n` +
          `Seleções resolvidas: ${res.teamsResolved} / 48\n` +
          `Jogadores inseridos: ${res.playersInserted}\n` +
          (res.teamsPending.length > 0 
            ? `\n⚠️ Seleções pendentes:\n${res.teamsPending.join(', ')}` 
            : '')
        )
      } else {
        const errorMsg = res.error || 'Erro desconhecido'
        showToast(`❌ Erro: ${errorMsg}`, 'error')
        alert(`✗ Erro: ${errorMsg}`)
      }
    } catch (error: any) {
      setProgress('')
      const errorMsg = error.message || 'Erro desconhecido'
      showToast(`❌ Erro: ${errorMsg}`, 'error')
      alert(`✗ Erro: ${errorMsg}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-4 py-2 bg-lime-400 text-gray-900 rounded hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
      >
        {syncing ? '⏳ Sincronizando (11 min)...' : '🔄 Sincronizar Jogadores'}
      </button>

      {progress && (
        <div className="p-3 bg-gray-700 rounded border border-lime-400/50 text-sm text-gray-300">
          {progress}
        </div>
      )}

      {result && result.success && (
        <div className="p-4 bg-gray-800 rounded border border-lime-400/30 text-sm">
          <h3 className="font-bold text-lime-400 mb-2">✓ Resultado da Sincronização</h3>
          <div className="space-y-1 text-gray-300">
            <p>✓ Seleções resolvidas: <span className="font-mono text-lime-300">{result.teamsResolved} / 48</span></p>
            <p>✓ Jogadores inseridos/atualizados: <span className="font-mono text-lime-300">{result.playersInserted}</span></p>
            
            {result.teamsPending.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-yellow-400 font-medium">⚠️ Seleções pendentes ({result.teamsPending.length}):</p>
                <p className="text-xs mt-1 text-gray-400">{result.teamsPending.join(', ')}</p>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-red-400 font-medium">✗ Erros ({result.errors.length}):</p>
                <p className="text-xs mt-1 text-gray-400">{result.errors.slice(0, 5).join('; ')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="p-4 bg-red-900/20 rounded border border-red-400/30 text-sm">
          <h3 className="font-bold text-red-400 mb-2">✗ Erro na Sincronização</h3>
          <p className="text-gray-300">{result.error}</p>
        </div>
      )}
    </div>
  )
}
