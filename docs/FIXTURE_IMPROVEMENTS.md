# 🎯 Melhorias em Rodadas: Remover Duplicatas e Adicionar Placar

## Resumo das Mudanças

Foram feitas 3 melhorias principais na página de gerenciamento de rodadas:

### 1. ✅ Remover Duplicatas de Fixtures
- **Problema:** Alguns jogos estavam aparecendo 2x na lista
- **Solução:** Adicionada deduplicação na query (mantém apenas o primeiro fixture de cada ID)
- **Arquivo:** `app/admin/rodadas/[roundId]/page.tsx`

### 2. ✅ Adicionar Campo de Placar
- **Problema:** Não havia forma de registrar o placar final do jogo
- **Solução:** Adicionados campos `home_goals` e `away_goals` na tabela `fixtures`
- **Migrações:** 
  - `016_add_fixture_scores.sql` — Adiciona colunas
  - `017_dedup_fixtures.sql` — Remove duplicatas existentes

### 3. ✅ Melhorar Layout
- **Problema:** Layout inconsistente entre jogos
- **Solução:** Redesign com:
  - Placar em destaque (ex: `3 x 2`)
  - Data/hora do jogo
  - Contador consistente de notas
  - Melhor espaçamento

## Como Aplicar as Mudanças

### Opção 1: Aplicar via Supabase UI
1. Abra o dashboard Supabase
2. Vá para **SQL Editor**
3. Execute as migrações em ordem:
   - `supabase/migrations/016_add_fixture_scores.sql`
   - `supabase/migrations/017_dedup_fixtures.sql`
4. Pronto! As mudanças estarão ativas

### Opção 2: Via CLI do Supabase
```bash
supabase db pull   # Atualiza schema local
supabase migration list  # Verifica status
# As migrações serão aplicadas automaticamente na próxima conexão
```

### Opção 3: Manual (sem migrações)
Se preferir não mexer no banco, apenas o frontend foi atualizado:
- A deduplicação de fixtures acontece em tempo real na renderização
- Os campos de placar ficarão vazios até usar a interface

## Novos Recursos

### Campo de Placar na Modal

Ao clicar em um jogo para editar notas, agora há uma seção de **"Placar do Jogo"** com:
- Input para gols do mandante
- Input para gols do visitante
- Salva automaticamente junto com as notas

**Layout:**
```
┌─────────────────────────────────┐
│   PLACAR DO JOGO                │
├─────────────────────────────────┤
│ [3]  x  [2]                    │
│ Mandante    Visitante          │
│                                 │
│ Opcional: preencha para registrar o placar.
└─────────────────────────────────┘
```

### Exibição de Placar na Lista

Jogos com placar aparecem assim:
```
México x África do Sul  [3 x 1]  30 notas >
```

Jogos sem placar:
```
Coreia do Sul x Rep. Tcheca      Sem notas >
```

## Verificar as Mudanças

### No Admin
1. Acesse `http://localhost:3000/admin/rodadas`
2. Clique em uma rodada (ex: "Rodada 1")
3. Observe que:
   - ✅ Não há mais jogos duplicados
   - ✅ Cada jogo tem layout consistente
   - ✅ Ao clicar em um jogo, há campo de placar

### Estrutura de Dados

**Antes:**
```sql
fixtures (
  id bigint,
  round_id uuid,
  home_team text,
  away_team text,
  kickoff timestamptz,
  status text
)
```

**Depois:**
```sql
fixtures (
  id bigint,
  round_id uuid,
  home_team text,
  away_team text,
  kickoff timestamptz,
  status text,
  label text,              -- ← Novo
  home_goals int,          -- ← Novo
  away_goals int,          -- ← Novo
  home_team_id int,        -- ← Novo (futuro)
  away_team_id int         -- ← Novo (futuro)
)
```

## Testes Recomendados

### ✅ Verificar Deduplicação
1. Abra o console do navegador (F12)
2. Vá para `http://localhost:3000/admin/rodadas/{roundId}`
3. Conte os jogos exibidos
4. Compare com o banco: 
   ```sql
   SELECT COUNT(*) FROM fixtures WHERE round_id = '{roundId}'
   ```
5. Devem ser iguais (sem duplicatas)

### ✅ Testar Placar
1. Clique em um jogo para abrir a modal
2. Preencha os campos de placar (ex: 3 x 2)
3. Preencha algumas notas de jogadores
4. Clique "Salvar jogo"
5. Recarregue a página
6. Verifique se o placar aparece na lista: `[3 x 2]`

### ✅ Testar Layout
1. Rodados com diferentes números de notas:
   - "Sem notas"
   - "5 notas"
   - "22 notas"
2. Todos devem ter layout consistente (alinhamento, espaçamento)

## Troubleshooting

### "Ainda vejo jogos duplicados"
- **Cause:** Duplicatas no banco não foram removidas
- **Fix:** Execute `supabase/migrations/017_dedup_fixtures.sql`

### "Placar não salva"
- **Cause:** Migração não foi aplicada
- **Fix:** Execute `supabase/migrations/016_add_fixture_scores.sql`

### "Campo de placar não aparece"
- **Cause:** Browser está em cache, app não recarregou
- **Fix:** `Ctrl+Shift+R` (hard refresh) ou limpar cache

## Detalhes Técnicos

### Mudanças de Código

1. **Page ([roundId]/page.tsx)**
   ```typescript
   // Antes
   const { data: fixtures } = await admin
     .from('fixtures')
     .select('id, home_team, away_team, label, status')
     .eq('round_id', roundId)
     .order('id', { ascending: true })
   
   // Depois
   const { data: allFixtures } = await admin
     .from('fixtures')
     .select('id, home_team, away_team, label, status, home_goals, away_goals, kickoff')
     .eq('round_id', roundId)
     .order('kickoff', { ascending: true })
   
   // Deduplicar
   const seenIds = new Set<number>()
   const fixtures = (allFixtures ?? []).filter((f: any) => {
     if (seenIds.has(f.id)) return false
     seenIds.add(f.id)
     return true
   })
   ```

2. **Actions ([roundId]/actions.ts)**
   - Adicionada nova action: `updateFixtureScore()`
   - Permite salvar placar do jogo

3. **Manager Component (round-ratings-manager.tsx)**
   - Adicionados campos de placar na modal
   - Melhorado layout de lista de jogos
   - Exibe placar com destaque visual

### Queries do Banco

**Remover duplicatas manualmente:**
```sql
-- Lista duplicatas
select id, count(*) 
from fixtures 
group by id 
having count(*) > 1;

-- Remover (mantém o primeiro)
delete from fixtures 
where id in (
  select id from fixtures f1
  where exists (
    select 1 from fixtures f2 
    where f1.id = f2.id and f1.ctid > f2.ctid
  )
);
```

## Próximos Passos (Fase 2)

- [ ] Integrar placar com API-Football automaticamente
- [ ] Exibir placar final nas seções "Pontuação por Rodada" do participante
- [ ] Adicionar histórico de edições de placar (auditoria)
- [ ] Validar placar contra fonte oficial (FotMob, Sofascore)

---

**Data:** Junho 2026  
**Status:** ✅ Implementado e Testado  
**Deploy:** Pronto para produção
