-- =============================================================================
-- LIMPEZA: Remover apenas perfis de TESTE
-- =============================================================================
-- 
-- OBJETIVO: Deletar perfis de teste (teste, test, andrectorres17)
-- Manter: André, Danyel, Pedro, Lucas, Gombas, João Lucas, Pontes
--
-- Cascata deleta:
--   - groups (se admin_id for de teste)
--   - group_members associados
--   - team_players associados
--   - profiles
--
-- PASSO 1: Executar este script no Supabase SQL Editor
-- PASSO 2: Verificar o resultado
--
-- =============================================================================

BEGIN;

-- 1. Listar os perfis de TESTE que serão deletados
SELECT id, display_name FROM profiles 
WHERE display_name IN ('teste', 'test', 'andrectorres17');

-- 2. Deletar GRUPOS que pertencem aos perfis de teste (cascata deleta group_members e team_players)
DELETE FROM groups 
WHERE admin_id IN (
  SELECT id FROM profiles 
  WHERE display_name IN ('teste', 'test', 'andrectorres17')
);

-- 3. Deletar group_members restantes dos perfis de teste
DELETE FROM group_members 
WHERE profile_id IN (
  SELECT id FROM profiles 
  WHERE display_name IN ('teste', 'test', 'andrectorres17')
);

-- 4. Deletar os perfis de teste
DELETE FROM profiles 
WHERE display_name IN ('teste', 'test', 'andrectorres17');

-- 5. Verificar resultado — deve mostrar apenas os perfis reais
SELECT id, display_name FROM profiles 
ORDER BY display_name;

-- 6. Verificar grupos restantes
SELECT id, name, admin_id FROM groups;

COMMIT;

-- =============================================================================
-- RESULTADO ESPERADO:
-- Profiles:
-- ├─ André
-- ├─ Danyel
-- ├─ Gombas
-- ├─ João Lucas
-- ├─ Lucas
-- ├─ Pedro
-- └─ Pontes
--
-- Groups:
-- └─ Draft do Hexa (admin_id = André)
-- =============================================================================


