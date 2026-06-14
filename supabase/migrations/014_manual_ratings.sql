-- Migration 014: Suporte a ratings manuais e fixtures manuais
-- Permite que o admin insira notas de jogadores sem depender da API-Football

-- Adicionar campo label na tabela fixtures para identificação manual
alter table fixtures add column if not exists label text;

-- Garantir que fixture_id em player_round_ratings é nullable (já deve ser, mas confirma)
-- player_round_ratings.fixture_id já é nullable no schema original

-- Índice para busca de ratings por fixture
create index if not exists idx_player_round_ratings_fixture
  on player_round_ratings(fixture_id)
  where fixture_id is not null;

-- Índice para busca de ratings por source (útil para auditoria)
create index if not exists idx_player_round_ratings_source
  on player_round_ratings(source);

comment on column fixtures.label is 'Label amigável para exibição, ex: "México x África do Sul"';
comment on column player_round_ratings.source is 'Origem do dado: api-football | sofascore | manual';
