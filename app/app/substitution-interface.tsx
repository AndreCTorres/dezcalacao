'use client'

// app/app/substitution-interface.tsx
// Componente para fazer substituições (reserva <-> titular)

import { useState } from 'react'
import { applySubstitution, removeSubstitution } from './substitutions-actions'
import type { Substitution, Position } from '@/lib/types'

type TeamPlayerData = {
  id: string
  player_id: number
  slot: string
  position_slot: Position
  rating?: number | null
  players: {
    id: number
    name: string
    team_name: string
    position: string
    photo_url: string | null
    number: number | null
  }
}

interface SubstitutionInterfaceProps {
  groupMemberId: string
  roundId: string
  teamPlayers: TeamPlayerData[]
  currentSubstitutions: Substitution[]
  maxSubsPerRound: number
}

type PositionGroup = {
  position: Position
  starters: TeamPlayerData[]
  bench: TeamPlayerData[]
}

export function SubstitutionInterface({
  groupMemberId,
  roundId,
  teamPlayers,
  currentSubstitutions,
  maxSubsPerRound,
}: SubstitutionInterfaceProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedStarter, setSelectedStarter] = useState<number | null>(null)
  const [selectedBench, setSelectedBench] = useState<number | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  // Construir map de substituições (out_player_id -> Substitution)
  const subMap = new Map(currentSubstitutions.map((s) => [s.out_player_id, s]))

  // Agrupar por posição
  const positionGroups: PositionGroup[] = []
  const positions: Position[] = ['GK', 'ZAG', 'LAT', 'MEI', 'ATK']

  positions.forEach((pos) => {
    const starters = teamPlayers.filter((tp) => tp.slot === 'starter' && tp.position_slot === pos)
    const bench = teamPlayers.filter((tp) => tp.slot === 'bench' && tp.position_slot === pos)

    if (starters.length > 0 || bench.length > 0) {
      positionGroups.push({
        position: pos,
        starters,
        bench,
      })
    }
  })

  // Handlers
  const handleApplySubstitution = async (outPlayerId: number, inPlayerId: number, pos: Position) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setWarning(null)

    try {
      const result = await applySubstitution(groupMemberId, roundId, outPlayerId, inPlayerId, pos)

      if (result.success) {
        setSuccess(`✓ Substituição realizada!`)
        setSelectedStarter(null)
        setSelectedBench(null)
        
        // Show toast
        if (typeof window !== 'undefined' && (window as any).showToast) {
          ;(window as any).showToast('Substituição realizada com sucesso!', 'success', 3000)
        }
        
        // Recarregar página em 1s
        setTimeout(() => window.location.reload(), 1000)
      } else {
        const errorMsg = result.error || 'Erro ao criar substituição'
        setError(errorMsg)
        
        if (typeof window !== 'undefined' && (window as any).showToast) {
          ;(window as any).showToast(errorMsg, 'error', 5000)
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro inesperado'
      setError(errorMsg)
      
      if (typeof window !== 'undefined' && (window as any).showToast) {
        ;(window as any).showToast(errorMsg, 'error', 5000)
      }
    } finally {
      setLoading(false)
    }
  }

  // Verificar se a nota do reserva é menor e mostrar warning
  const checkRatingWarning = (outPlayer: any, inPlayer: any) => {
    // outPlayer = quem sai (titular), inPlayer = quem entra (reserva)
    const outRating = outPlayer?.rating ?? null
    const inRating = inPlayer?.rating ?? null

    // Se uma nota está faltando, não mostrar aviso
    if (outRating === null || inRating === null) {
      setWarning(null)
      return false
    }

    if (inRating < outRating) {
      setWarning(
        `⚠️ Atenção: ${inPlayer.players.name} (nota: ${inRating.toFixed(1)}) tem nota menor que ${outPlayer.players.name} (nota: ${outRating.toFixed(1)})`
      )
      return true
    }
    setWarning(null)
    return false
  }

  const handleRemoveSubstitution = async (substitutionId: string) => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await removeSubstitution(substitutionId, groupMemberId)

      if (result.success) {
        setSuccess(`✓ Substituição removida!`)
        
        if (typeof window !== 'undefined' && (window as any).showToast) {
          ;(window as any).showToast('Substituição removida!', 'success', 3000)
        }
        
        setTimeout(() => window.location.reload(), 1000)
      } else {
        const errorMsg = result.error || 'Erro ao remover substituição'
        setError(errorMsg)
        
        if (typeof window !== 'undefined' && (window as any).showToast) {
          ;(window as any).showToast(errorMsg, 'error', 5000)
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro inesperado'
      setError(errorMsg)
      
      if (typeof window !== 'undefined' && (window as any).showToast) {
        ;(window as any).showToast(errorMsg, 'error', 5000)
      }
    } finally {
      setLoading(false)
    }
  }

  const subCount = currentSubstitutions.length

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Escalação & Substituições</h2>
        <p className="text-gray-400 text-sm">
          {subCount} / {maxSubsPerRound} substituição{subCount !== 1 ? 'ões' : ''} utilizadas
        </p>
      </div>

      {/* Mensagens */}
      {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-500 text-red-300 rounded" data-testid="error-message">{error}</div>}
      {warning && <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600 text-yellow-300 rounded" data-testid="warning-message">{warning}</div>}
      {success && <div className="mb-4 p-3 bg-green-900/30 border border-green-500 text-green-300 rounded" data-testid="success-message">{success}</div>}
      {/* Posições */}
      <div className="space-y-6">
        {positionGroups.map((group) => (
          <PositionGroup
            key={group.position}
            group={group}
            subMap={subMap}
            selectedStarter={selectedStarter}
            selectedBench={selectedBench}
            onSelectStarter={setSelectedStarter}
            onSelectBench={setSelectedBench}
            onApplySubstitution={handleApplySubstitution}
            onRemoveSubstitution={handleRemoveSubstitution}
            onCheckRating={checkRatingWarning}
            loading={loading}
            maxSubsReached={subCount >= maxSubsPerRound}
          />
        ))}
      </div>

      {teamPlayers.length === 0 && (
        <p className="text-gray-400 text-center py-8">Seu time ainda não foi definido. Aguarde o draft!</p>
      )}
    </div>
  )
}

interface PositionGroupProps {
  group: PositionGroup
  subMap: Map<number, Substitution>
  selectedStarter: number | null
  selectedBench: number | null
  onSelectStarter: (playerId: number | null) => void
  onSelectBench: (playerId: number | null) => void
  onApplySubstitution: (outId: number, inId: number, pos: Position) => Promise<void>
  onRemoveSubstitution: (subId: string) => Promise<void>
  onCheckRating: (starter: any, bench: any) => boolean
  loading: boolean
  maxSubsReached: boolean
}

function PositionGroup({
  group,
  subMap,
  selectedStarter,
  selectedBench,
  onSelectStarter,
  onSelectBench,
  onApplySubstitution,
  onRemoveSubstitution,
  onCheckRating,
  loading,
  maxSubsReached,
}: PositionGroupProps) {
  return (
    <div className="border-l-4 border-lime-400 pl-4">
      <h3 className="text-lg font-semibold text-lime-400 mb-4">{getPosLabel(group.position)}</h3>

      {/* Titulares */}
      <div className="mb-4">
        <p className="text-sm text-gray-400 mb-2">Titulares ({group.starters.length})</p>
        <div className="space-y-2">
          {group.starters.map((starter) => {
            const substitution = subMap.get(starter.player_id)
            const isSelected = selectedStarter === starter.player_id

            return (
              <div
                key={starter.id}
                onClick={() => {
                  if (!substitution && group.bench.length > 0 && !maxSubsReached) {
                    onSelectStarter(isSelected ? null : starter.player_id)
                    onSelectBench(null) // Limpar seleção do banco
                  }
                }}
                className={`
                  p-3 rounded-lg transition
                  ${
                    substitution
                      ? 'bg-yellow-900/20 border border-yellow-600 opacity-50 cursor-default'
                      : !maxSubsReached && group.bench.length > 0
                        ? 'cursor-pointer'
                        : 'cursor-not-allowed opacity-50'
                  }
                  ${
                    substitution
                      ? ''
                      : isSelected
                        ? 'bg-lime-900/30 border border-lime-400'
                        : 'bg-gray-700/50 border border-gray-600 hover:border-gray-500'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-white">{starter.players.name}</p>
                    <p className="text-xs text-gray-400">{starter.players.team_name}</p>
                    {starter.rating != null && (
                      <p className="text-xs text-lime-300 font-semibold mt-1">Nota: {starter.rating.toFixed(1)}</p>
                    )}
                  </div>
                  {substitution && (
                    <div className="ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveSubstitution(substitution.id)
                        }}
                        disabled={loading}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded disabled:opacity-50"
                      >
                        {loading ? 'Removendo...' : 'Reverter'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Mostrar reserva selecionada (titular selecionado) */}
                {isSelected && group.bench.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className="text-xs text-gray-400 mb-2">Escolha um reserva para entrar:</p>
                    <div className="space-y-2">
                      {group.bench.map((bench) => (
                        <button
                          key={bench.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onCheckRating(starter, bench)
                            onApplySubstitution(starter.player_id, bench.player_id, group.position)
                          }}
                          disabled={loading}
                          className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50 transition text-left"
                        >
                          {loading ? 'Substituindo...' : `← ${bench.players.name}`}
                          {bench.rating != null && (
                            <span className="ml-2 text-xs text-gray-200">(nota: {bench.rating.toFixed(1)})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Reservas (agora clicáveis para iniciar substituição) */}
      {group.bench.length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-2">Reservas ({group.bench.length})</p>
          <div className="space-y-2">
            {group.bench.map((bench) => {
              const isSelected = selectedBench === bench.player_id

              return (
                <div
                  key={bench.id}
                  onClick={() => {
                    if (!maxSubsReached && group.starters.length > 0) {
                      onSelectBench(isSelected ? null : bench.player_id)
                      onSelectStarter(null) // Limpar seleção do titular
                    }
                  }}
                  className={`
                    p-3 rounded-lg transition
                    ${
                      !maxSubsReached && group.starters.length > 0
                        ? 'cursor-pointer'
                        : 'cursor-not-allowed opacity-50'
                    }
                    ${
                      isSelected
                        ? 'bg-blue-900/30 border border-blue-400'
                        : 'bg-gray-700/30 border border-gray-600 hover:border-gray-500'
                    }
                  `}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-300">{bench.players.name}</p>
                    <p className="text-xs text-gray-500">{bench.players.team_name}</p>
                    {bench.rating != null && (
                      <p className="text-xs text-yellow-300 font-semibold mt-1">Nota: {bench.rating.toFixed(1)}</p>
                    )}
                  </div>

                  {/* Mostrar titulares disponíveis (reserva selecionado) */}
                  {isSelected && group.starters.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-500">
                      <p className="text-xs text-gray-400 mb-2">Escolha um titular para sair:</p>
                      <div className="space-y-2">
                        {group.starters
                          .filter((s) => !subMap.has(s.player_id)) // Não mostrar titulares que já foram substituídos
                          .map((starter) => (
                            <button
                              key={starter.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                onCheckRating(starter, bench)
                                onApplySubstitution(starter.player_id, bench.player_id, group.position)
                              }}
                              disabled={loading}
                              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50 transition text-left"
                            >
                              {loading ? 'Substituindo...' : `${starter.players.name} →`}
                              {starter.rating != null && (
                                <span className="ml-2 text-xs text-gray-200">(nota: {starter.rating.toFixed(1)})</span>
                              )}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function getPosLabel(pos: Position): string {
  const labels: Record<Position, string> = {
    GK: '🧤 Goleiros',
    ZAG: '🛡️ Zagueiros',
    LAT: '🔄 Laterais',
    MEI: '⚙️ Meio-campo',
    ATK: '⚽ Ataque',
  }
  return labels[pos]
}
