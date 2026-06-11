-- supabase/migrations/004_add_player_details.sql
-- Adicionar colunas faltantes na tabela players para suportar sync completo

ALTER TABLE players ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE players ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS api_position text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS api_player_id bigint;
ALTER TABLE players ADD COLUMN IF NOT EXISTS season text DEFAULT 'WC2026';
ALTER TABLE players ADD COLUMN IF NOT EXISTS synced_at timestamptz DEFAULT now();

-- Criar índice para buscar por season (útil para limpar dados antigos depois)
CREATE INDEX IF NOT EXISTS idx_players_season ON players(season);
