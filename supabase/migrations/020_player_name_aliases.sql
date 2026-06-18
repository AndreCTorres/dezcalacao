create table if not exists player_name_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  normalized_alias text not null,
  team_name text,
  normalized_team_name text,
  player_id bigint not null references players(id) on delete cascade,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_alias, normalized_team_name)
);

create index if not exists idx_player_name_aliases_lookup
  on player_name_aliases(normalized_alias, normalized_team_name);

create index if not exists idx_player_name_aliases_player
  on player_name_aliases(player_id);

comment on table player_name_aliases is 'Memoria de nomes alternativos de jogadores corrigidos manualmente no importador de notas.';
