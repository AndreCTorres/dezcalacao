'use client'

// app/admin/draft/player-search.tsx
// Busca de jogadores e atribuição

import { useState, useCallback } from 'react'
import { searchPlayers } from './actions'
import type { Position } from '@/lib/types'

const POSITIONS: Position[] = ['GK', 'ZAG', 'LAT', 'MEI', 'ATK']

type PlayerSearchProps = {
  groupId: string
  onPlayerAssign: (playerId: number, slot: 'starter' | 'bench', position: Position) => void
  loading: boolean
}

type Player = {
  id: number
  name: string
  team_id: number
  team_name: string
  position: string
  api_position: string
  photo_url: string | null
  number: number | null
  age: number | null
}

export function PlayerSearch({ groupId, onPlayerAssign, loading }: PlayerSearchProps) {
  const [query, setQuery] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<'starter' | 'bench'>('starter')
  const [selectedPosition, setSelectedPosition] = useState<Position>('MEI')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (q.trim().length < 2) {
      setPlayers([])
      return
    }

    setSearching(true)
    const res = await searchPlayers(q, groupId)
    if (res.success) {
      setPlayers(res.players || [])
    }
    setSearching(false)
  }, [groupId])

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player)
    setShowConfirm(true)
  }

  const handleConfirmAssign = async () => {
    if (!selectedPlayer) return
    onPlayerAssign(selectedPlayer.id, selectedSlot, selectedPosition)
    setShowConfirm(false)
    setSelectedPlayer(null)
    setQuery('')
    setPlayers([])
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">Buscar Jogador</h2>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Ex: Mbappé, Vinicius..."
        value={query}
        onChange={e => handleSearch(e.target.value)}
        disabled={loading || searching}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent disabled:opacity-50"
      />

      {searching && <p className="text-xs text-gray-500 mt-2">Buscando...</p>}

      {/* Slot Selection */}
      <div className="mt-4">
        <label className="text-xs font-medium text-gray-300 mb-2 block">Tipo</label>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedSlot('starter')}
            className={`flex-1 py-1 px-2 text-xs rounded transition ${
              selectedSlot === 'starter'
                ? 'bg-lime-400 text-gray-900 font-semibold'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Titular
          </button>
          <button
            onClick={() => setSelectedSlot('bench')}
            className={`flex-1 py-1 px-2 text-xs rounded transition ${
              selectedSlot === 'bench'
                ? 'bg-lime-400 text-gray-900 font-semibold'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Reserva
          </button>
        </div>
      </div>

      {/* Position Selection */}
      <div className="mt-4">
        <label className="text-xs font-medium text-gray-300 mb-2 block">Posição</label>
        <select
          value={selectedPosition}
          onChange={e => setSelectedPosition(e.target.value as Position)}
          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent"
        >
          {POSITIONS.map(pos => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </div>

      {/* Players List */}
      {players.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-400 mb-2">{players.length} jogadores encontrados</p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {players.map(player => (
              <button
                key={player.id}
                onClick={() => handleSelectPlayer(player)}
                className="w-full text-left p-2 bg-gray-700/50 hover:bg-gray-700 rounded transition"
              >
                <div className="font-medium text-white text-sm">{player.name}</div>
                <div className="text-xs text-gray-400">
                  {player.team_name} • #{player.number || '—'} • {player.position}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {query && players.length === 0 && !searching && (
        <p className="text-xs text-gray-500 mt-4">Nenhum jogador encontrado</p>
      )}

      {/* Confirmation Modal */}
      {showConfirm && selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Confirmar Atribuição</h3>

            <div className="bg-gray-700/50 rounded p-3 mb-4 space-y-2">
              <div>
                <p className="text-xs text-gray-400">Jogador</p>
                <p className="text-white font-medium">{selectedPlayer.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Seleção</p>
                <p className="text-white">{selectedPlayer.team_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Tipo</p>
                  <p className="text-white font-medium">
                    {selectedSlot === 'starter' ? 'Titular' : 'Reserva'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Posição</p>
                  <p className="text-white font-medium">{selectedPosition}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false)
                  setSelectedPlayer(null)
                }}
                className="flex-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={loading}
                className="flex-1 py-2 px-3 bg-lime-400 hover:bg-lime-500 text-gray-900 font-semibold rounded-lg text-sm transition disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
