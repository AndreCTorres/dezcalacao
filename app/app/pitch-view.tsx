'use client'

// app/app/pitch-view.tsx
// Campinho visual com jogadores posicionados em campo
// Formação: 1 GK | 2 ZAG | 2 LAT | 3 MEI | 3 ATK

import Image from 'next/image'
import Link from 'next/link'

export type PitchPlayer = {
  id: string
  player_id: number
  slot: 'starter' | 'bench'
  position_slot: string
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

type PitchViewProps = {
  team: PitchPlayer[]
  memberTeamName?: string | null
}

// Configuração do posicionamento no campo
// Cada posição tem uma "linha" (row) e uma ordem dentro dela
const FORMATION_CONFIG: Record<string, { row: number; order: number; label: string }> = {
  GK:  { row: 0, order: 0, label: 'GOL' },
  ZAG: { row: 1, order: 0, label: 'ZAG' },
  LAT: { row: 2, order: 0, label: 'LAT' },
  MEI: { row: 3, order: 0, label: 'MEI' },
  ATK: { row: 4, order: 0, label: 'ATK' },
}

// Cores por posição
const POSITION_COLORS: Record<string, string> = {
  GK:  'from-yellow-500 to-yellow-600',
  ZAG: 'from-blue-500 to-blue-700',
  LAT: 'from-cyan-500 to-cyan-700',
  MEI: 'from-lime-500 to-lime-700',
  ATK: 'from-red-500 to-red-700',
}

const POSITION_BADGE_COLORS: Record<string, string> = {
  GK:  'bg-yellow-500 text-gray-900',
  ZAG: 'bg-blue-500 text-white',
  LAT: 'bg-cyan-500 text-gray-900',
  MEI: 'bg-lime-500 text-gray-900',
  ATK: 'bg-red-500 text-white',
}

function getRatingColor(rating: number | null | undefined): string {
  if (rating == null) return 'text-gray-400'
  if (rating >= 8) return 'text-yellow-400'
  if (rating >= 7) return 'text-lime-400'
  if (rating >= 6) return 'text-white'
  return 'text-red-400'
}

function getRatingBg(rating: number | null | undefined): string {
  if (rating == null) return 'bg-gray-700/80'
  if (rating >= 8) return 'bg-yellow-500/20 ring-1 ring-yellow-400/50'
  if (rating >= 7) return 'bg-lime-500/20 ring-1 ring-lime-400/50'
  if (rating >= 6) return 'bg-white/10'
  return 'bg-red-500/20 ring-1 ring-red-400/50'
}

// Pega o sobrenome ou nome curto
function shortName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return fullName
  // Prefere último nome, mas se for muito curto pega penúltimo
  const last = parts[parts.length - 1]
  if (last.length <= 3 && parts.length >= 2) {
    return parts[parts.length - 2]
  }
  return last
}

function PlayerToken({ player, size = 'md' }: { player: PitchPlayer; size?: 'sm' | 'md' }) {
  const pos = player.position_slot as string
  const colorGrad = POSITION_COLORS[pos] || 'from-gray-500 to-gray-700'
  const badgeColor = POSITION_BADGE_COLORS[pos] || 'bg-gray-500 text-white'
  const rating = player.rating
  const isSmall = size === 'sm'

  return (
    <div className={`flex flex-col items-center gap-1 group ${isSmall ? 'w-14' : 'w-16 sm:w-[72px]'}`}>
      {/* Foto / avatar */}
      <div className={`relative ${isSmall ? 'w-12 h-12' : 'w-14 h-14 sm:w-16 sm:h-16'}`}>
        {/* Ring de rating */}
        <div className={`absolute inset-0 rounded-full ${getRatingBg(rating)}`} />

        <div className={`
          w-full h-full rounded-full overflow-hidden border-2
          bg-gradient-to-b ${colorGrad}
          flex items-center justify-center
          border-gray-900
          transition-transform group-hover:scale-105
        `}>
          {player.players.photo_url ? (
            <Image
              src={player.players.photo_url}
              alt={player.players.name}
              width={isSmall ? 48 : 64}
              height={isSmall ? 48 : 64}
              className="w-full h-full object-cover object-top"
              unoptimized
            />
          ) : (
            <span className={isSmall ? 'text-lg' : 'text-xl'}>👤</span>
          )}
        </div>

        {/* Badge de posição */}
        <span className={`
          absolute -bottom-1 left-1/2 -translate-x-1/2
          ${badgeColor}
          text-[9px] font-black px-1.5 py-0.5 rounded-sm leading-none
          whitespace-nowrap shadow-lg
        `}>
          {pos}
        </span>
      </div>

      {/* Nome */}
      <span className={`
        text-white font-semibold leading-tight text-center
        truncate max-w-full
        ${isSmall ? 'text-[10px]' : 'text-[11px] sm:text-xs'}
      `}>
        {shortName(player.players.name)}
      </span>

      {/* Nota */}
      <span className={`
        font-mono font-bold leading-none
        ${isSmall ? 'text-[11px]' : 'text-xs sm:text-sm'}
        ${getRatingColor(rating)}
      `}>
        {rating != null ? rating.toFixed(1) : '—'}
      </span>
    </div>
  )
}

