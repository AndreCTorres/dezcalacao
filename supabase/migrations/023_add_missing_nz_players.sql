-- Migration: Adicionar 4 jogadores faltantes da Nova Zelândia
-- Data: 2026-06-18
-- Razão: Jogadores não encontrados na sincronização inicial com API-Football
--        Adicionados manualmente com foto placeholder

-- Insere os 4 jogadores faltantes
INSERT INTO players (id, name, team_id, team_name, position, api_position, number, photo_url, api_player_id, season, synced_at)
VALUES
  (999001, 'E. Just', 4673, 'New Zealand', 'MEI', 'Manual Entry - Midfielder', 11, 'https://via.placeholder.com/150?text=Player+Photo', 999001, 'WC2026', NOW()),
  (999002, 'M. Ghayedi', 4673, 'New Zealand', 'MEI', 'Manual Entry - Midfielder', 10, 'https://via.placeholder.com/150?text=Player+Photo', 999002, 'WC2026', NOW()),
  (999003, 'E. Haisafi', 4673, 'New Zealand', 'ZAG', 'Manual Entry - Defender', 12, 'https://via.placeholder.com/150?text=Player+Photo', 999003, 'WC2026', NOW()),
  (999004, 'A. Hosseinzadeh', 4673, 'New Zealand', 'ATK', 'Manual Entry - Attacker', 20, 'https://via.placeholder.com/150?text=Player+Photo', 999004, 'WC2026', NOW())
ON CONFLICT (id) DO NOTHING;
