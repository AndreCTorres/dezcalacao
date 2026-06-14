-- Migration 013: Automação de rodadas
-- Adiciona campos para controle automático de fechamento

-- Campo para data do último jogo da rodada (puxado da API uma vez)
alter table rounds add column if not exists ends_at timestamptz;

-- Campo para controlar fechamento automático
alter table rounds add column if not exists auto_close boolean not null default true;

-- Campo para guardar os fixture_ids associados a essa rodada
-- (array de bigint — guardamos quais jogos pertencem a essa rodada)
alter table rounds add column if not exists fixture_ids bigint[] default '{}';

-- Campo para saber quantos jogos já terminaram
alter table rounds add column if not exists fixtures_done int not null default 0;
alter table rounds add column if not exists fixtures_total int not null default 0;

-- Índice para busca de rodadas que precisam de fechamento automático
create index if not exists idx_rounds_auto_close 
  on rounds(status, auto_close, ends_at) 
  where status = 'open' and auto_close = true;

comment on column rounds.ends_at is 'Data/hora do último jogo desta rodada (da API-Football)';
comment on column rounds.auto_close is 'Se true, a rodada fecha automaticamente quando todos os jogos terminarem';
comment on column rounds.fixture_ids is 'IDs dos fixtures da API-Football vinculados a esta rodada';
comment on column rounds.fixtures_done is 'Quantos fixtures já foram finalizados';
comment on column rounds.fixtures_total is 'Total de fixtures nesta rodada';
