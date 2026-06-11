-- supabase/migrations/005_create_teams_table.sql
-- Criar tabela teams para cache dos IDs das seleções da API-Football

CREATE TABLE IF NOT EXISTS teams (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL,
  api_name text,
  national boolean DEFAULT true,
  season text DEFAULT 'WC2026',
  synced_at timestamptz DEFAULT now(),
  UNIQUE (country, season)
);

-- Índice para buscar por país (útil pra UI de seleções)
CREATE INDEX IF NOT EXISTS idx_teams_country ON teams(country);
CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season);