export function PitchView({ team, memberTeamName }: PitchViewProps) {
  const starters = team.filter(t => t.slot === 'starter')
  const bench = team.filter(t => t.slot === 'bench')

  // Organiza titulares por posição
  const byPos = (pos: string) => starters.filter(p => p.position_slot === pos)
  const gks  = byPos('GK')
  const zags = byPos('ZAG')
  const lats = byPos('LAT')
  const meis = byPos('MEI')
  const atks = byPos('ATK')

  // Linha do campo
  const fieldRow = (players: PitchPlayer[], label: string) => (
    <div className="relative flex items-center justify-center gap-2 sm:gap-4 w-full py-1">
      {/* linha de separação sutil */}
      {label !== 'GK' && (
        <div className="absolute top-0 left-[10%] right-[10%] h-px bg-white/5" />
      )}
      {players.map(p => (
        <PlayerToken key={p.id} player={p} />
      ))}
    </div>
  )

  const totalRating = starters
    .filter(p => p.rating != null)
    .reduce((sum, p) => sum + (p.rating ?? 0), 0)

  const hasRatings = starters.some(p => p.rating != null)

  return (
    <div className="space-y-4">
      {/* Card do campinho */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0d1a0f]">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center px-5 py-3 bg-black/40 border-b border-white/10">
          <div>
            <h2 className="text-white font-bold text-lg tracking-tight">Meu Time</h2>
            {memberTeamName && (
              <p className="text-xs text-lime-300 mt-1">🏆 {memberTeamName}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {hasRatings && (
              <div className="flex items-center gap-1.5 bg-yellow-500/20 rounded-full px-3 py-1 border border-yellow-500/30">
                <span className="text-yellow-400 font-mono font-bold text-sm">
                  {totalRating.toFixed(1)}
                </span>
                <span className="text-yellow-400/60 text-xs">pts</span>
              </div>
            )}
            {team.length > 0 && (
              <Link
                href="/app/time"
                className="px-3 py-1.5 bg-lime-500 hover:bg-lime-400 text-gray-900 font-bold rounded-full transition text-xs flex items-center gap-1"
              >
                🔄 Subs
              </Link>
            )}
          </div>
        </div>

        {/* CAMPINHO */}
        {team.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <p className="text-4xl mb-3">⚽</p>
            <p>Seu time ainda não foi definido. Aguarde o draft!</p>
          </div>
        ) : (
          <div
            className="relative w-full select-none"
            style={{ minHeight: '480px' }}
          >
            {/* Grama — gradiente e linhas do campo */}
            <FieldBackground />

            {/* Jogadores sobrepostos */}
            <div className="relative z-10 flex flex-col justify-between px-3 py-4 gap-1"
                 style={{ minHeight: '480px' }}>

              {/* ATK — linha do ataque (top, mais perto do gol adversário) */}
              {fieldRow(atks, 'ATK')}

              {/* MEI */}
              {fieldRow(meis, 'MEI')}

              {/* LAT */}
              {fieldRow(lats, 'LAT')}

              {/* ZAG */}
              {fieldRow(zags, 'ZAG')}

              {/* GK */}
              {fieldRow(gks, 'GK')}
            </div>
          </div>
        )}
      </div>

      {/* Banco de Reservas */}
      {bench.length > 0 && (
        <div className="bg-gray-900/80 rounded-xl border border-white/10 p-4">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-px bg-gray-600 inline-block" />
            Banco de Reservas
            <span className="flex-1 h-px bg-gray-600 inline-block" />
          </h3>
          <div className="flex items-start justify-around gap-2 flex-wrap">
            {bench.map(p => (
              <PlayerToken key={p.id} player={p} size="sm" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Fundo do campinho com grama e linhas
function FieldBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradiente de grama */}
      <div className="absolute inset-0"
           style={{
             background: 'linear-gradient(180deg, #0d4a1a 0%, #0f5e20 18%, #127024 36%, #0f5e20 54%, #0d4a1a 72%, #0a3d15 100%)',
           }} />

      {/* Listras de grama */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'repeating-linear-gradient(180deg, transparent, transparent 58px, rgba(0,0,0,0.08) 58px, rgba(0,0,0,0.08) 116px)',
      }} />

      {/* SVG com linhas do campo */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 520"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.2"
      >
        {/* Borda do campo */}
        <rect x="16" y="16" width="368" height="488" rx="2" />

        {/* Linha do meio */}
        <line x1="16" y1="260" x2="384" y2="260" />

        {/* Círculo central */}
        <circle cx="200" cy="260" r="52" />
        <circle cx="200" cy="260" r="2" fill="rgba(255,255,255,0.3)" stroke="none" />

        {/* Área (ataque - topo) */}
        <rect x="96" y="16" width="208" height="78" />
        {/* Pequena área (topo) */}
        <rect x="148" y="16" width="104" height="32" />

        {/* Área (defesa - baixo) */}
        <rect x="96" y="426" width="208" height="78" />
        {/* Pequena área (baixo) */}
        <rect x="148" y="472" width="104" height="32" />

        {/* Ponto pênalti topo */}
        <circle cx="200" cy="72" r="2" fill="rgba(255,255,255,0.3)" stroke="none" />
        {/* Ponto pênalti baixo */}
        <circle cx="200" cy="448" r="2" fill="rgba(255,255,255,0.3)" stroke="none" />

        {/* Arco da área topo */}
        <path d="M 140 94 A 60 60 0 0 1 260 94" />
        {/* Arco da área baixo */}
        <path d="M 140 426 A 60 60 0 0 0 260 426" />

        {/* Cantos */}
        <path d="M16 24 Q16 16 24 16" />
        <path d="M376 16 Q384 16 384 24" />
        <path d="M384 496 Q384 504 376 504" />
        <path d="M24 504 Q16 504 16 496" />
      </svg>

      {/* Sombra nas bordas para profundidade */}
      <div className="absolute inset-0"
           style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)' }} />
    </div>
  )
}
