// lib/apiFootball.ts
// Cliente da API-Football. USAR SOMENTE NO SERVIDOR (API routes), nunca no cliente,
// pra não expor a chave. Chave em process.env.API_FOOTBALL_KEY.
//
// Doc: https://www.api-football.com/documentation-v3
// IDs a confirmar na doc: liga da Copa do Mundo e season 2026.

const BASE = "https://v3.football.api-sports.io";

// TODO: confirmar na doc oficial. Copa do Mundo costuma ser league=1.
export const WORLD_CUP_LEAGUE_ID = 1;
export const SEASON = 2026;

async function apiGet(path: string, params: Record<string, string | number>) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("Falta API_FOOTBALL_KEY no ambiente");

  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": key },
    // cache de 1h por padrão — ajustar conforme a janela de jogos
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}`);
  const json = await res.json();
  return json.response;
}

// Convocados de uma seleção -> popular a tabela players
export async function getSquad(teamId: number) {
  return apiGet("/players/squads", { team: teamId });
}

// Jogos da Copa (calendário / rodadas)
export async function getFixtures() {
  return apiGet("/fixtures", { league: WORLD_CUP_LEAGUE_ID, season: SEASON });
}

// Estatísticas dos jogadores de um jogo -> traz o campo `rating`
export async function getPlayerStats(fixtureId: number) {
  return apiGet("/fixtures/players", { fixture: fixtureId });
}

// Mapeia a posição da API (Goalkeeper/Defender/Midfielder/Attacker) pras nossas.
// ATENÇÃO: "Defender" não distingue ZAG de LAT — cair em ZAG por padrão e
// deixar o admin ajustar pra LAT na tela de cadastro.
export function mapPosition(apiPos: string): "GK" | "ZAG" | "LAT" | "MEI" | "ATK" {
  switch ((apiPos || "").toLowerCase()) {
    case "goalkeeper": return "GK";
    case "defender": return "ZAG"; // ajustar manualmente p/ LAT quando for lateral
    case "midfielder": return "MEI";
    case "attacker": return "ATK";
    default: return "MEI";
  }
}
