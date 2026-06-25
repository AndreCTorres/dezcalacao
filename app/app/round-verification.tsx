'use client'

// app/app/round-verification.tsx
// Componente para conferÃªncia de ratings por participante
// Mostra 11 titulares, substitutos que entraram, e alertas visuais

import { useState } from 'react'

export type VerificationPlayer = {
  id: string
  player_id: number
  slot: 'starter' | 'bench'
  position_slot: string
  rating?: number | null
  minutes?: number
  players: {
    id: number
    name: string
    team_name: string
    position: string
  }
  status?: 'in_rotation' | 'substituted_out' | 'substituted_in'
}

type RoundVerificationProps = {
  memberName: string
  round: number
  starters: VerificationPlayer[]
  bench: VerificationPlayer[]
  substitutions?: Array<{
    out_player_id: number
    in_player_id: number
  }>
}

function getRatingBadge(rating: number | null | undefined) {
  if (rating == null) {
    return { icon: 'âŒ', color: 'bg-red-500/20 border-red-500/50', text: 'text-red-400' }
  }
  if (rating >= 8) {
    return { icon: 'â­', color: 'bg-yellow-500/20 border-yellow-500/50', text: 'text-yellow-400' }
  }
  if (rating >= 7) {
    return { icon: 'âœ…', color: 'bg-lime-500/20 border-lime-500/50', text: 'text-lime-400' }
  }
  return { icon: 'âœ“', color: 'bg-white/10 border-white/20', text: 'text-white' }
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return fullName
  const last = parts[parts.length - 1]
  if (last.length <= 3 && parts.length >= 2) {
    const secondLast = parts[parts.length - 2]
    if (secondLast.length <= 3) {
      return `${secondLast} ${last}`
    }
    return secondLast
  }
  return last
}

