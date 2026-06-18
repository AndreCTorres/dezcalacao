-- Dezcalação — schema do banco (Supabase / Postgres)
-- Rode no SQL editor do Supabase. Ajuste policies de RLS conforme necessário.

-- Usuários (espelha auth.users do Supabase)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default now()
);

-- Grupos / bolões
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  admin_id uuid not null references profiles(id),
  season text not null default 'WC2026',
  -- setup -> drafting -> active -> finished
  status text not null default 'setup',
  -- regras configuráveis por grupo
  bonus_selecao_rodada boolean not null default false,
  bonus_craque_partida boolean not null default false,
  max_subs_por_rodada int not null default 3,
  min_minutos int not null default 20,
  created_at timestamptz default now()
);

-- Membros do grupo. profile_id pode ser nulo até a pessoa aceitar o convite.
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  profile_id uuid references profiles(id),
  display_name text not null,        -- rótulo do membro mesmo sem conta ainda
  invite_email text,
  role text not null default 'player', -- 'player' | 'admin'
  status text not null default 'invited', -- 'invited' | 'joined'
  joined_at timestamptz,
  unique (group_id, profile_id)
);

-- Jogadores convocados (populados pela API-Football)
create table players (
  id bigint primary key,             -- player_id da API
  name text not null,
  team_id bigint not null,           -- id da seleção na API
  team_name text not null,           -- nome da seleção
  -- GK | ZAG | LAT | MEI | ATK  (ZAG/LAT vêm de "Defender" e podem precisar de ajuste manual)
  position text not null,
  photo_url text
);

-- Draft registrado: quem pegou quem. Atribuído pelo admin.
create table team_players (
  id uuid primary key default gen_random_uuid(),
  group_member_id uuid not null references group_members(id) on delete cascade,
  player_id bigint not null references players(id),
  slot text not null,                -- 'starter' | 'bench'
  position_slot text not null,       -- GK | ZAG | LAT | MEI | ATK
  created_at timestamptz default now(),
  unique (group_member_id, player_id)
);

-- Regra "um por seleção por membro" → garantir via índice + checagem no app.
-- (Postgres não cruza tabelas em unique direto; validar no app ou via trigger.)

-- Rodadas / matchdays
create table rounds (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,                -- 'Rodada 1', 'Oitavas', etc.
  starts_at timestamptz,
  locked_at timestamptz,             -- quando travou pra substituições
  finalized_at timestamptz,          -- quando o admin marcou como concluída para consulta
  status text not null default 'open', -- 'open' | 'locked' | 'scored'
  created_at timestamptz default now()
);

-- Jogos (referência opcional)
create table fixtures (
  id bigint primary key,             -- fixture_id da API
  round_id uuid references rounds(id) on delete cascade,
  home_team text,
  away_team text,
  kickoff timestamptz,
  status text,
  label text,                        -- Label amigável para exibição manual
  home_goals int,                    -- Gols do time da casa
  away_goals int,                    -- Gols do time visitante
  home_team_id int,                  -- ID do time da casa (API-Football)
  away_team_id int                   -- ID do time visitante (API-Football)
);

-- Notas puxadas da API: nota de cada jogador em cada rodada
create table player_round_ratings (
  id uuid primary key default gen_random_uuid(),
  player_id bigint not null references players(id),
  round_id uuid not null references rounds(id) on delete cascade,
  fixture_id bigint references fixtures(id),
  rating numeric(4,2),               -- ex.: 8.70 ; null se ainda não saiu
  minutes int default 0,
  lineup_role text check (lineup_role is null or lineup_role in ('starter', 'substitute')),
  source text default 'api-football',
  fetched_at timestamptz default now(),
  unique (player_id, round_id)
);

-- Substituições: reserva entra no lugar de titular, mesma posição, por rodada
create table substitutions (
  id uuid primary key default gen_random_uuid(),
  group_member_id uuid not null references group_members(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  out_player_id bigint not null references players(id),
  in_player_id bigint not null references players(id),
  position_slot text not null,
  created_at timestamptz default now()
);

-- Pontuação calculada por participante por rodada
create table round_scores (
  id uuid primary key default gen_random_uuid(),
  group_member_id uuid not null references group_members(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  base_points numeric(7,2) not null default 0,
  bonus_points numeric(7,2) not null default 0,
  total_points numeric(7,2) not null default 0,
  computed_at timestamptz default now(),
  unique (group_member_id, round_id)
);

-- Índices úteis
create index on team_players (group_member_id);
create index on player_round_ratings (round_id);
create index on round_scores (round_id);
