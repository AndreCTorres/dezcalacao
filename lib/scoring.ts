// lib/scoring.ts
// Motor de pontuação. Funções puras — fáceis de testar.
// Regra: a pontuação é a NOTA do jogador no jogo. Bônus são aditivos e opcionais.

export type Position = "GK" | "ZAG" | "LAT" | "MEI" | "ATK";

export interface PlayerRating {
  playerId: number;
  teamId: number;
  position: Position;
  rating: number | null; // null = nota ainda não saiu
  minutes: number;
}

export interface LineupSlot {
  playerId: number;
  position: Position;
  slot: "starter" | "bench";
}

export interface ScoringConfig {
  minMinutes: number;        // ex.: 20
  neutralRating: number;     // valor usado quando a nota ainda não saiu (ex.: 6.0)
  bonusSelecaoRodada: boolean;
  bonusCraquePartida: boolean;
  pointsSelecaoRodada: number; // ex.: 1.0 por jogador no XI da rodada
  pointsCraquePartida: number; // ex.: 1.0 por craque de jogo
}

export const DEFAULT_CONFIG: ScoringConfig = {
  minMinutes: 20,
  neutralRating: 6.0,
  bonusSelecaoRodada: false,
  bonusCraquePartida: false,
  pointsSelecaoRodada: 1.0,
  pointsCraquePartida: 1.0,
};

// Nota efetiva de um jogador na rodada (aplica minutagem e dado faltando)
export function effectiveRating(r: PlayerRating, cfg: ScoringConfig): number {
  if (r.rating == null) return cfg.neutralRating; // recalcular quando o dado chegar
  if (r.minutes < cfg.minMinutes) return 0;        // jogou pouco -> não pontua
  return r.rating;
}

// Pontuação base de um participante na rodada = soma das notas dos 11 titulares
export function basePoints(
  lineup: LineupSlot[],
  ratings: Map<number, PlayerRating>,
  cfg: ScoringConfig
): number {
  const starters = lineup.filter((s) => s.slot === "starter");
  let total = 0;
  for (const s of starters) {
    const r = ratings.get(s.playerId);
    if (!r) continue; // sem jogo / seleção eliminada = 0
    total += effectiveRating(r, cfg);
  }
  return round2(total);
}

// XI da rodada: maior nota por posição (determinístico — sem briga).
// Retorna o conjunto de playerIds que entraram no time da rodada.
export function selecaoDaRodada(all: PlayerRating[]): Set<number> {
  const want: Record<Position, number> = { GK: 1, ZAG: 2, LAT: 2, MEI: 3, ATK: 3 };
  const chosen = new Set<number>();
  (Object.keys(want) as Position[]).forEach((pos) => {
    const pool = all
      .filter((p) => p.position === pos && p.rating != null && p.minutes >= 20)
      .sort((a, b) => (b.rating! - a.rating!));
    pool.slice(0, want[pos]).forEach((p) => chosen.add(p.playerId));
  });
  return chosen;
}

// Craque de cada jogo: maior nota por fixture. Recebe ratings agrupados por fixture.
export function craquesDaRodada(byFixture: Map<number, PlayerRating[]>): Set<number> {
  const chosen = new Set<number>();
  byFixture.forEach((players) => {
    const top = players
      .filter((p) => p.rating != null)
      .sort((a, b) => (b.rating! - a.rating!))[0];
    if (top) chosen.add(top.playerId);
  });
  return chosen;
}

export function bonusPoints(
  lineup: LineupSlot[],
  selecao: Set<number>,
  craques: Set<number>,
  cfg: ScoringConfig
): number {
  let bonus = 0;
  for (const s of lineup) {
    if (s.slot !== "starter") continue;
    if (cfg.bonusSelecaoRodada && selecao.has(s.playerId)) bonus += cfg.pointsSelecaoRodada;
    if (cfg.bonusCraquePartida && craques.has(s.playerId)) bonus += cfg.pointsCraquePartida;
  }
  return round2(bonus);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
