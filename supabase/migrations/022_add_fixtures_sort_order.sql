-- Migration: Add sort_order column to fixtures for manual drag-and-drop reordering within a round

alter table fixtures add column if not exists sort_order integer default null;

-- Index para ordenação eficiente dentro de uma rodada
create index if not exists idx_fixtures_sort_order on fixtures(round_id, sort_order nulls last, id);

comment on column fixtures.sort_order is 'Ordem manual de exibição do jogo dentro da rodada. NULL = ordenar por id.';
