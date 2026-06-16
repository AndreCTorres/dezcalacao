-- Migration 014: Suporte a ratings manuais e fixtures manuais
-- Permite que o admin insira notas de jogadores sem depender da API-Football

-- Índice para busca de ratings por fixture
create index if not exists idx_player_round_ratings_fixture
  on player_round_ratings(fixture_id)
  where fixture_id is not null;

-- Índice para busca de ratings por source (útil para auditoria)
create index if not exists idx_player_round_ratings_source
  on player_round_ratings(source);

comment on column player_round_ratings.source is 'Origem do dado: api-football | sofascore | manual';

