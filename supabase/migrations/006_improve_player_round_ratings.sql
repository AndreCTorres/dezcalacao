-- supabase/migrations/006_improve_player_round_ratings.sql
-- Melhorias na tabela player_round_ratings para suportar sincronização de ratings

-- Adicionar índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_player_round_ratings_round_id ON player_round_ratings(round_id);
CREATE INDEX IF NOT EXISTS idx_player_round_ratings_player_id ON player_round_ratings(player_id);
CREATE INDEX IF NOT EXISTS idx_player_round_ratings_fixture_id ON player_round_ratings(fixture_id);

-- Criar índice composto para evitar duplicatas (player_id, round_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_round_ratings_unique 
  ON player_round_ratings(player_id, round_id) 
  WHERE player_id IS NOT NULL AND round_id IS NOT NULL;
