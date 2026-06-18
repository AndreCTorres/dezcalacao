'use client'

// app/app/selecao/team-of-round-pitch.tsx
// Campinho da "Seleção da Rodada": XI 4-3-3 (GK, 4 defensores, 3 meias, 3 atacantes)
// com as maiores notas da rodada. Destaca o craque (maior nota) com coroa e brilho.

import Image from 'next/image'

export type TotrPlayer = {
  player_id: number
  name: string
  team_name: string
  position: string
  photo_url: string | null
  number: number | null
  rating: number | null
  minutes: number
}

type Props = {
  lines: { GK: TotrPlayer[]; DEF: TotrPlayer[]; MEI: TotrPlayer[]; ATK: TotrPlayer[] }
  bestPlayerId: number | null
}

const POSITION_COLORS: Record<string, string> = {
  GK: 'from-yellow-500 to-yellow-600',
  ZAG: 'from-blue-500 to-blue-700',
  LAT: 'from-cyan-500 to-cyan-700',
  MEI: 'from-lime-500 to-lime-700',
  ATK: 'from-red-500 to-red-700',
}
const POSITION_BADGE_COLORS: Record<string, string> = {
  GK: 'bg-yellow-500 text-gray-900',
  ZAG: 'bg-blue-500 text-white',
  LAT: 'bg-cyan-500 text-gray-900',
  MEI: 'bg-lime-500 text-gray-900',
  ATK: 'bg-red-500 text-white',
}

function getRatingColor(rating: number | null): string {
  if (rating == null) return 'text-gray-400'
  if (rating >= 8) return 'text-yellow-400'
  if (rating >= 7) return 'text-lime-400'
  if (rating >= 6) return 'text-white'
  return 'text-red-400'
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return fullName
  const last = parts[parts.length - 1]
  if (last.length <= 3 && parts.length >= 2) {
    const secondLast = parts[parts.length - 2]
    if (secondLast.length <= 3) return `${secondLast} ${last}`
    return secondLast
  }
  return last
}

function PlayerToken({ player, isBest }: { player: TotrPlayer; isBest: boolean }) {
  const pos = player.position
  const colorGrad = POSITION_COLORS[pos] || 'from-gray-500 to-gray-700'
  const badgeColor = POSITION_BADGE_COLORS[pos] || 'bg-gray-500 text-white'
  const hasPhoto = !!player.photo_url

  return (
    <div className="flex flex-col items-center gap-1 w-[72px]">
      {isBest && (
        <span className="text-base leading-none -mb-1 drop-shadow-[0_0_6px_rgba(234,179,8,0.9)]">👑</span>
      )}
      <div className="relative w-12 h-12 sm:w-14 sm:h-14">
        {isBest && (
          <div className="absolute -inset-1 rounded-full bg-yellow-400/30 ring-2 ring-yellow-400 animate-pulse pointer-events-none" />
        )}
        <div
          className={`relative w-full h-full rounded-full overflow-hidden border-2
            ${hasPhoto ? 'bg-gray-800' : `bg-gradient-to-b ${colorGrad}`}
            ${isBest ? 'border-yellow-400' : 'border-gray-900'}
            flex items-center justify-center`}
        >
          {hasPhoto ? (
            <Image src={player.photo_url!} alt={player.name} width={56} height={56} className="w-full h-full object-cover object-top" unoptimized />
          ) : (
            <span className="text-xl">👤</span>
          )}
        </div>
        <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${badgeColor} text-[9px] font-black px-1.5 py-0.5 rounded-sm leading-none whitespace-nowrap shadow-lg`}>
          {pos}
        </span>
      </div>
      <span className="text-white font-semibold leading-tight text-center truncate max-w-full text-xs sm:text-sm">
        {shortName(player.name)}
      </span>
      <span className="text-gray-400 text-[10px] leading-none truncate max-w-full">{player.team_name}</span>
      <span className={`font-mono font-bold leading-none text-xs ${getRatingColor(player.rating)}`}>
        {player.rating != null ? player.rating.toFixed(1) : '—'}
      </span>
    </div>
  )
}

export function TeamOfRoundPitch({ lines, bestPlayerId }: Props) {
  // De cima para baixo: ATK, MEI, DEF, GK
  const rows: Array<{ key: 'ATK' | 'MEI' | 'DEF' | 'GK' }> = [
    { key: 'ATK' },
    { key: 'MEI' },
    { key: 'DEF' },
    { key: 'GK' },
  ]

  return (
    <div
      className="relative w-full rounded-2xl border border-white/10 overflow-hidden"
      style={{ aspectRatio: '3 / 4', background: 'linear-gradient(180deg,#0b3d1f 0%,#0f5128 50%,#0b3d1f 100%)' }}
    >
      {/* Linhas do gramado */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/40" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-16 border-t border-l border-r border-white/40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16 border-b border-l border-r border-white/40" />
      </div>

      {/* Linhas do time distribuídas verticalmente */}
      <div className="absolute inset-0 flex flex-col justify-around py-4">
        {rows.map(({ key }) => {
          const players = lines[key] || []
          return (
            <div key={key} className="flex justify-evenly items-start px-2">
              {players.length === 0 ? (
                <span className="text-white/30 text-xs">—</span>
              ) : (
                players.map((p) => (
                  <PlayerToken key={p.player_id} player={p} isBest={p.player_id === bestPlayerId} />
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
