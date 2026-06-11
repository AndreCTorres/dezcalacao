-- =============================================================================
-- SCRIPT: Unificar André como ADMIN do Grupo
-- =============================================================================
-- 
-- OBJETIVO: Fazer com que André seja o admin do grupo, permitindo que você
--           alterne entre a tela de admin e a tela de participante.
--
-- PASSO 1: Executar este script no Supabase SQL Editor
-- PASSO 2: Recarregar a página (F5) no navegador
-- PASSO 3: Você verá o botão de alternância ⚙️ Admin / 👤 Participante
--
-- =============================================================================

BEGIN;

-- 1. Encontrar o grupo (assumindo que há apenas um)
WITH grupos_andre AS (
  SELECT DISTINCT g.id, g.admin_id
  FROM groups g
  JOIN group_members gm ON gm.group_id = g.id
  WHERE gm.display_name = 'André'
  LIMIT 1
)
-- 2. Encontrar o profile_id de André
, andre_profile AS (
  SELECT DISTINCT profile_id
  FROM group_members
  WHERE display_name = 'André'
  LIMIT 1
)
-- 3. Atualizar o admin_id do grupo para o profile_id de André
UPDATE groups
SET admin_id = (SELECT profile_id FROM andre_profile)
WHERE id = (SELECT id FROM grupos_andre)
  AND admin_id IS NOT NULL;  -- Protege contra grupos sem admin

-- Confirmar a atualização
SELECT 
  g.id,
  g.name,
  g.admin_id,
  gm.display_name as admin_name,
  gm.role
FROM groups g
LEFT JOIN profiles p ON g.admin_id = p.id
LEFT JOIN group_members gm ON gm.profile_id = p.id AND gm.group_id = g.id
ORDER BY g.created_at DESC
LIMIT 1;

COMMIT;

-- =============================================================================
-- RESULTADO ESPERADO:
-- ├─ id: <UUID do grupo>
-- ├─ name: "Draft do Hexa" (ou nome do seu grupo)
-- ├─ admin_id: <UUID de André>
-- ├─ admin_name: "André"
-- └─ role: "admin"
-- =============================================================================
