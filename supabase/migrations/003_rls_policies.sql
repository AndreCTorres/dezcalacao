-- Dezcalação — Row Level Security (RLS) Policies
-- Versão: 3.0
-- Data: Junho 2026
-- Descrição: Políticas de segurança para acesso baseado em autenticação e grupo

-- ============================================================================
-- ATIVAR RLS
-- ============================================================================

alter table if exists profiles enable row level security;
alter table if exists groups enable row level security;
alter table if exists group_members enable row level security;
alter table if exists team_players enable row level security;
alter table if exists rounds enable row level security;
alter table if exists round_scores enable row level security;
alter table if exists substitutions enable row level security;
alter table if exists player_round_ratings enable row level security;

-- ============================================================================
-- PROFILES
-- ============================================================================

-- Qualquer usuário autenticado pode ler todos os profiles
drop policy if exists "Profiles são públicos para usuários autenticados" on profiles;
create policy "Profiles são públicos para usuários autenticados"
  on profiles for select
  to authenticated
  using (true);

-- Usuário pode atualizar apenas seu próprio profile
drop policy if exists "Usuários podem atualizar seu próprio profile" on profiles;
create policy "Usuários podem atualizar seu próprio profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- ============================================================================
-- GROUPS
-- ============================================================================

-- Usuário só lê grupos em que é membro
drop policy if exists "Usuário lê grupos em que é membro" on groups;
create policy "Usuário lê grupos em que é membro"
  on groups for select
  to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
        and group_members.profile_id = auth.uid()
    )
  );

-- Qualquer usuário autenticado pode criar um grupo (como admin)
drop policy if exists "Usuário autenticado pode criar grupo" on groups;
create policy "Usuário autenticado pode criar grupo"
  on groups for insert
  to authenticated
  with check (auth.uid() = admin_id);

-- Apenas o admin do grupo pode atualizar
drop policy if exists "Admin pode atualizar seu grupo" on groups;
create policy "Admin pode atualizar seu grupo"
  on groups for update
  to authenticated
  using (auth.uid() = admin_id);

-- Apenas o admin pode deletar
drop policy if exists "Admin pode deletar seu grupo" on groups;
create policy "Admin pode deletar seu grupo"
  on groups for delete
  to authenticated
  using (auth.uid() = admin_id);

-- ============================================================================
-- GROUP_MEMBERS
-- ============================================================================

-- Usuário lê membros dos grupos em que participa
drop policy if exists "Usuário lê membros dos grupos que participa" on group_members;
create policy "Usuário lê membros dos grupos que participa"
  on group_members for select
  to authenticated
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
        and gm.profile_id = auth.uid()
    )
  );

-- Apenas admin do grupo pode inserir novos membros
drop policy if exists "Admin pode adicionar membros ao grupo" on group_members;
create policy "Admin pode adicionar membros ao grupo"
  on group_members for insert
  to authenticated
  with check (
    exists (
      select 1 from groups
      where groups.id = group_members.group_id
        and groups.admin_id = auth.uid()
    )
  );

-- Admin pode atualizar membros (ex: status de invited para joined)
drop policy if exists "Admin pode atualizar membros" on group_members;
create policy "Admin pode atualizar membros"
  on group_members for update
  to authenticated
  using (
    exists (
      select 1 from groups
      where groups.id = group_members.group_id
        and groups.admin_id = auth.uid()
    )
  );

-- Admin pode remover membros
drop policy if exists "Admin pode remover membros" on group_members;
create policy "Admin pode remover membros"
  on group_members for delete
  to authenticated
  using (
    exists (
      select 1 from groups
      where groups.id = group_members.group_id
        and groups.admin_id = auth.uid()
    )
  );

-- ============================================================================
-- TEAM_PLAYERS
-- ============================================================================

-- Usuário lê team_players dos grupos que participa
drop policy if exists "Usuário lê times dos grupos que participa" on team_players;
create policy "Usuário lê times dos grupos que participa"
  on team_players for select
  to authenticated
  using (
    exists (
      select 1 from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where team_players.group_member_id = gm1.id
        and gm2.profile_id = auth.uid()
    )
  );

-- Apenas admin do grupo pode inserir (draft)
drop policy if exists "Admin pode atribuir jogadores no draft" on team_players;
create policy "Admin pode atribuir jogadores no draft"
  on team_players for insert
  to authenticated
  with check (
    exists (
      select 1 from group_members
      join groups on group_members.group_id = groups.id
      where group_members.id = team_players.group_member_id
        and groups.admin_id = auth.uid()
    )
  );

-- Admin pode atualizar
drop policy if exists "Admin pode atualizar atribuições de jogadores" on team_players;
create policy "Admin pode atualizar atribuições de jogadores"
  on team_players for update
  to authenticated
  using (
    exists (
      select 1 from group_members
      join groups on group_members.group_id = groups.id
      where group_members.id = team_players.group_member_id
        and groups.admin_id = auth.uid()
    )
  );

-- Admin pode remover
drop policy if exists "Admin pode remover atribuições de jogadores" on team_players;
create policy "Admin pode remover atribuições de jogadores"
  on team_players for delete
  to authenticated
  using (
    exists (
      select 1 from group_members
      join groups on group_members.group_id = groups.id
      where group_members.id = team_players.group_member_id
        and groups.admin_id = auth.uid()
    )
  );

-- ============================================================================
-- ROUNDS (public read)
-- ============================================================================

drop policy if exists "Usuário lê rodadas dos grupos que participa" on rounds;
create policy "Usuário lê rodadas dos grupos que participa"
  on rounds for select
  to authenticated
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = rounds.group_id
        and group_members.profile_id = auth.uid()
    )
  );

-- ============================================================================
-- ROUND_SCORES (public read)
-- ============================================================================

drop policy if exists "Usuário lê scores dos grupos que participa" on round_scores;
create policy "Usuário lê scores dos grupos que participa"
  on round_scores for select
  to authenticated
  using (
    exists (
      select 1 from group_members
      join rounds on rounds.id = round_scores.round_id
      where rounds.group_id = group_members.group_id
        and group_members.profile_id = auth.uid()
    )
  );

-- ============================================================================
-- SUBSTITUTIONS (próprias + grupo)
-- ============================================================================

drop policy if exists "Usuário lê substituições dos grupos que participa" on substitutions;
create policy "Usuário lê substituições dos grupos que participa"
  on substitutions for select
  to authenticated
  using (
    exists (
      select 1 from group_members
      join group_members gm2 on gm2.group_id = group_members.group_id
      where substitutions.group_member_id = gm2.id
        and group_members.profile_id = auth.uid()
    )
  );

-- Membro pode criar substituição para si mesmo
drop policy if exists "Membro pode fazer substituição" on substitutions;
create policy "Membro pode fazer substituição"
  on substitutions for insert
  to authenticated
  with check (
    exists (
      select 1 from group_members
      where group_members.id = substitutions.group_member_id
        and group_members.profile_id = auth.uid()
    )
  );

-- ============================================================================
-- PLAYER_ROUND_RATINGS (public read)
-- ============================================================================

drop policy if exists "Usuário lê ratings dos grupos que participa" on player_round_ratings;
create policy "Usuário lê ratings dos grupos que participa"
  on player_round_ratings for select
  to authenticated
  using (
    exists (
      select 1 from rounds
      join group_members on group_members.group_id = rounds.group_id
      where player_round_ratings.round_id = rounds.id
        and group_members.profile_id = auth.uid()
    )
  );
