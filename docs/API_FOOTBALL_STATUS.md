# 📊 Status das Requisições API-Football (Junho 2026)

**Data:** 12 de Junho, 2026 (sexta-feira)  
**Plan:** Free (10 requisições/min = ~600/hora = ~14.400/dia)  
**Reset:** Diário à meia-noite (UTC-3)

---

## ✅ Confirmado (1 requisição consumida)

**Squad do Brasil 2026** foi testado com sucesso:
- ✓ 26 jogadores encontrados (Endrick, Vinicius Júnior, Neymar, etc.)
- ✓ Posições corretas (GK, Defenders, Midfielders, Attackers)
- ✓ Fotos da API carregando normalmente
- ✓ **Conclusão:** API retorna dados de 2026, não de 2022

**Custo:** 1 requisição (GET /api/test-football)

---

## 📈 O que ainda precisa sincronizar

### Seleções (Teams)
| Status | Ação | Requisições | Tempo |
|--------|------|-------------|-------|
| ❓ Desconhecido | Rodar `syncPlayers()` em `/admin` | ~48–96* | ~11–22 min |

*Depende de quantas seleções já estão no banco. Se 0%, é 96. Se 50%, é 48.

**O que `syncPlayers()` faz:**
1. Verifica na tabela `teams` quais dos 48 países já têm ID resolvido
2. Busca SOMENTE os países pendentes (não refaz o que já tem)
3. Para cada país: busca `/teams/search` → 1 requisição
4. Salva IDs em cache na tabela `teams`
5. Depois busca elencos: `/players/squads` → 1 requisição por time

**Inteligência de cache:**
- Primeira run: ~96 requests (48 search + 48 squad)
- Segunda run: ~0 requests (tudo em cache no banco)
- Retry parcial: ~N requests (só times faltando)

---

## ⚡ Operações que consomem requests

### 1. `closeRound()` — Principal consumidor

Quando você fecha uma rodada (admin → `/admin/rodadas`):

```
Fixo: 1 requisição (GET /fixtures de toda a Copa)
Variável: N requisições (1 por jogo da rodada)
```

**Exemplo — Fase de Grupos:**
- 8 jogos por "rodada" = 1 + 8 = **9 requisições**

**Exemplo — Oitavas (16 times):**
- 8 jogos = 1 + 8 = **9 requisições**

**Exemplo — Quartas:**
- 4 jogos = 1 + 4 = **5 requisições**

**Problema identificado:**
- `getFixtures()` busca TODOS os 104 jogos da Copa sempre
- Sem cache, cada retry gasta novamente
- Solução: adicionar cache curto (30 min) + filtro por rodada

---

## 🗓️ Plano Recomendado

### Hoje (Sexta 12 de Junho)
```
Requisições disponíveis: ~14.400 (full day)
Já gasto: 1 (test-football)
Sobra: ~14.399
```

**Ação recomendada:**
1. ✅ Confirmar que BD está limpo: `SELECT COUNT(*) FROM players`
2. 🔄 Rodar `syncPlayers()` → ~96 requisições (11-22 min)
3. Sobra: ~14.300 requisições
4. Opcionalmente fechar 1-2 rodadas para testar pontuação

### Amanhã em diante
- Reset automático à meia-noite
- Se ainda faltam países: retry `syncPlayers()` (pega só pendentes)
- Cada `closeRound()` custa ~5–9 requisições dependendo da fase

---

## 🔍 Como verificar o que já está sincronizado

### Query rápida (Supabase CLI ou DBeaver):

```sql
-- Quantas seleções estão resolvidas?
SELECT COUNT(*) as teams_resolved FROM teams WHERE season = 'WC2026' AND national = true;
-- Esperado: 48 (se tudo ok) ou < 48 (se incompleto)

-- Quantos jogadores estão no banco?
SELECT COUNT(*) as total_players FROM players WHERE season = 'WC2026';
-- Esperado: ~700-800 (26 por seleção × ~23-32 seleções)

-- Quais seleções faltam?
SELECT country FROM (
  SELECT DISTINCT country FROM (
    VALUES 
      ('Germany'), ('England'), ('Austria'), ('Belgium'), ...
  ) AS t(country)
  EXCEPT
  SELECT country FROM teams WHERE season = 'WC2026'
) AS missing;
```

---

## 🎯 Próximas Prioridades

### Priority 1: Cache em `closeRound()` (RECOMENDADO)
**Por quê?** Evitar desperdiçar requests em retries
**Como:** Adicionar `next: { revalidate: 1800 }` em `getFixtures()`
**Economia:** Se você fechar a mesma rodada 2x, economiza 1 requisição

### Priority 2: Filtro por rodada em `getFixtures()`
**Por quê?** Buscar só os jogos daquela rodada, não todos os 104
**Como:** Usar parâmetro `date` ou `status` da API-Football
**Economia:** ~20-30% em cada rodada (de 104 → 8-16 jogos)

### Priority 3: Alertar se rate limit
**Por quê?** Não ficar cego se ultrapassar 10 req/min
**Como:** Usar header `Retry-After` na resposta 429
**Status:** Já implementado em `syncPlayers()`

---

## 📋 Script de Teste Rápido

Para verificar status SEM gastar requests:

```bash
# Terminal
npm run dev

# REST Client (test.http)
POST http://localhost:3000/api/sync-offline
# Retorna: total de times e jogadores no banco
```

---

## 🚨 Cuidados

- ❌ **NÃO** confie no limite de 10 req/min se já ultrapassou hoje
- ❌ **NÃO** feche a mesma rodada 2x sem esperar 30 min (sem cache)
- ❌ **NÃO** rode `syncPlayers()` de novo se já completou (vai sobrescrever desnecessariamente)
- ✅ **SIM** monitore o console [Sync], [Rounds], [Scoring] para ver logs

---

**Última atualização:** 12 de Junho, 2026, 14h (após test-football bem-sucedido)
