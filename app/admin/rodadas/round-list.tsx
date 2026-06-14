'use client'

// app/admin/rodadas/round-list.tsx
// Lista de rodadas com automação: mostra progresso de fixtures e fecha automaticamente.

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { closeRound } from './actions'

type Round = {
  id: string
  name: string
  status: string
  starts_at: string | null
  locked_at: string | null
  ends_at?: string | null
  fixtures_done?: number
  fixtures_total?: number
  auto_close?: boolean
  created_at: string
}

type RoundListProps = {
  groupId: string
  rounds: Round[]
}

export function RoundList({ groupId, rounds: initialRounds }: RoundListProps) {
  const [rounds, setRounds] = useState(initialRounds)
  const [closing, setClosing] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  // Auto-verificar a cada 10 minutos se há rodadas abertas com fixtures configurados
  const hasOpenWithFixtures = rounds.some(
    r => r.status === 'open' && r.auto_close && (r.fixtures_total ?? 0) > 0
  )

  const checkAutoClose = useCallback(async () => {
    if (checking) return
    setChecking(true)
    try {
      const res = await fetch('/api/rounds/auto-close?manual=true')
      const data = await res.json()
      setLastCheck(new Date().toLocaleTimeString('pt-BR'))
      if (data.closed > 0) {
        // Rodada fechada — recarregar página para mostrar novo estado
        window.location.reload()
      }
    } catch {
      // silencioso
    } finally {
      setChecking(false)
    }
  }, [checking])

  useEffect(() => {
    if (!hasOpenWithFixtures) return
    const interval = setInterval(checkAutoClose, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [hasOpenWithFixtures, checkAutoClose])

  // Sync de fixtures (1 req à API)
  const handleSyncFixtures = async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch('/api/rounds/sync-fixtures', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        window.location.reload()
      } else {
        setError(data.error || 'Erro ao sincronizar fixtures')
      }
    } catch {
      setError('Erro de rede ao sincronizar fixtures')
    } finally {
      setSyncing(false)
    }
  }

  // Fechar manualmente
  const handleClose = async (roundId: string) => {
    if (!window.confirm('Fechar rodada agora? O sistema calculará as pontuações.')) return
    setClosing(roundId)
    setError(null)
    const res = await closeRound(groupId, roundId)
    if (!res.success) setError(res.error ?? 'Erro ao fechar')
    setClosing(null)
  }

  if (rounds.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
        <p className="text-gray-400">Nenhuma rodada criada ainda</p>
      </div>
    )
  }

  const hasNoFixtures = rounds.some(r => r.status === 'open' && !r.fixtures_total)

  return (
    <div className="space-y-3">
      {/* Barra de ações globais */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Sync de fixtures — só aparece se alguma rodada não tem fixtures */}
        {hasNoFixtures && (
          <button
            onClick={handleSyncFixtures}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 text-xs font-medium rounded-lg transition disabled:opacity-50"
          >
            {syncing ? '⏳ Sincronizando...' : '📅 Sincronizar datas da API (1 req)'}
          </button>
        )}

        {/* Verificar agora */}
        {hasOpenWithFixtures && (
          <div className="flex items-center gap-2 ml-auto">
            {lastCheck && (
              <span className="text-xs text-gray-500">Última verificação: {lastCheck}</span>
            )}
            <button
              onClick={checkAutoClose}
              disabled={checking}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition disabled:opacity-50"
            >
              {checking ? '⏳' : '🔄'} Verificar agora
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 text-sm">
          {error}
        </div>
      )}

      {/* Lista de rodadas — ordenada por created_at crescente (mais antigas primeiro) */}
      {[...rounds]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(round => (
        <RoundCard
          key={round.id}
          round={round}
          groupId={groupId}
          closing={closing}
          onClose={handleClose}
        />
      ))}
    </div>
  )
}

