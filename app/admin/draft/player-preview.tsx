'use client'

// app/admin/draft/player-preview.tsx
// Preview de como os jogadores vão aparecer com fotos

import { PlayerPhoto } from '../../app/player-photo'
import type { Position } from '@/lib/types'

type Player = {
  id: number
  name: string
  team_id: number
  team_name: string
  position: string
  photo_url: string | null
  number: number | null
  age: number | null
}

type PlayerPreviewProps = {
  player: Player
  selected?: boolean
  onClick?: () => void
}

export function PlayerPreview({ player, selected, onClick }: PlayerPreviewProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg overflow-hidden transition transform hover:scale-105 ${
        selected
          ? 'ring-2 ring-lime-400 shadow-lg shadow-lime-400/50'
          : 'hover:shadow-lg'
      }`}
    >
      <div className="bg-gray-700 aspect-square relative flex flex-col items-center justify-center">
        {player.photo_url ? (
          <>
            <PlayerPhoto
              src={player.photo_url}
              alt={player.name}
              size={120}
              className="w-full h-full object-cover object-top"
              fallbackClassName="text-sm"
            />
            {/* Overlay com informações */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
              <div className="text-white">
                <p className="font-bold text-sm line-clamp-2">{player.name}</p>
                <div className="flex justify-between items-center text-xs text-gray-300">
                  <span>#{player.number || '—'}</span>
                  <span>{player.team_name}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-3xl mb-2">👤</div>
            <p className="text-xs font-medium text-center px-2">{player.name}</p>
          </div>
        )}
      </div>
    </button>
  )
}

// Grid de múltiplos players
type PlayerGridProps = {
  players: Player[]
  selectedIds?: number[]
  onPlayerSelect?: (playerId: number) => void
}

export function PlayerGrid({ players, selectedIds = [], onPlayerSelect }: PlayerGridProps) {
  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Nenhum jogador para exibir</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {players.map(player => (
        <PlayerPreview
          key={player.id}
          player={player}
          selected={selectedIds.includes(player.id)}
          onClick={() => onPlayerSelect?.(player.id)}
        />
      ))}
    </div>
  )
}
