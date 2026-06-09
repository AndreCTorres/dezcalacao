-- Dezcalação — Row Level Security (RLS) Policies
-- Rode este script no SQL Editor do Supabase após criar o schema.
-- Garante que cada usuário só acessa os dados dos grupos em que participa.

-- 1. Ativar RLS nas tabelas principais
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLICIES PARA PROFILES
-- ========================================

-- Qualquer usuário autenticado pode ler todos os profiles (para ver nomes)
CREATE POLICY "Profiles são públicos para usuários autenticados"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Usuário pode atualizar apenas seu próprio profile
CREATE POLICY "Usuários podem atualizar seu próprio profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ========================================
-- POLICIES PARA GROUPS
-- ========================================

-- Usuário só lê grupos em que é membro
CREATE POLICY "Usuário lê grupos em que é membro"
  ON groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.profile_id = auth.uid()
    )
  );

-- Qualquer usuário autenticado pode criar um grupo (como admin)
CREATE POLICY "Usuário autenticado pode criar grupo"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_id);

-- Apenas o admin do grupo pode atualizar o grupo
CREATE POLICY "Admin pode atualizar seu grupo"
  ON groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = admin_id);

-- Apenas o admin pode deletar o grupo
CREATE POLICY "Admin pode deletar seu grupo"
  ON groups FOR DELETE
  TO authenticated
  USING (auth.uid() = admin_id);

-- ========================================
-- POLICIES PARA GROUP_MEMBERS
-- ========================================

-- Usuário lê membros dos grupos em que participa
CREATE POLICY "Usuário lê membros dos grupos que participa"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.profile_id = auth.uid()
    )
  );

-- Apenas admin do grupo pode inserir novos membros
CREATE POLICY "Admin pode adicionar membros ao grupo"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
        AND groups.admin_id = auth.uid()
    )
  );

-- Admin pode atualizar membros (ex: mudar status de invited para joined)
CREATE POLICY "Admin pode atualizar membros"
  ON group_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
        AND groups.admin_id = auth.uid()
    )
  );

-- Admin pode remover membros
CREATE POLICY "Admin pode remover membros"
  ON group_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
        AND groups.admin_id = auth.uid()
    )
  );

-- ========================================
-- POLICIES PARA TEAM_PLAYERS
-- ========================================

-- Usuário lê team_players dos grupos que participa
CREATE POLICY "Usuário lê times dos grupos que participa"
  ON team_players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE team_players.group_member_id = gm1.id
        AND gm2.profile_id = auth.uid()
    )
  );

-- Apenas admin do grupo pode inserir team_players (draft)
CREATE POLICY "Admin pode atribuir jogadores no draft"
  ON team_players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      JOIN groups ON group_members.group_id = groups.id
      WHERE group_members.id = team_players.group_member_id
        AND groups.admin_id = auth.uid()
    )
  );

-- Admin pode atualizar atribuições de jogadores
CREATE POLICY "Admin pode atualizar atribuições de jogadores"
  ON team_players FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      JOIN groups ON group_members.group_id = groups.id
      WHERE group_members.id = team_players.group_member_id
        AND groups.admin_id = auth.uid()
    )
  );

-- Admin pode remover atribuições de jogadores
CREATE POLICY "Admin pode remover atribuições de jogadores"
  ON team_players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      JOIN groups ON group_members.group_id = groups.id
      WHERE group_members.id = team_players.group_member_id
        AND groups.admin_id = auth.uid()
    )
  );

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Para verificar se as policies foram criadas corretamente:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;