export function RoundVerification({
  memberName,
  round,
  starters,
  bench,
  substitutions = [],
}: RoundVerificationProps) {
  const [expandedSection, setExpandedSection] = useState<'starters' | 'subs' | null>('starters')

  // Mapear jogadores substituÃ­dos
  const substitutedOutIds = new Set(substitutions.map(s => s.out_player_id))
  const substitutedInIds = new Map(substitutions.map(s => [s.in_player_id, s.out_player_id]))

  // Titulares efetivos (considerando substituiÃ§Ãµes)
  const effectiveStarters = starters.map(s => {
    if (substitutedOutIds.has(s.player_id)) {
      return { ...s, status: 'substituted_out' as const }
    }
    return { ...s, status: 'in_rotation' as const }
  })

  // Reservas que entraram
  const substitutesEntered = bench.filter(b => substitutedInIds.has(b.player_id))

  // EstatÃ­sticas
  const startersWithRating = effectiveStarters.filter(
    s => s.status !== 'substituted_out' && s.rating != null
  ).length
  const startersTotal = effectiveStarters.filter(s => s.status !== 'substituted_out').length
  const totalPlayers = startersTotal + substitutesEntered.length
  const allWithRating = starters.filter(s => s.rating != null).length + 
                        substitutesEntered.filter(s => s.rating != null).length

  const hasUnusedSubs = bench.length > substitutesEntered.length
  const missingRatings = allWithRating < totalPlayers

  // Agrupar por posiÃ§Ã£o
  const byPosition = (players: VerificationPlayer[]) => {
    const positions: Record<string, VerificationPlayer[]> = {
      GK: [],
      ZAG: [],
      LAT: [],
      MEI: [],
      ATK: [],
    }
    players.forEach(p => {
      const pos = p.position_slot || 'MEI'
      if (!positions[pos]) positions[pos] = []
      positions[pos].push(p)
    })
    return positions
  }

  const positionOrder = ['GK', 'ZAG', 'LAT', 'MEI', 'ATK']
  const positionLabels: Record<string, string> = {
    GK: 'Goleiro',
    ZAG: 'Zagueiros',
    LAT: 'Laterais',
    MEI: 'Meias',
    ATK: 'Atacantes',
  }

  return (
    <div className="space-y-3 bg-gray-900/50 rounded-lg border border-white/10 p-4">
      {/* CabeÃ§alho com alertas */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-white font-bold text-sm">
            ðŸ” ConferÃªncia â€” Rodada {round} ({memberName})
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {allWithRating}/{totalPlayers} com notas â€¢ {totalPlayers} jogadores efetivos
          </p>
        </div>

        {/* Alertas */}
        <div className="flex flex-col gap-1">
          {missingRatings && (
            <div className="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded-sm text-[11px] text-red-400 font-bold">
              âš ï¸ Faltam notas
            </div>
          )}
          {hasUnusedSubs && (
            <div className="px-2 py-1 bg-orange-500/20 border border-orange-500/50 rounded-sm text-[11px] text-orange-400 font-bold">
              âš ï¸ Subs nÃ£o usadas
            </div>
          )}
        </div>
      </div>

      {/* Indicador de progresso */}
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-lime-500 to-lime-400 transition-all"
          style={{ width: `${(allWithRating / totalPlayers) * 100}%` }}
        />
      </div>

      {/* SeÃ§Ãµes expansÃ­veis */}
      <div className="space-y-2">
        {/* TITULARES */}
        <button
          onClick={() => setExpandedSection(expandedSection === 'starters' ? null : 'starters')}
          className="w-full p-3 bg-gray-800/60 hover:bg-gray-800 rounded-lg border border-white/10 hover:border-white/20 transition flex items-center justify-between group"
        >
          <div className="text-left flex items-center gap-2">
            <span className="text-lg">ðŸ‘¥</span>
            <div>
              <p className="text-white font-semibold text-sm">11 Titulares</p>
              <p className="text-xs text-gray-400">
                {startersWithRating}/{startersTotal} com notas
              </p>
            </div>
          </div>
          <span className="text-white group-hover:translate-x-1 transition">
            {expandedSection === 'starters' ? 'â–¼' : 'â–¶'}
          </span>
        </button>

        {expandedSection === 'starters' && (
          <div className="pl-4 pr-3 pb-3 space-y-2 border-l-2 border-lime-500/30">
            {positionOrder.map(pos => {
              const players = byPosition(effectiveStarters)[pos] || []
              if (players.length === 0) return null

              return (
                <div key={pos}>
                  <p className="text-xs text-gray-500 font-bold uppercase mb-2 tracking-wide">
                    {positionLabels[pos]} ({players.length})
                  </p>
                  <div className="space-y-1.5">
                    {players.map(p => {
                      const badge = getRatingBadge(p.rating)
                      const isSubOut = p.status === 'substituted_out'

                      return (
                        <div
                          key={p.id}
                          className={`
                            flex items-center justify-between p-2 rounded-lg border
                            ${isSubOut
                              ? 'bg-gray-800/40 border-gray-600/50 opacity-60'
                              : `${badge.color} border-current/30`
                            }
                          `}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSubOut ? 'text-gray-500' : 'text-white'}`}>
                              {shortName(p.players.name)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {p.players.team_name} â€¢ {p.position_slot}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 ml-2">
                            {isSubOut && (
                              <span className="text-xs font-bold text-gray-500 bg-gray-700/50 px-2 py-1 rounded">
                                SAIU
                              </span>
                            )}
                            {p.rating != null && (
                              <span className={`font-mono font-bold text-sm ${badge.text}`}>
                                {p.rating.toFixed(1)}
                              </span>
                            )}
                            <span className="text-lg">{badge.icon}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* SUBSTITUTOS QUE ENTRARAM */}
        {substitutesEntered.length > 0 && (
          <>
            <button
              onClick={() => setExpandedSection(expandedSection === 'subs' ? null : 'subs')}
              className="w-full p-3 bg-gray-800/60 hover:bg-gray-800 rounded-lg border border-white/10 hover:border-white/20 transition flex items-center justify-between group"
            >
              <div className="text-left flex items-center gap-2">
                <span className="text-lg">ðŸ”„</span>
                <div>
                  <p className="text-white font-semibold text-sm">SubstituiÃ§Ãµes ({substitutesEntered.length})</p>
                  <p className="text-xs text-gray-400">
                    Reservas que entraram
                  </p>
                </div>
              </div>
              <span className="text-white group-hover:translate-x-1 transition">
                {expandedSection === 'subs' ? 'â–¼' : 'â–¶'}
              </span>
            </button>

            {expandedSection === 'subs' && (
              <div className="pl-4 pr-3 pb-3 space-y-1.5 border-l-2 border-cyan-500/30">
                {substitutesEntered.map(p => {
                  const badge = getRatingBadge(p.rating)
                  const outPlayer = starters.find(
                    s => s.player_id === substitutedInIds.get(p.player_id)
                  )

                  return (
                    <div
                      key={p.id}
                      className={`${badge.color} border border-current/30 rounded-lg p-2`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white mb-0.5">
                            {shortName(p.players.name)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {p.players.team_name} â€¢ {p.position_slot}
                          </p>
                          {outPlayer && (
                            <p className="text-xs text-gray-600 mt-1">
                              entrou no lugar de {shortName(outPlayer.players.name)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {p.rating != null && (
                            <span className={`font-mono font-bold text-sm ${badge.text}`}>
                              {p.rating.toFixed(1)}
                            </span>
                          )}
                          <span className="text-lg">{badge.icon}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ALERTAS DE BANCO NÃƒO USADO */}
        {hasUnusedSubs && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-xs font-bold text-orange-400 mb-2">
              âš ï¸ BANCO NÃƒO TOTALMENTE USADO
            </p>
            <p className="text-xs text-orange-300 mb-2">
              Apenas {substitutesEntered.length} de {bench.length} reservas foram acionadas.
            </p>
            <div className="space-y-1">
              {bench
                .filter(b => !substitutedInIds.has(b.player_id))
                .map(p => (
                  <div key={p.id} className="text-xs text-orange-300">
                    â€¢ {shortName(p.players.name)} ({p.position_slot}) â€” nÃ£o entrou
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* RodapÃ© com resumo */}
      <div className="pt-2 border-t border-white/10 text-xs text-gray-400 space-y-1">
        <p>
          <strong className="text-white">Total:</strong> {totalPlayers} jogadores efetivos
        </p>
        <p>
          <strong className="text-white">Com notas:</strong> {allWithRating}/{totalPlayers} ({((allWithRating / totalPlayers) * 100).toFixed(0)}%)
        </p>
        {missingRatings && (
          <p className="text-red-400">
            <strong>Faltam notas:</strong> {totalPlayers - allWithRating} jogador(es)
          </p>
        )}
      </div>
    </div>
  )
}
