'use client'

// app/admin/rodadas/[roundId]/ratings-audit-viewer.tsx
// Visualizador de histÃ³rico/auditoria de mudanÃ§as de ratings

import { useState } from 'react'

type AuditChange = {
  audit_id: string
  player_id: number
  player_name: string
  team_name: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  old_rating: number | null
  new_rating: number | null
  old_minutes: number | null
  new_minutes: number | null
  admin_email: string | null
  created_at: string
  change_reason: string | null
  anomaly_flag: string | null
}

type Anomaly = {
  type: string
  player_id: number
  player_name: string
  description: string
  changes: number
}

interface Props {
  groupId: string
  roundId: string
  roundName: string
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function operationBadge(op: string): string {
  if (op === 'INSERT') return 'bg-green-500/20 text-green-300 border-green-500/30'
  if (op === 'UPDATE') return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  if (op === 'DELETE') return 'bg-red-500/20 text-red-300 border-red-500/30'
  return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
}

function anomalyColor(flag: string | null): string {
  if (!flag) return ''
  if (flag === 'POSSIBLE_DATA_LOSS') return 'bg-red-500/10 border-red-500/30'
  if (flag === 'INVALID_RATING') return 'bg-yellow-500/10 border-yellow-500/30'
  if (flag === 'DELETED_WITH_RATING') return 'bg-orange-500/10 border-orange-500/30'
  return ''
}

export function RatingsAuditViewer({ groupId, roundId, roundName }: Props) {
  const [data, setData] = useState<{
    stats: any
    recentChanges: AuditChange[]
    anomalies: Anomaly[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null)
  const [expandedAnomalies, setExpandedAnomalies] = useState(false)

  async function loadAudit() {
    if (data || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/rounds/${roundId}/audit`)
      if (res.ok) {
        const auditData = await res.json()
        setData(auditData)
      } else {
        console.error('Erro ao buscar auditoria')
      }
    } catch (error) {
      console.error('[AuditViewer] Erro:', error)
    }
    setLoading(false)
  }

  async function toggleExpanded() {
    const nextExpanded = !expanded
    setExpanded(nextExpanded)
    if (nextExpanded) await loadAudit()
  }

  if (!expanded) {
    return (
      <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
        <button
          type="button"
          onClick={toggleExpanded}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-white">Historico de mudancas</p>
            <p className="text-xs text-gray-500">Auditoria tecnica; carregue apenas se precisar investigar uma alteracao.</p>
          </div>
          <span className="rounded border border-gray-600 bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-200">
            Ver historico
          </span>
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm">Carregando historico...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm">Erro ao carregar auditoria</p>
      </div>
    )
  }
  const filteredChanges = selectedPlayer
    ? data.recentChanges.filter((c) => c.player_id === selectedPlayer)
    : data.recentChanges

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="text-xs font-semibold text-gray-400 hover:text-white"
      >
        Ocultar historico
      </button>
      {/* Header com stats */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <h3 className="text-lg font-bold text-white mb-3">ðŸ“‹ HistÃ³rico de MudanÃ§as</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Total de MudanÃ§as</p>
            <p className="text-2xl font-bold text-lime-400">{data.stats.totalChanges}</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Jogadores Modificados</p>
            <p className="text-2xl font-bold text-blue-400">{data.stats.uniquePlayers}</p>
          </div>
          <div
            className={`rounded-lg p-3 border ${
              data.stats.anomaliesDetected > 0
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-gray-900/50 border-gray-700'
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">Anomalias Detectadas</p>
            <p
              className={`text-2xl font-bold ${
                data.stats.anomaliesDetected > 0 ? 'text-red-400' : 'text-gray-400'
              }`}
            >
              {data.stats.anomaliesDetected}
            </p>
          </div>
        </div>
      </div>

      {/* Anomalias */}
      {data.anomalies.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <button
            onClick={() => setExpandedAnomalies(!expandedAnomalies)}
            className="w-full text-left flex items-center justify-between"
          >
            <h4 className="font-bold text-red-300">âš ï¸ Anomalias Detectadas ({data.anomalies.length})</h4>
            <span className={`transition-transform ${expandedAnomalies ? 'rotate-90' : ''}`}>â–¶</span>
          </button>

          {expandedAnomalies && (
            <div className="mt-3 space-y-2 border-t border-red-500/20 pt-3">
              {data.anomalies.map((anom) => (
                <div key={`${anom.type}-${anom.player_id}`} className="bg-red-900/20 rounded-lg p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-red-200 text-sm">{anom.player_name}</p>
                      <p className="text-xs text-red-300">{anom.description}</p>
                    </div>
                    <span className="text-xs bg-red-500/30 text-red-200 px-2 py-1 rounded">
                      {anom.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filtro de jogador */}
      {data.stats.uniquePlayers > 1 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-2">Filtrar por jogador:</p>
          <button
            onClick={() => setSelectedPlayer(null)}
            className={`text-xs font-medium px-3 py-1 rounded mr-2 ${
              selectedPlayer === null
                ? 'bg-lime-400 text-gray-900'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Todos ({data.stats.totalChanges})
          </button>
          {Array.from(
            new Map(
              data.recentChanges.map((c) => [
                c.player_id,
                { name: c.player_name, changes: data.recentChanges.filter((x) => x.player_id === c.player_id).length },
              ])
            ).values()
          )
            .slice(0, 10)
            .map((p) => (
              <button
                key={p.name}
                onClick={() => setSelectedPlayer(data.recentChanges.find((c) => c.player_name === p.name)?.player_id ?? null)}
                className={`text-xs font-medium px-3 py-1 rounded mr-2 ${
                  selectedPlayer ===
                  data.recentChanges.find((c) => c.player_name === p.name)?.player_id
                    ? 'bg-blue-400 text-gray-900'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {p.name} ({p.changes})
              </button>
            ))}
        </div>
      )}

      {/* Lista de mudanÃ§as */}
      <div className="space-y-2">
        <h4 className="font-semibold text-white text-sm">MudanÃ§as Recentes</h4>
        {filteredChanges.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center text-gray-400 text-sm">
            Nenhuma mudanÃ§a neste filtro
          </div>
        ) : (
          filteredChanges.map((change) => (
            <div
              key={change.audit_id}
              className={`bg-gray-800 border rounded-lg p-3 text-sm ${anomalyColor(change.anomaly_flag) || 'border-gray-700'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {change.player_name}
                    <span className="text-gray-500 ml-2 text-xs">{change.team_name}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(change.created_at)}</p>
                  {change.admin_email && (
                    <p className="text-xs text-gray-500">Admin: {change.admin_email}</p>
                  )}
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded border whitespace-nowrap shrink-0 ${operationBadge(change.operation)}`}
                >
                  {change.operation}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Nota</p>
                  <p className="text-white">
                    {change.old_rating !== null ? (
                      <>
                        <span className="line-through text-gray-600">{change.old_rating.toFixed(2)}</span>
                        {' â†’ '}
                      </>
                    ) : null}
                    {change.new_rating !== null ? (
                      <span className="font-bold text-lime-400">{change.new_rating.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-500">â€”</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Minutos</p>
                  <p className="text-white">
                    {change.old_minutes !== null ? (
                      <>
                        <span className="line-through text-gray-600">{change.old_minutes}</span>
                        {' â†’ '}
                      </>
                    ) : null}
                    {change.new_minutes !== null ? (
                      <span className="font-bold">{change.new_minutes}</span>
                    ) : (
                      <span className="text-gray-500">â€”</span>
                    )}
                  </p>
                </div>
              </div>

              {change.anomaly_flag && (
                <div className="mt-2 p-2 bg-black/30 rounded border border-yellow-500/30">
                  <p className="text-xs font-semibold text-yellow-300">ðŸš¨ {change.anomaly_flag}</p>
                </div>
              )}

              {change.change_reason && (
                <p className="text-xs text-gray-400 mt-2">RazÃ£o: {change.change_reason}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
