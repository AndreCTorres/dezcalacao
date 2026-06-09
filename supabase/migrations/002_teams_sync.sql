-- Dezcalação — Teams & Sync Migration
-- Versão: 2.0
-- Data: Junho 2026
-- Descrição: Adiciona tabela teams e ajusta players para sincronização com API-Football

-- ============================================================================
-- TEAMS (Cache dos IDs de Seleções)
-- ============================================================================

create table teams (
  id bigint primary key, -- team_id da API-Football
  name text not null, -- nome da seleção (ex.: "Brazil", "Korea Republic")
  country text not null unique, -- país (ex.: "Brazil", "South Korea")
  api_name text not null, -- nome exato da API
  national boolean not null default true,
  season text not null default '2026',
  synced_at timestamptz default now()
);

comment on table teams is 'Cache dos IDs das seleções da API-Football para evitar resolver em cada sync';
comment on column teams.country is 'País em nossa nomenclatura (consistente)';
comment on column teams.api_name is 'Nome exato retornado pela API (pode diferir de `name`)';

create index idx_teams_country on teams(country, season);
create index idx_teams_season on teams(season);

-- ============================================================================
-- PLAYERS - Adicionar Colunas de Sync
-- ============================================================================

-- Adicionar colunas se não existirem
alter table players add column if not exists api_player_id bigint unique;
alter table players add column if not exists age int;
alter table players add column if not exists number int;
alter table players add column if not exists api_position text; -- Goalkeeper/Defender/Midfielder/Attacker
alter table players add column if not exists season text not null default '2026';
alter table players add column if not exists synced_at timestamptz default now();

comment on column players.api_player_id is 'ID único do jogador na API-Football (chave para upsert)';
comment on column players.api_position is 'Posição crua da API (Goalkeeper/Defender/Midfielder/Attacker)';
comment on column players.season is 'Temporada (ex: 2026)';

-- Criar índice para buscas rápidas
create index if not exists idx_players_team_id on players(team_id);
create index if not exists idx_players_api_player_id on players(api_player_id);
create index if not exists idx_players_season on players(season);

-- ============================================================================
-- Observação Importante
-- ============================================================================

-- NOTA: A primary key de `players` continua sendo `id` (bigint).
-- Quando sincronizar, fazer UPSERT baseado em `api_player_id` para evitar duplicatas.
-- Exemplo:
--   INSERT INTO players (..., api_player_id, ...)
--   VALUES (...)
--   ON CONFLICT (api_player_id) DO UPDATE SET ...

-- Esta abordagem permite:
-- 1. Manter histórico (id sequencial)
-- 2. Evitar duplicatas (api_player_id único)
-- 3. Flexibilidade para futuras mudanças
