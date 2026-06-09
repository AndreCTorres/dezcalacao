-- Migration: Adicionar tabela teams e ajustar players para sync
-- Rode no SQL Editor do Supabase após rodar o schema.sql inicial

-- Tabela teams: cache dos IDs das seleções da API-Football
create table if not exists teams (
  id bigint primary key,             -- team_id da API-Football
  name text not null,                -- nome da seleção (ex.: "Brazil", "Korea Republic")
  country text not null,             -- país (ex.: "Brazil", "South Korea")
  api_name text not null,            -- nome exato retornado pela API
  national boolean not null default true,
  season text not null default '2026',
  synced_at timestamptz default now(),
  unique (name, season)
);

-- Ajustar tabela players para incluir dados de sync
-- IMPORTANTE: Alterar a primary key de `id` para `api_player_id`
alter table players drop constraint if exists players_pkey;
alter table players add column if not exists api_player_id bigint;
alter table players add column if not exists age int;
alter table players add column if not exists number int;
alter table players add column if not exists api_position text; -- Goalkeeper/Defender/Midfielder/Attacker
alter table players add column if not exists season text not null default '2026';
alter table players add column if not exists synced_at timestamptz default now();

-- Criar nova primary key em api_player_id
alter table players add primary key (api_player_id);

-- Recriar a foreign key em team_players para usar api_player_id
alter table team_players drop constraint if exists team_players_player_id_fkey;
alter table team_players add constraint team_players_player_id_fkey 
  foreign key (player_id) references players(api_player_id);

-- Índices para busca rápida
create index if not exists idx_players_team_id on players(team_id);
create index if not exists idx_players_season on players(season);

-- Comentários
comment on table teams is 'Cache dos IDs das seleções da API-Football para evitar resolver em cada sync';
comment on column players.api_player_id is 'ID do jogador na API-Football (chave primária para upsert)';
comment on column players.api_position is 'Posição crua da API (Goalkeeper/Defender/Midfielder/Attacker)';
comment on column players.position is 'Posição mapeada do sistema (GK/ZAG/LAT/MEI/ATK)';
