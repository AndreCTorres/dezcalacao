-- supabase/migrations/009_fix_season_consistency.sql
-- Corrige inconsistência no campo season: unifica tudo para 'WC2026'
-- Migração foi criando rows com '2026' e outras com 'WC2026', causando
-- o sync-check não reconhecer dados já sincronizados.

-- Corrigir teams
UPDATE teams SET season = 'WC2026' WHERE season = '2026';

-- Corrigir players
UPDATE players SET season = 'WC2026' WHERE season = '2026';

-- Garantir que os defaults futuros sejam 'WC2026'
ALTER TABLE teams ALTER COLUMN season SET DEFAULT 'WC2026';
ALTER TABLE players ALTER COLUMN season SET DEFAULT 'WC2026';
