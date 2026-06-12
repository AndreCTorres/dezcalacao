-- supabase/migrations/007_add_team_name.sql
-- Adicionar campo team_name em group_members para permitir que cada membro nomeie seu time

ALTER TABLE group_members
ADD COLUMN team_name text;

-- Criar índice para melhor performance (se necessário)
CREATE INDEX IF NOT EXISTS idx_group_members_team_name ON group_members(team_name);
