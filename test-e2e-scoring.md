# 🧪 Teste E2E: Fluxo de Scoring Completo

## Cenário: Participante vê pontuação após rodada ser fechada

### Setup
```
1. Grupo "Copa 2026" criado
2. 2 participantes: João e Maria
3. Draft realizado: cada um tem 16 jogadores
4. Rodada 1 aberta
```

### Passos do Teste

#### Passo 1: João faz uma substituição
- [ ] Login como João
- [ ] Clica "🔄 Substituições" em /app
- [ ] Clica em um titular (ex: Neymar - ATK)
- [ ] Seleciona uma reserva (ex: Vinícius Jr - ATK)
- [ ] Confirma → "✓ Substituição realizada!"
- [ ] Volta para /app

**Verificar**: 
- Substituição aparece em `substitutions` table
- UI mostra "1 / 3 substituições utilizadas"

---

#### Passo 2: Admin fecha a rodada 1
- [ ] Login como admin
- [ ] Vai para /admin/rodadas
- [ ] Clica "Fechar Rodada" (Rodada 1)
- [ ] Aguarda: "✓ Ratings inseridos: X, Pontuação calculada para 2 membros"

**Servidor faz**:
1. Busca fixtures da Copa
2. Para cada fixture, busca `getPlayerStats()`
3. Insere ratings em `player_round_ratings`
4. Chama `calculateRoundScores()` para cada membro
5. Atualiza `round.status = 'scored'`

**Verificar BD**:
```sql
-- player_round_ratings preenchida
SELECT COUNT(*) FROM player_round_ratings WHERE round_id = 'rodada-1';

-- round_scores preenchida
SELECT * FROM round_scores 
  WHERE round_id = 'rodada-1' 
  ORDER BY total_points DESC;

-- round status
SELECT status FROM rounds WHERE id = 'rodada-1';
```

---

#### Passo 3: João vê ranking atualizado em /app
- [ ] Login como João
- [ ] Abre /app
- [ ] Vê "🏆 Ranking" com:
  - João em 1º ou 2º (com 🥇 ou 🥈)
  - Total de pontos (ex: "47.5 pts")
  - Último score (ex: "+47.5 ult.")
  - Maria logo abaixo
- [ ] Rola para "📊 Pontuação por Rodada"
- [ ] Clica em "Rodada 1"
- [ ] Vê accordion com:
  - João: 47.5 pts
  - Maria: 52.0 pts

**Verificar**:
- Componente `ParticipantStandings` chamou `getGroupStandingsWithRounds()`
- Dados vieram de `round_scores`
- Atualização automática a cada 30s funciona

---

#### Passo 4: João faz outra substituição (ainda na rodada 1)
- [ ] Clica "🔄 Substituições"
- [ ] Faz outra troca (limite é 3)
- [ ] Volta para /app

**Verificar**:
- Score de João **não muda** (substituição é pós-pontuação? Ou pré?)
- UI mantém 47.5 pts

---

#### Passo 5: Admin abre Rodada 2
- [ ] Admin em /admin/rodadas
- [ ] Clica "+ Criar Rodada"
- [ ] Preenche "Rodada 2" e salva

**Verificar**:
- Rodada 2 criada com `status = 'open'`

---

#### Passo 6: João vê página de substituições para Rodada 2
- [ ] Login como João
- [ ] Clica "🔄 Substituições"
- [ ] Vê: "Rodada: Rodada 2 • Status: open"
- [ ] **Novo**: Substitutions de Rodada 1 não aparecem mais
- [ ] Pode fazer novas substituições

**Verificar**:
- Server Action `getActiveRound()` retorna Rodada 2
- Substitutions da Rodada 2 estão zeradas

---

#### Passo 7: Admin fecha Rodada 2
- [ ] Admin clica "Fechar Rodada" em Rodada 2
- [ ] Aguarda conclusão

**Verificar BD**:
```sql
-- Novos scores para Rodada 2
SELECT * FROM round_scores 
  WHERE round_id = 'rodada-2' 
  ORDER BY total_points DESC;
```

---

#### Passo 8: João vê ranking acumulado
- [ ] Abre /app
- [ ] Vê ranking com:
  - Total geral (Rodada 1 + Rodada 2)
  - Exemplo: João 47.5 + 50.0 = 97.5 pts
- [ ] Clica em "Rodada 2" no acordeon
- [ ] Vê: "João: 50.0 pts" para essa rodada

**Verificar**:
- `getGroupStandingsWithRounds()` soma pontos corretamente
- Detalhes por rodada aparecem expandidos

---

### Verificações Finais

✅ **Scoring correto**:
- Titular não jogou (0 min) → 0 pts
- Titular jogou < min_minutos (ex: 15 min) → 0 pts
- Titular jogou >= min_minutos (ex: 30 min) → rating pts
- Nota null (ainda não saiu) → neutralRating (6.0)

✅ **Substituições respeitadas**:
- Jogador substituído em Rodada 1 → seu score soma até 11 titulares
- Reserva que entrou → conta na pontuação

✅ **UI responsivo**:
- Ranking atualiza a cada 30s
- Sem erros de console
- Componentes carregam corretamente

✅ **Integridade BD**:
- Sem duplicatas em `round_scores`
- `group_member_id` + `round_id` são UNIQUE
- Pontos sempre >= 0

---

## Comandos de Teste (Supabase CLI)

```bash
# Verificar último scoring
supabase sql \
  'SELECT m.display_name, r.name, rs.total_points 
   FROM round_scores rs
   JOIN group_members m ON rs.group_member_id = m.id
   JOIN rounds r ON rs.round_id = r.id
   ORDER BY rs.created_at DESC LIMIT 10'

# Verificar substituições
supabase sql \
  'SELECT COUNT(*) FROM substitutions 
   WHERE round_id = (SELECT id FROM rounds WHERE status = "open" LIMIT 1)'

# Verificar ratings sincronizados
supabase sql \
  'SELECT COUNT(*) FROM player_round_ratings WHERE rating IS NOT NULL'
```

---

## Checklist Final

- [ ] Build sem erros: `npm run build`
- [ ] Scoring funciona: Rodada fecha → scores aparecem
- [ ] Ranking atualiza: /app mostra pontos corretos
- [ ] Detalhes por rodada: Acordeon funciona
- [ ] Substituições: Cria, remove, valida limites
- [ ] RLS: Usuários veem apenas dados do seu grupo
- [ ] Sem console errors na home `/app`
