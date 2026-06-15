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

// Pega o sobrenome ou nome curto, priorizando nomes compostos
function shortName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return fullName
  
  // Se o último nome é muito curto (2-3 caracteres), pega ele + o penúltimo
  const last = parts[parts.length - 1]
  if (last.length <= 3 && parts.length >= 2) {
    const secondLast = parts[parts.length - 2]
    // Se o penúltimo também é curto, junta os dois
    if (secondLast.length <= 3) {
      return `${secondLast} ${last}`
    }
    return secondLast
  }
  
  return last
}

function PlayerToken({ player, size = 'md' }: { player: PitchPlayer; size?: 'sm' | 'md' }) {
  const pos = player.position_slot as string
  const colorGrad = POSITION_COLORS[pos] || 'from-gray-500 to-gray-700'
  const badgeColor = POSITION_BADGE_COLORS[pos] || 'bg-gray-500 text-white'
  const rating = player.rating
  const isSmall = size === 'sm'
  const hasPhoto = !!player.players.photo_url

  return (
    <div className={`flex flex-col items-center gap-1 ${isSmall ? 'w-14' : 'w-[68px]'}`}>
      {/* Foto / avatar */}
      <div className={`relative ${isSmall ? 'w-11 h-11' : 'w-14 h-14'}`}>
        {/* Ring de rating — só aparece quando tem nota */}
        {rating != null && (
          <div className={`absolute inset-0 rounded-full ${getRatingBg(rating)} pointer-events-none`} />
        )}

        <div className={`
          w-full h-full rounded-full overflow-hidden border-2
          ${hasPhoto ? 'bg-gray-800' : `bg-gradient-to-b ${colorGrad}`}
          flex items-center justify-center
          border-gray-900
        `}>
          {hasPhoto ? (
            <Image
              src={player.players.photo_url!}
              alt={player.players.name}
              width={isSmall ? 44 : 56}
              height={isSmall ? 44 : 56}
              className="w-full h-full object-cover object-top"
              unoptimized
            />
          ) : (
            <span className={isSmall ? 'text-base' : 'text-xl'}>👤</span>
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
        ${isSmall ? 'text-xs' : 'text-sm'}
      `}>
        {shortName(player.players.name)}
      </span>

      {/* Nota */}
      <span className={`
        font-mono font-bold leading-none
        ${isSmall ? 'text-[10px]' : 'text-xs'}
        ${getRatingColor(rating)}
      `}>
        {rating != null ? rating.toFixed(1) : '—'}
      </span>
    </div>
  )
}

// Posicionamento absoluto por linha (% do topo do campo)
// Reflete a imagem de referência: ATK no topo, GK na base
// Deslocados para baixo para não sobrepor o cabeçalho escuro
const ROW_TOP: Record<string, string> = {
  ATK: '14%',
  MEI: '42%',
  LAT: '65%',
  ZAG: '73%',
  GK:  '88%',
}

export function PitchView({ team, memberTeamName }: PitchViewProps) {
  const starters = team.filter(t => t.slot === 'starter')
  const bench = team.filter(t => t.slot === 'bench')

  const byPos = (pos: string) => starters.filter(p => p.position_slot === pos)
  const gks  = byPos('GK')
  const zags = byPos('ZAG')
  const lats = byPos('LAT')
  const meis = byPos('MEI')
  const atks = byPos('ATK')

  const totalRating = starters
    .filter(p => p.rating != null)
    .reduce((sum, p) => sum + (p.rating ?? 0), 0)
  const hasRatings = starters.some(p => p.rating != null)

  // Renderiza uma linha de jogadores com posicionamento absoluto
  // players: array de jogadores
  // top: posição vertical
  // spread: quanto espaço lateral cada posição ocupa
  function FieldRow({
    players,
    top,
    spread = 'center',
  }: {
    players: PitchPlayer[]
    top: string
    spread?: 'center' | 'wide' | 'full' | 'tight' | 'tight-lat'
  }) {
    if (players.length === 0) return null

    // Calcula posição horizontal de cada jogador
    const getLeftPositions = () => {
      const n = players.length
      if (n === 1) return ['50%']
      if (spread === 'full') {
        // Distribuição máxima — ocupa quase toda a largura
        const margin = 10
        return players.map((_, i) => `${margin + (i * (100 - margin * 2)) / (n - 1)}%`)
      }
      if (spread === 'wide') {
        // Bem espaçados mas não nas bordas extremas
        const margin = 18
        return players.map((_, i) => `${margin + (i * (100 - margin * 2)) / (n - 1)}%`)
      }
      if (spread === 'tight') {
        // Muito juntos, próximos do centro
        const margin = 38
        return players.map((_, i) => `${margin + (i * (100 - margin * 2)) / (n - 1)}%`)
      }
      if (spread === 'tight-lat') {
        // Laterais: recuados e centralizados suavemente (bem pouco)
        const margin = 16
        return players.map((_, i) => `${margin + (i * (100 - margin * 2)) / (n - 1)}%`)
      }
      // center: distribuição central moderada
      const margin = 25
      return players.map((_, i) => `${margin + (i * (100 - margin * 2)) / (n - 1)}%`)
    }

    const positions = getLeftPositions()

    return (
      <>
        {players.map((p, i) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: positions[i], top }}
          >
            <PlayerToken player={p} />
          </div>
        ))}
      </>
    )
  }

  return (
    <div className="space-y-4 h-full">
      {/* Card do campinho + banco em layout horizontal */}
      <div className="flex gap-4 h-full">
        {/* BANCO DE RESERVAS À ESQUERDA */}
        {bench.length > 0 && (
          <div className="bg-gray-900/80 rounded-xl border border-white/10 p-4 flex flex-col items-center justify-start w-32 h-full">
            <h3 className="text-gray-400 text-[9px] font-bold uppercase tracking-widest mb-4 text-center leading-tight">
              🪑 Banco
            </h3>
            <div className="flex flex-col gap-3 items-center w-full flex-1">
              {[...bench]
                .sort((a, b) => {
                  const order = ['GK', 'ZAG', 'LAT', 'MEI', 'ATK']
                  return order.indexOf(a.position_slot) - order.indexOf(b.position_slot)
                })
                .map(p => (
                  <div key={p.id} className="w-full flex justify-center">
                    <PlayerToken player={p} size="sm" />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Campinho principal */}
        <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0d1a0f] flex flex-col h-full">

          {/* Cabeçalho */}
          <div className="flex justify-between items-center px-6 py-4 bg-black/40 border-b border-white/10">
            <div>
              <h2 className="text-white font-bold text-lg tracking-tight">
                {memberTeamName ? `⚽ ${memberTeamName}` : 'Meu Time'}
              </h2>
              {!memberTeamName && (
                <p className="text-xs text-gray-400 mt-1">Aguardando draft...</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasRatings && (
                <div className="flex items-center gap-1 bg-yellow-500/20 rounded-full px-2.5 py-1 border border-yellow-500/30">
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
          <div className="flex-1 flex flex-col w-full">
            {team.length === 0 ? (
              <div className="flex-1 py-20 text-center text-gray-500 flex flex-col items-center justify-center">
                <p className="text-4xl mb-3">⚽</p>
                <p>Seu time ainda não foi definido. Aguarde o draft!</p>
              </div>
            ) : (
              <div className="relative w-full flex-1 select-none">
                {/* Grama + linhas */}
                <FieldBackground />

                {/* Jogadores com posicionamento absoluto */}
                <div className="absolute inset-0 z-10">
                  {/* ATK: 3 atacantes — bem distribuídos */}
                  <FieldRow players={atks} top={ROW_TOP.ATK} spread="wide" />

                  {/* MEI: 3 meias — distribuídos */}
                  <FieldRow players={meis} top={ROW_TOP.MEI} spread="center" />

                  {/* LAT: 2 laterais — nas extremidades */}
                  <FieldRow players={lats} top={ROW_TOP.LAT} spread="tight-lat" />

                  {/* ZAG: 2 zagueiros — centrais, mais juntos */}
                  <FieldRow players={zags} top={ROW_TOP.ZAG} spread="tight" />

                  {/* GK: goleiro — centralizado */}
                  <FieldRow players={gks} top={ROW_TOP.GK} spread="center" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
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
        backgroundImage: 'repeating-linear-gradient(180deg, transparent, transparent 55px, rgba(0,0,0,0.07) 55px, rgba(0,0,0,0.07) 110px)',
      }} />

      {/* SVG com linhas do campo */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 380"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.2"
      >
        {/* Borda do campo */}
        <rect x="16" y="10" width="368" height="360" rx="2" />

        {/* Linha do meio */}
        <line x1="16" y1="190" x2="384" y2="190" />

        {/* Círculo central */}
        <circle cx="200" cy="190" r="48" />
        <circle cx="200" cy="190" r="2" fill="rgba(255,255,255,0.3)" stroke="none" />

        {/* Área (ataque - topo) */}
        <rect x="96" y="10" width="208" height="64" />
        <rect x="148" y="10" width="104" height="24" />

        {/* Área (defesa - baixo) */}
        <rect x="96" y="306" width="208" height="64" />
        <rect x="148" y="346" width="104" height="24" />

        {/* Pontos de pênalti */}
        <circle cx="200" cy="58" r="2" fill="rgba(255,255,255,0.3)" stroke="none" />
        <circle cx="200" cy="322" r="2" fill="rgba(255,255,255,0.3)" stroke="none" />

        {/* Arcos de área */}
        <path d="M 144 74 A 56 56 0 0 1 256 74" />
        <path d="M 144 306 A 56 56 0 0 0 256 306" />

        {/* Cantos */}
        <path d="M16 18 Q16 10 24 10" />
        <path d="M376 10 Q384 10 384 18" />
        <path d="M384 362 Q384 370 376 370" />
        <path d="M24 370 Q16 370 16 362" />
      </svg>

      {/* Sombra nas bordas */}
      <div className="absolute inset-0"
           style={{ boxShadow: 'inset 0 0 50px rgba(0,0,0,0.35)' }} />
    </div>
  )
}
