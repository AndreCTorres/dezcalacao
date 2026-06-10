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

    try {
      const result = await applySubstitution(groupMemberId, roundId, outPlayerId, inPlayerId, pos)

      if (result.success) {
        setSuccess(`✓ Substituição realizada!`)
        setSelectedStarter(null)
        
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
      {success && <div className="mb-4 p-3 bg-green-900/30 border border-green-500 text-green-300 rounded" data-testid="success-message">{success}</div>}

      {/* Posições */}
      <div className="space-y-6">
        {positionGroups.map((group) => (
          <PositionGroup
            key={group.position}
            group={group}
            subMap={subMap}
            selectedStarter={selectedStarter}
            onSelectStarter={setSelectedStarter}
            onApplySubstitution={handleApplySubstitution}
            onRemoveSubstitution={handleRemoveSubstitution}
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
  onSelectStarter: (playerId: number | null) => void
  onApplySubstitution: (outId: number, inId: number, pos: Position) => Promise<void>
  onRemoveSubstitution: (subId: string) => Promise<void>
  loading: boolean
  maxSubsReached: boolean
}

function PositionGroup({
  group,
  subMap,
  selectedStarter,
  onSelectStarter,
  onApplySubstitution,
  onRemoveSubstitution,
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
                  }
                }}
                className={`
                  p-3 rounded-lg transition cursor-pointer
                  ${
                    substitution
                      ? 'bg-yellow-900/20 border border-yellow-600 opacity-50'
                      : isSelected
                        ? 'bg-lime-900/30 border border-lime-400'
                        : 'bg-gray-700/50 border border-gray-600 hover:border-gray-500'
                  }
                  ${maxSubsReached && !substitution ? 'cursor-not-allowed opacity-50' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-white">{starter.players.name}</p>
                    <p className="text-xs text-gray-400">{starter.players.team_name}</p>
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

                {/* Mostrar reserva selecionada */}
                {isSelected && group.bench.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className="text-xs text-gray-400 mb-2">Escolha um reserva para entrar:</p>
                    <div className="space-y-2">
                      {group.bench.map((bench) => (
                        <button
                          key={bench.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onApplySubstitution(starter.player_id, bench.player_id, group.position)
                          }}
                          disabled={loading}
                          className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50 transition"
                        >
                          {loading ? 'Substituindo...' : `← ${bench.players.name}`}
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

      {/* Reservas (não selecionáveis) */}
      {group.bench.length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-2">Reservas ({group.bench.length})</p>
          <div className="space-y-2">
            {group.bench.map((bench) => (
              <div key={bench.id} className="p-3 rounded-lg bg-gray-700/30 border border-gray-600 opacity-60">
                <p className="font-medium text-gray-300">{bench.players.name}</p>
                <p className="text-xs text-gray-500">{bench.players.team_name}</p>
              </div>
            ))}
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