function RoundCard({
  round,
  groupId,
  closing,
  onClose,
}: {
  round: Round
  groupId: string
  closing: string | null
  onClose: (id: string) => void
}) {
  const total = round.fixtures_total ?? 0
  const done = round.fixtures_done ?? 0
  const hasFixtures = total > 0
  const pct = hasFixtures ? Math.round((done / total) * 100) : 0
  const allDone = hasFixtures && done === total

  const endsAt = round.ends_at ? new Date(round.ends_at) : null
  const now = new Date()
  const isInProgress = endsAt && endsAt > now && round.status === 'open'
  const isOverdue = endsAt && endsAt <= now && round.status === 'open' && !allDone

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border transition ${
      round.status === 'scored'
        ? 'border-gray-700 opacity-80'
        : allDone
          ? 'border-lime-500/40'
          : isOverdue
            ? 'border-yellow-500/40'
            : 'border-gray-700'
    }`}>
      {/* Header da rodada */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm">{round.name}</h3>
          <div className="text-xs text-gray-400 mt-1 space-y-0.5">
            {round.starts_at && (
              <p>📅 Início: {new Date(round.starts_at).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
              })}</p>
            )}
            {endsAt && (
              <p>🏁 Último jogo: {endsAt.toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
              })}</p>
            )}
          </div>
        </div>

        <StatusBadge round={round} allDone={allDone} />
      </div>

      {/* Barra de progresso de fixtures */}
      {hasFixtures && round.status === 'open' && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Jogos encerrados</span>
            <span className={allDone ? 'text-lime-400 font-semibold' : ''}>
              {done}/{total} {allDone && '✓'}
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

      {/* Ações */}
      {round.status === 'open' && (
        <div className="space-y-2">
          {/* Auto-close ativo */}
          {round.auto_close && hasFixtures && !allDone && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              🤖 Fechamento automático ativo
              {isInProgress && endsAt && (
                <span className="text-blue-400 ml-1">
                  — término estimado às {endsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          )}

          {/* Pode fechar automaticamente */}
          {allDone && round.auto_close && (
            <div className="p-2 bg-lime-500/10 border border-lime-500/20 rounded text-xs text-lime-400 text-center">
              ✓ Todos os jogos terminaram — fechamento automático em andamento
            </div>
          )}

          {/* Fechar manualmente (sempre disponível) */}
          <button
            onClick={() => onClose(round.id)}
            disabled={closing === round.id}
            className={`w-full py-2 px-3 text-sm rounded transition disabled:opacity-50 ${
              allDone
                ? 'bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 border border-lime-500/30'
                : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
            }`}
          >
            {closing === round.id
              ? '⏳ Fechando e calculando pontos...'
              : allDone
                ? '✓ Fechar e Calcular Pontos'
                : '🔒 Fechar Rodada Manualmente'}
          </button>
        </div>
      )}

      {round.status === 'scored' && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="text-lime-400">✓</span>
            Pontuada em {round.locked_at
              ? new Date(round.locked_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                })
              : '—'}
          </div>
          <Link
            href={`/admin/rodadas/${round.id}`}
            className="text-xs text-gray-400 hover:text-lime-400 transition underline underline-offset-2"
          >
            ✏️ Editar notas
          </Link>
        </div>
      )}

      {/* Botão de gerenciar notas — sempre visível */}
      {round.status === 'open' && (
        <div className="mt-2 pt-2 border-t border-gray-700/50">
          <Link
            href={`/admin/rodadas/${round.id}`}
            className="flex items-center justify-center gap-2 w-full py-1.5 px-3 text-xs text-gray-300 hover:text-lime-400 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition"
          >
            ✏️ Inserir notas manualmente
          </Link>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ round, allDone }: { round: Round; allDone: boolean }) {
  if (round.status === 'scored') {
    return (
      <span className="text-xs px-2 py-1 rounded bg-gray-600 text-gray-300 shrink-0">
        ✓ Pontuada
      </span>
    )
  }
  if (allDone) {
    return (
      <span className="text-xs px-2 py-1 rounded bg-lime-400/20 text-lime-400 border border-lime-400/30 shrink-0">
        🏁 Jogos encerrados
      </span>
    )
  }
  if (round.status === 'open') {
    return (
      <span className="text-xs px-2 py-1 rounded bg-lime-400/10 text-lime-400 shrink-0">
        🔓 Aberta
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-1 rounded bg-yellow-400/20 text-yellow-400 shrink-0">
      🔒 Bloqueada
    </span>
  )
}
