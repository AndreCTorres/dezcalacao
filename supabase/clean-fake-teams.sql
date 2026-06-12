-- Remover os 4 times com IDs fictícios inseridos pelo sync-offline
-- IDs 2500-2503 não existem na API-Football e causariam falha no squad sync
-- Execute ANTES de rodar syncPlayers()

-- Ver o que será removido
SELECT id, name, country FROM teams WHERE id IN (2500, 2501, 2502, 2503);

-- Remover
DELETE FROM teams WHERE id IN (2500, 2501, 2502, 2503);

-- Confirmar que ficou limpo
SELECT COUNT(*) as teams_remaining FROM teams WHERE season = 'WC2026';
