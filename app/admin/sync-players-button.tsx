'use client'

import { useState } from 'react'
import { syncPlayers } from './actions'

function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  if (typeof window !== 'undefined' && (window as any).showToast) {
    (window as any).showToast(message, type, 5000)
  }
}

type SyncStatus = {
  teamsResolved: number
  teamsPending: number
  teamsWithPlayers: number
  teamsWithoutPlayers: number
  requisitions: {
    searchNeeded: number
    squadNeeded: number
    total: number
    estimatedMinutes: number
  }
  details: {
    resolved: string[]
    pending: string[]
    teamsWithoutPlayers: number[]
  }
  recommendation: string
}

export function SyncPlayersButton() {
  const [syncing, setSyncing] = useState(false)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [progress, setProgress] = useState<string>('')

  async function handleCheck() {
    if (checking || syncing) return
    setChecking(true)
    setStatus(null)

    try {
      const res = await fetch('/api/sync-check', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        setStatus(data)
      } else {
        showToast(`❌ Erro ao verificar: ${data.error}`, 'error')
      }
    } catch (e: any) {
      showToast(`❌ Erro: ${e.message}`, 'error')
    } finally {
      setChecking(false)
    }
  }

  async function handleSync() {
    if (syncing) return

    // Se não verificou ainda, verificar primeiro
    if (!status) {
      showToast('Clique em "Verificar Status" primeiro para saber o custo.', 'warning')
      return
    }

    const { total, estimatedMinutes } = status.requisitions

    if (total === 0) {
      showToast('✅ Tudo já está sincronizado! Nada a fazer.', 'success')
      return
    }

    const confirmed = confirm(
      `⚠️ CONFIRMAÇÃO DE SINCRONIZAÇÃO\n\n` +
      `Requisições à API: ${total}\n` +
      `Tempo estimado: ~${estimatedMinutes} minuto${estimatedMinutes !== 1 ? 's' : ''}\n\n` +
      `Times pendentes de busca: ${status.requisitions.searchNeeded}\n` +
      `Elencos a sincronizar: ${status.requisitions.squadNeeded}\n\n` +
      `Tem certeza que quer executar agora?`
    )

    if (!confirmed) return

    setSyncing(true)
    setResult(null)
    setProgress('Iniciando sincronização...')
    showToast('🔄 Sincronização iniciada...', 'info')

    try {
      const progressMessages = [
        'Iniciando sincronização...',
        'Resolvendo IDs das seleções...',
        'Sincronizando elencos...',
        'Inserindo jogadores no banco...',
        'Finalizando...',
      ]
      let msgIndex = 0
      const progressInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % progressMessages.length
        setProgress(progressMessages[msgIndex])
      }, 30000)

      const res = await syncPlayers()
      clearInterval(progressInterval)
      setResult(res)
      setProgress('')

      if (res.success && 'teamsResolved' in res) {
        showToast(res.message || `✅ ${res.playersInserted} jogadores sincronizados!`, 'success')
        // Atualizar status após sync bem sucedido
        setStatus(null)
      } else {
        showToast(`❌ Erro: ${res.error || 'Erro desconhecido'}`, 'error')
      }
    } catch (error: any) {
      setProgress('')
      showToast(`❌ Erro: ${error.message}`, 'error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Botão de verificar status */}
      <button
        onClick={handleCheck}
        disabled={checking || syncing}
        className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition text-sm border border-gray-600"
      >
        {checking ? '🔍 Verificando...' : '🔍 Verificar Status'}
      </button>

      {/* Painel de status */}
      {status && (
        <div className="p-4 bg-gray-900/60 rounded-lg border border-gray-700 text-sm space-y-3">
          <h4 className="font-bold text-gray-200 text-xs uppercase tracking-wider">Estado Atual</h4>

          {/* Progresso times */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Times com ID</span>
              <span className={`font-mono font-bold ${status.teamsResolved === 48 ? 'text-lime-400' : 'text-yellow-400'}`}>
                {status.teamsResolved} / 48
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-lime-400 rounded-full transition-all"
                style={{ width: `${(status.teamsResolved / 48) * 100}%` }}
              />
            </div>
          </div>

          {/* Progresso elencos */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Elencos sincronizados</span>
              <span className={`font-mono font-bold ${status.teamsWithPlayers === 48 ? 'text-lime-400' : 'text-yellow-400'}`}>
                {status.teamsWithPlayers} / {status.teamsResolved}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: status.teamsResolved > 0 ? `${(status.teamsWithPlayers / status.teamsResolved) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Custo da próxima sync */}
          <div className="pt-2 border-t border-gray-700">
            {status.requisitions.total === 0 ? (
              <div className="flex items-center gap-2 text-lime-400 font-medium">
                <span>✅</span>
                <span>Tudo sincronizado! Nenhuma requisição necessária.</span>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-gray-300 font-medium">Próxima sincronização vai usar:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {status.requisitions.searchNeeded > 0 && (
                    <>
                      <span className="text-gray-400">Buscas de times</span>
                      <span className="font-mono text-yellow-400">{status.requisitions.searchNeeded} req</span>
                    </>
                  )}
                  {status.requisitions.squadNeeded > 0 && (
                    <>
                      <span className="text-gray-400">Elencos</span>
                      <span className="font-mono text-yellow-400">{status.requisitions.squadNeeded} req</span>
                    </>
                  )}
                  <span className="text-gray-300 font-semibold">Total</span>
                  <span className="font-mono font-bold text-white">{status.requisitions.total} req (~{status.requisitions.estimatedMinutes} min)</span>
                </div>
              </div>
            )}
          </div>

          {/* Times pendentes */}
          {status.details.pending.length > 0 && (
            <div className="pt-2 border-t border-gray-700">
              <p className="text-yellow-400 text-xs font-medium mb-1">⚠️ Times sem ID ({status.details.pending.length}):</p>
              <p className="text-gray-500 text-xs">{status.details.pending.join(', ')}</p>
            </div>
          )}
        </div>
      )}

      {/* Botão de sincronizar */}
      <button
        onClick={handleSync}
        disabled={syncing || checking || (status?.requisitions.total === 0)}
        className={`w-full px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition text-sm ${
          status?.requisitions.total === 0
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-lime-400 hover:bg-lime-300 text-gray-900'
        }`}
      >
        {syncing
          ? `⏳ Sincronizando...`
          : status?.requisitions.total === 0
          ? '✅ Tudo sincronizado'
          : status
          ? `🔄 Sincronizar (${status.requisitions.total} req, ~${status.requisitions.estimatedMinutes} min)`
          : '🔄 Sincronizar Jogadores'}
      </button>

      {/* Progresso da sync */}
      {progress && (
        <div className="p-3 bg-gray-700 rounded border border-lime-400/50 text-sm text-gray-300 flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          {progress}
        </div>
      )}

      {/* Resultado da sync */}
      {result && result.success && (
        <div className="p-4 bg-gray-800 rounded border border-lime-400/30 text-sm">
          <h3 className="font-bold text-lime-400 mb-2">✓ Sincronização Concluída</h3>
          <div className="space-y-1 text-gray-300">
            <p>Seleções: <span className="font-mono text-lime-300">{result.teamsResolved} / 48</span></p>
            <p>Jogadores: <span className="font-mono text-lime-300">{result.playersInserted}</span></p>
            {result.teamsPending?.length > 0 && (
              <p className="text-yellow-400 text-xs mt-2">⚠️ Pendentes: {result.teamsPending.join(', ')}</p>
            )}
            {result.errors?.length > 0 && (
              <p className="text-red-400 text-xs">✗ {result.errors.length} erro(s)</p>
            )}
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="p-4 bg-red-900/20 rounded border border-red-400/30 text-sm">
          <h3 className="font-bold text-red-400 mb-1">✗ Erro</h3>
          <p className="text-gray-300">{result.error}</p>
        </div>
      )}
    </div>
  )
}
