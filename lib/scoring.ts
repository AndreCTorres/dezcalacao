// lib/scoring.ts
// Motor de pontuacao. Funcoes puras, faceis de testar.
// Regra: a pontuacao e a NOTA do jogador no jogo. Minutos nao filtram pontos.

export type Position = 'GK' | 'ZAG' | 'LAT' | 'MEI' | 'ATK'

export interface PlayerRating {
  playerId: number
  teamId: number
  position: Position
  rating: number | null
  minutes: number
}

export interface LineupSlot {
  playerId: number
  position: Position
  slot: 'starter' | 'bench'
}

export interface ScoringConfig {
  minMinutes: number
  neutralRating: number
  bonusSelecaoRodada: boolean
  bonusCraquePartida: boolean
  pointsSelecaoRodada: number
  pointsCraquePartida: number
}

export const DEFAULT_CONFIG: ScoringConfig = {
  minMinutes: 20,
  neutralRating: 6.0,
  bonusSelecaoRodada: false,
  bonusCraquePartida: false,
  pointsSelecaoRodada: 1.0,
  pointsCraquePartida: 1.0,
}

export function effectiveRating(r: PlayerRating, cfg: ScoringConfig): number {
  if (r.rating == null) return cfg.neutralRating
  return r.rating
}

export function basePoints(
  lineup: LineupSlot[],
  ratings: Map<number, PlayerRating>,
  cfg: ScoringConfig
): number {
  const starters = lineup.filter((slot) => slot.slot === 'starter')
  let total = 0

  for (const slot of starters) {
    const rating = ratings.get(slot.playerId)
    if (!rating) continue
    total += effectiveRating(rating, cfg)
  }

  return round2(total)
}

export function selecaoDaRodada(all: PlayerRating[]): Set<number> {
  const want: Record<Position, number> = { GK: 1, ZAG: 2, LAT: 2, MEI: 3, ATK: 3 }
  const chosen = new Set<number>()

  ;(Object.keys(want) as Position[]).forEach((position) => {
    const pool = all
      .filter((player) => player.position === position && player.rating != null)
      .sort((a, b) => b.rating! - a.rating!)

    pool.slice(0, want[position]).forEach((player) => chosen.add(player.playerId))
  })

  return chosen
}

export function craquesDaRodada(byFixture: Map<number, PlayerRating[]>): Set<number> {
  const chosen = new Set<number>()

  byFixture.forEach((players) => {
    const top = players
      .filter((player) => player.rating != null)
      .sort((a, b) => b.rating! - a.rating!)[0]

    if (top) chosen.add(top.playerId)
  })

  return chosen
}

export function bonusPoints(
  lineup: LineupSlot[],
  selecao: Set<number>,
  craques: Set<number>,
  cfg: ScoringConfig
): number {
  let bonus = 0

  for (const slot of lineup) {
    if (slot.slot !== 'starter') continue
    if (cfg.bonusSelecaoRodada && selecao.has(slot.playerId)) bonus += cfg.pointsSelecaoRodada
    if (cfg.bonusCraquePartida && craques.has(slot.playerId)) bonus += cfg.pointsCraquePartida
  }

  return round2(bonus)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export const TOTR_LINES = {
  GK: { positions: ['GK'] as Position[], count: 1 },
  DEF: { positions: ['ZAG', 'LAT'] as Position[], count: 4 },
  MEI: { positions: ['MEI'] as Position[], count: 3 },
  ATK: { positions: ['ATK'] as Position[], count: 3 },
}

export type TotrLine = 'GK' | 'DEF' | 'MEI' | 'ATK'

export const TOTR_FORMATION: Record<Position, number> = {
  GK: 1,
  ZAG: 2,
  LAT: 2,
  MEI: 3,
  ATK: 3,
}

export interface RatedForTotr {
  position: Position
  rating: number | null
  minutes: number
}

export interface TeamOfTheRound<T extends RatedForTotr> {
  lines: Record<TotrLine, T[]>
  starters: T[]
  best: T | null
}

export function pickTeamOfRound<T extends RatedForTotr>(players: T[]): TeamOfTheRound<T> {
  const eligible = players.filter((player) => player.rating != null)
  const sortByRating = (a: T, b: T) => b.rating! - a.rating!
  const lines = {} as Record<TotrLine, T[]>
  const starters: T[] = []

  ;(Object.keys(TOTR_LINES) as TotrLine[]).forEach((line) => {
    const { positions, count } = TOTR_LINES[line]
    const pool = eligible
      .filter((player) => positions.includes(player.position))
      .sort(sortByRating)
      .slice(0, count)

    lines[line] = pool
    starters.push(...pool)
  })

  const best = eligible.slice().sort(sortByRating)[0] ?? null

  return { lines, starters, best }
}
