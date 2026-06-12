-- Migration: 010_fix_usa_team_id.sql
-- Corrige o ID errado da seleção dos EUA
-- O sync anterior salvou ID 657 (Beitar Jerusalem / Israel) como "USA"
-- O ID correto confirmado via API-Football Copa 2022 é 2384

-- 1. Deletar os jogadores do time errado (ID 657 = Beitar Jerusalem)
DELETE FROM players
WHERE team_id = 657
  AND season = 'WC2026';

-- 2. Deletar o registro de time errado
DELETE FROM teams
WHERE id = 657
  AND season = 'WC2026';

-- Verificação final
SELECT
  'times após fix' AS descricao,
  COUNT(*) AS total
FROM teams
WHERE season = 'WC2026' AND national = true

UNION ALL

SELECT
  'jogadores após fix',
  COUNT(*)
FROM players
WHERE season = 'WC2026';
