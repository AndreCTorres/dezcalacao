'use client'

// app/app/notas/round-games.tsx
// Lista de jogos da rodada em formato acordeão (clica no jogo para abrir as notas).
// Dentro de cada jogo, os jogadores ficam separados por seleção.

import { useState } from 'react'

export type RatedPlayer = {
  player_id: number
  name: string
  team_name: string
  position: string
  rating: number
  minutes: number
}

export type GameBlock = {
  id: number | string
  title: string
  score: string | null
  homeTeam: string | null
  awayTeam: string | null
  homeGoals: number | null
  awayGoals: number | null
  teams: Array<{ team_name: string; players: RatedPlayer[] }>
  total: number
}

function ratingBadge(r: number): string {
  if (r >= 8) return 'bg-yellow-400 text-gray-900'
  if (r >= 7) return 'bg-lime-400 text-gray-900'
  if (r >= 6) return 'bg-white/15 text-white'
  if (r >= 5) return 'bg-orange-500/80 text-white'
  return 'bg-red-600/80 text-white'
}

function PlayerRow({ p }: { p: RatedPlayer }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2">
      <span className="text-[10px] font-black text-gray-500 w-9 shrink-0">{p.position}</span>
      <span className="flex-1 min-w-0 text-white text-sm font-medium truncate">{p.name}</span>
      <span className="text-gray-500 text-xs shrink-0">{p.minutes}&apos;</span>
      <span className={`font-mono font-black text-sm px-2 py-0.5 rounded-md shrink-0 ${ratingBadge(p.rating)}`}>
        {p.rating.toFixed(1)}
      </span>
    </li>
  )
}

export function RoundGames({ games }: { games: GameBlock[] }) {
  const [openId, setOpenId] = useState<number | string | null>(null)

  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-gray-400 text-sm">
        Nenhum jogo com notas nesta rodada ainda.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {games.map((g) => {
        const isOpen = openId === g.id
        return (
          <div key={g.id} className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            {/* Cabeçalho clicável */}
            <button
              onClick={() => setOpenId(isOpen ? null : g.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.07] transition text-left"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className={`text-gray-400 text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                <span className="text-white font-bold text-sm truncate">{g.title}</span>
              </span>
              <span className="flex items-center gap-3 shrink-0">
                {g.score && (
                  <span className="font-mono font-black text-lime-400 text-sm">{g.score}</span>
                )}
                <span className="text-gray-500 text-xs">{g.total} notas</span>
              </span>
            </button>

            {/* Conteúdo */}
            {isOpen && (
              <div>
                {g.homeTeam && g.awayTeam && (
                  <div className="px-4 py-3 border-t border-white/10 bg-lime-400/[0.06]">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="min-w-0 text-right">
                        <p className="truncate text-xs font-black uppercase tracking-wide text-lime-300">{g.homeTeam}</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-lime-400/25 bg-black/25 px-3 py-1.5">
                        <span className="min-w-6 text-center font-mono text-xl font-black text-white">
                          {g.homeGoals ?? '-'}
                        </span>
                        <span className="text-xs font-black text-gray-500">x</span>
                        <span className="min-w-6 text-center font-mono text-xl font-black text-white">
                          {g.awayGoals ?? '-'}
                        </span>
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="truncate text-xs font-black uppercase tracking-wide text-lime-300">{g.awayTeam}</p>
                      </div>
                    </div>
                    {!g.score && (
                      <p className="mt-2 text-center text-[11px] font-medium text-gray-500">
                        Placar ainda nao informado
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                  {g.teams.map((t) => (
                    <div key={t.team_name}>
                      <div className="px-4 py-1.5 bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-lime-300/80">
                        {t.team_name}
                      </div>
                      <ul className="divide-y divide-white/5">
                        {t.players.map((p) => (
                          <PlayerRow key={p.player_id} p={p} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
