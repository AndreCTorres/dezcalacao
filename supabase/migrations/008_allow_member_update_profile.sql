-- supabase/migrations/008_allow_member_update_profile.sql
-- Permite que cada membro atualize seu próprio display_name e team_name

-- Adicionar policy que permite o próprio membro (ou admin) atualizar seu display_name e team_name
CREATE POLICY "Membro pode atualizar seu próprio display_name e team_name"
  ON group_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);
