// lib/apiFootball.ts
// Cliente da API-Football. USAR SOMENTE NO SERVIDOR (API routes / Server Actions).
// Chave em process.env.API_FOOTBALL_KEY.
//
// Doc: https://www.api-football.com/documentation-v3
// Copa do Mundo: league=1, season=2026

const BASE = "https://v3.football.api-sports.io";

export const WORLD_CUP_LEAGUE_ID = 1;
export const SEASON = 2026;

// Número de times que jogam em cada rodada da Copa 2026
// Fase de grupos: 48 times, 3 rodadas de 16 jogos cada
// Playoffs: 32, 16, 8, 4, 2 times
export const ROUND_FIXTURE_COUNTS: Record<string, number> = {
  'Fase de Grupos - Rodada 1': 16,
  'Fase de Grupos - Rodada 2': 16,
  'Fase de Grupos - Rodada 3': 16,
  '16 Avos de Final': 16,
  'Oitavas de Final': 8,
  'Quartas de Final': 4,
  'Semifinal': 2,
  'Final': 1,
}

// Status de jogo considerados "encerrados"
export const FINISHED_STATUSES = new Set([
  'FT',   // Full Time
  'AET',  // After Extra Time
  'PEN',  // After Penalties
  'AWD',  // Awarded (W.O.)
  'ABD',  // Abandoned (conta como encerrado para efeito de notas)
])

async function apiGet(path: string, params: Record<string, string | number>) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("Falta API_FOOTBALL_KEY no ambiente");

  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": key },
    cache: 'no-store', // sempre fresco — usamos throttle manual
  });

  if (res.status === 429) {
    const retry = res.headers.get('Retry-After') || '60'
    throw new Error(`Rate limit atingido. Aguarde ${retry}s.`)
  }

  if (!res.ok) throw new Error(`API-Football ${res.status}: ${res.statusText}`);
  const json = await res.json();
  return json.response;
}

// Convocados de uma seleção
export async function getSquad(teamId: number) {
  return apiGet("/players/squads", { team: teamId });
}

// Todos os jogos da Copa 2026 (1 requisição — salvar resultado)
export async function getFixtures() {
  return apiGet("/fixtures", { league: WORLD_CUP_LEAGUE_ID, season: SEASON });
}

// Busca fixtures e loga a resposta raw para diagnóstico
export async function getFixturesRaw() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("Falta API_FOOTBALL_KEY no ambiente");

  const url = new URL(`${BASE}/fixtures`);
  url.searchParams.set('league', String(WORLD_CUP_LEAGUE_ID));
  url.searchParams.set('season', String(SEASON));

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": key },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`API-Football ${res.status}: ${res.statusText}`);
  return res.json(); // retorna o JSON completo com results, errors, paging etc
}

// Jogos de uma rodada específica (por round name da API)
export async function getFixturesByRound(roundName: string) {
  return apiGet("/fixtures", {
    league: WORLD_CUP_LEAGUE_ID,
    season: SEASON,
    round: roundName,
  });
}

// Status atual de fixtures específicos (para verificar se acabaram)
export async function getFixturesStatus(fixtureIds: number[]) {
  if (fixtureIds.length === 0) return []
  // API aceita múltiplos IDs separados por hífen
  return apiGet("/fixtures", { ids: fixtureIds.join('-') });
}

// Estatísticas dos jogadores de um jogo (rating)
export async function getPlayerStats(fixtureId: number) {
  return apiGet("/fixtures/players", { fixture: fixtureId });
}

// Mapeia posição da API para as nossas
export function mapPosition(apiPos: string): "GK" | "ZAG" | "LAT" | "MEI" | "ATK" {
  switch ((apiPos || "").toLowerCase()) {
    case "goalkeeper": return "GK";
    case "defender":   return "ZAG";
    case "midfielder": return "MEI";
    case "attacker":   return "ATK";
    default:           return "MEI";
  }
}

// Verifica se um fixture está encerrado pelo status code da API
export function isFixtureFinished(statusShort: string): boolean {
  return FINISHED_STATUSES.has(statusShort)
}

// Mapeia o nome de rodada do nosso sistema para o formato da API-Football
// A API usa: "World Cup - 2026 - Group Stage - Matchday 1", "Round of 32", etc.
// (ajustar quando tivermos os valores reais da API)
export function toApiRoundName(ourRoundName: string): string | null {
  const map: Record<string, string> = {
    'Fase de Grupos - Rodada 1': 'Group Stage - Matchday 1',
    'Fase de Grupos - Rodada 2': 'Group Stage - Matchday 2',
    'Fase de Grupos - Rodada 3': 'Group Stage - Matchday 3',
    '16 Avos de Final':          'Round of 32',
    'Oitavas de Final':          'Round of 16',
    'Quartas de Final':          'Quarter-finals',
    'Semifinal':                 'Semi-finals',
    'Final':                     'Final',
  }
  return map[ourRoundName] ?? null
}
