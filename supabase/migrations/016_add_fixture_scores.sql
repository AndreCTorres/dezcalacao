-- Migration 016: Adicionar campos ausentes aos fixtures

-- Campos de placar e IDs dos times
alter table fixtures add column if not exists label text;
alter table fixtures add column if not exists home_goals int default null;
alter table fixtures add column if not exists away_goals int default null;
alter table fixtures add column if not exists home_team_id int;
alter table fixtures add column if not exists away_team_id int;

-- Índices para melhor performance
create index if not exists idx_fixtures_round_id 
  on fixtures(round_id);

-- Comentários
comment on column fixtures.label is 'Label amigável para exibição manual';
comment on column fixtures.home_goals is 'Gols do time da casa';
comment on column fixtures.away_goals is 'Gols do time visitante';
comment on column fixtures.home_team_id is 'ID do time da casa (API-Football)';
comment on column fixtures.away_team_id is 'ID do time visitante (API-Football)';
