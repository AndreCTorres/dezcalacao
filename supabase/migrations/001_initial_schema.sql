-- Dezcalação — Initial Schema
-- Versão: 1.0
-- Data: Junho 2026
-- Descrição: Schema inicial com todas as tabelas principais

-- ============================================================================
-- PROFILES (Usuários)
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default now()
);

comment on table profiles is 'Espelho de auth.users - dados de perfil dos usuários';
comment on column profiles.display_name is 'Nome de exibição do usuário';

-- ============================================================================
-- GROUPS (Bolões)
-- ============================================================================

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  admin_id uuid not null references profiles(id),
  season text not null default 'WC2026',
  status text not null default 'setup', -- setup | drafting | active | finished
  bonus_selecao_rodada boolean not null default false,
  bonus_craque_partida boolean not null default false,
  max_subs_por_rodada int not null default 3,
  min_minutos int not null default 20,
  created_at timestamptz default now()
);

comment on table groups is 'Bolões/grupos de Copa do Mundo';
comment on column groups.status is 'Estados: setup (configurando) | drafting (draft em andamento) | active (torneio ativo) | finished (encerrado)';
comment on column groups.max_subs_por_rodada is 'Limite de substituições por rodada (padrão: 3)';
comment on column groups.min_minutos is 'Minutos mínimos para um jogador pontuar (padrão: 20)';

-- ============================================================================
-- GROUP_MEMBERS (Membros do Grupo)
-- ============================================================================

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  profile_id uuid references profiles(id),
  display_name text not null,
  invite_email text,
  role text not null default 'player', -- player | admin
  status text not null default 'invited', -- invited | joined
  joined_at timestamptz,
  unique (group_id, profile_id)
);

comment on table group_members is 'Membros de um grupo (pode estar sem account se profile_id = null)';
comment on column group_members.profile_id is 'Nulo se convidado sem conta ainda';
comment on column group_members.status is 'invited = convidado sem conta | joined = aceitou e tem conta';

-- ============================================================================
-- PLAYERS (Jogadores Convocados)
-- ============================================================================

create table players (
  id bigint primary key, -- player_id da API (mantém por compatibilidade)
  name text not null,
  team_id bigint not null,
  team_name text not null,
  position text not null, -- GK | ZAG | LAT | MEI | ATK
  photo_url text
);

comment on table players is 'Jogadores convocados para a Copa (populados via API-Football)';
comment on column players.position is 'Posição mapeada: GK (goleiro), ZAG (zagueiro), LAT (lateral), MEI (meio-campo), ATK (ataque)';

-- ============================================================================
-- TEAM_PLAYERS (Draft)
-- ============================================================================

create table team_players (
  id uuid primary key default gen_random_uuid(),
  group_member_id uuid not null references group_members(id) on delete cascade,
  player_id bigint not null references players(id),
  slot text not null, -- starter | bench
  position_slot text not null, -- GK | ZAG | LAT | MEI | ATK
  created_at timestamptz default now(),
  unique (group_member_id, player_id)
);

comment on table team_players is 'Draft registrado: quem pegou qual jogador';
comment on column team_players.slot is 'starter = titular (11) | bench = reserva (5)';

create index idx_team_players_group_member on team_players(group_member_id);

-- ============================================================================
-- ROUNDS (Rodadas)
-- ============================================================================

create table rounds (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  starts_at timestamptz,
  locked_at timestamptz,
  status text not null default 'open', -- open | locked | scored
  created_at timestamptz default now()
);

comment on table rounds is 'Rodadas/matchdays do torneio';
comment on column rounds.status is 'open = aberta | locked = travada (aguardando resultados) | scored = pontuação calculada';

-- ============================================================================
-- FIXTURES (Jogos)
-- ============================================================================

create table fixtures (
  id bigint primary key, -- fixture_id da API
  round_id uuid references rounds(id) on delete cascade,
  home_team text,
  away_team text,
  kickoff timestamptz,
  status text
);

comment on table fixtures is 'Jogos do torneio (referência para ratings)';

-- ============================================================================
-- PLAYER_ROUND_RATINGS (Notas)
-- ============================================================================

create table player_round_ratings (
  id uuid primary key default gen_random_uuid(),
  player_id bigint not null references players(id),
  round_id uuid not null references rounds(id) on delete cascade,
  fixture_id bigint references fixtures(id),
  rating numeric(4,2), -- ex.: 8.70, null se ainda não saiu
  minutes int default 0,
  source text default 'api-football',
  fetched_at timestamptz default now(),
  unique (player_id, round_id)
);

comment on table player_round_ratings is 'Nota de cada jogador em cada rodada (puxada da API-Football)';
comment on column player_round_ratings.rating is 'Escala ~0-10 (ex: 8.70). NULL se ainda não saiu.';
comment on column player_round_ratings.minutes is 'Minutos em campo (0 = não jogou)';

create index idx_player_round_ratings_round on player_round_ratings(round_id);

-- ============================================================================
-- SUBSTITUTIONS (Trocas)
-- ============================================================================

create table substitutions (
  id uuid primary key default gen_random_uuid(),
  group_member_id uuid not null references group_members(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  out_player_id bigint not null references players(id),
  in_player_id bigint not null references players(id),
  position_slot text not null, -- GK | ZAG | LAT | MEI | ATK
  created_at timestamptz default now()
);

comment on table substitutions is 'Substituições: reserva entra no lugar de titular (mesma posição, por rodada)';

-- ============================================================================
-- ROUND_SCORES (Pontuação)
-- ============================================================================

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

comment on table round_scores is 'Pontuação calculada por participante por rodada';
comment on column round_scores.base_points is 'Pontos da nota dos titulares';
comment on column round_scores.bonus_points is 'Pontos de bônus (XI da rodada + craque)';
comment on column round_scores.total_points is 'base_points + bonus_points';

create index idx_round_scores_round on round_scores(round_id);

-- ============================================================================
-- Trigger: Criar Profile Automaticamente
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1),
      'Usuário'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on function public.handle_new_user() is 'Cria profile automaticamente quando usuário se cadastra';
