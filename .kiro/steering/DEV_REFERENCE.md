---
inclusion: manual
---

# 📋 Referência de Desenvolvimento — Dezcalação

> Cheat sheet técnico do dia a dia. Inclua com `#DEV_REFERENCE` quando precisar de referência rápida de rotas, componentes, actions ou testes.

---

## Comandos

```bash
npm run dev          # Dev server
npm run build        # Build produção
npm run lint         # Lint
npm test             # Todos os testes (E2E + Unit)
npm run test:e2e     # Só E2E
npm run test:unit    # Só Unit
npm run test:ui      # Playwright UI interativa
npm run test:debug   # Debug passo a passo
```

---

## Rotas

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/` | Qualquer | Landing page |
| `/login` | Qualquer | Auth por magic link |
| `/app` | Participante | Dashboard: time + ranking |
| `/app/time` | Participante | Gerenciar substituições |
| `/admin` | Admin | Gerenciar grupos e membros |
| `/admin/draft` | Admin | Alocar jogadores no draft |
| `/admin/rodadas` | Admin | Fechar rodadas e calcular pontuação |

---

## Server Actions

| Arquivo | Função | Descrição |
|---------|--------|-----------|
| `app/admin/rodadas/actions.ts` | `closeRound()` | Fecha rodada + calcula pontuação completa |
| `app/app/substitutions-actions.ts` | `applySubstitution()` | Aplica substituição (8 validações) |
| `app/app/substitutions-actions.ts` | `removeSubstitution()` | Reverte substituição |
| `app/app/standings-actions.ts` | `getGroupStandingsWithRounds()` | Ranking com pontos por rodada |

---

## Componentes Client

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `ParticipantTeam` | `app/app/participant-team.tsx` | Time + botão de substituições |
| `SubstitutionInterface` | `app/app/substitution-interface.tsx` | Seletor visual por posição |
| `ParticipantStandings` | `app/app/participant-standings.tsx` | Ranking ao vivo (atualiza 30s) |
| `RoundDetails` | `app/app/round-details.tsx` | Acordeom de pontuação por rodada |
| `ToastContainer` | `app/components/toast.tsx` | Notificações success/error/warning/info |

---

## API Routes

| Rota | Descrição |
|------|-----------|
| `GET /api/rounds/[groupId]/details` | Detalhes de pontuação de todas as rodadas |
| `POST /api/admin/seed-users` | Criar usuários de teste (dev only) |
| `POST /api/auth/logout` | Logout |
| `POST /api/test-auth` | Gerar magic link sem email (dev only) |

---

## Serviços e Lib

| Arquivo | Exports principais |
|---------|-------------------|
| `lib/scoring.ts` | `effectiveRating()`, `basePoints()`, `selecaoDaRodada()`, `applySubstitutions()` |
| `lib/services/scoring.service.ts` | `calculateRoundScores()`, `calculateMemberRoundScore()`, `getGroupStandings()` |
| `lib/services/group.service.ts` | Lógica de grupos |
| `lib/services/sync.service.ts` | Sincronização de jogadores |
| `lib/apiFootball.ts` | Cliente API-Football (server-only) |
| `lib/supabase-server.ts` | Cliente Supabase com SSR |
| `lib/types.ts` | Tipos: `Substitution`, `RoundScore`, `PlayerRoundRating` |

---

## Lógica de Pontuação

```typescript
// effectiveRating(player) → number
// Retorna 0 se < minMinutes, neutralRating (6.0) se null, senão rating real

// basePoints(lineup, ratings) → number
// Soma notas dos 11 titulares (inclui substitutos que entraram)

// selecaoDaRodada(players) → Set<playerId>
// XI da rodada: 1 GK, 2 ZAG, 2 LAT, 3 MEI, 3 ATK
```

**Fluxo de fechamento de rodada:**
```
closeRound(groupId, roundId)
  → getFixtures() [API-Football]
  → Para cada fixture: getPlayerStats() → upsert player_round_ratings
  → calculateRoundScores()
      → Para cada membro: busca draft + subs → applySubstitutions() → basePoints()
      → Upsert round_scores
  → round.status = 'scored'
```

---

## Tabelas do Banco

```
profiles              — Usuários (espelho de auth.users)
groups                — Bolões
group_members         — Membros por grupo
players               — Jogadores (API-Football)
teams                 — Cache de IDs das seleções
team_players          — Draft (quem pegou quem)
substitutions         — Substituições por rodada
rounds                — Rodadas/matchdays
player_round_ratings  — Nota por jogador por rodada
round_scores          — Pontuação calculada por membro por rodada
```

---

## Toasts

```typescript
// Chamar de Client Components
if (typeof window !== 'undefined' && (window as any).showToast) {
  (window as any).showToast('Mensagem', 'success', 3000)
  // tipos: 'success' | 'error' | 'warning' | 'info'
}
```

---

## Testes

### E2E (Playwright)
```
tests/e2e/scoring.spec.ts        — Admin fecha → scores aparecem
tests/e2e/substitutions.spec.ts  — Participante faz sub → reverter
tests/e2e/ranking.spec.ts        — Leaderboard + medalhas
```

### Unit
```
tests/unit/scoring.test.ts  — effectiveRating, basePoints, selecaoDaRodada
```

### Setup de dados para E2E
Precisa de: grupo criado, 2+ participantes, draft realizado, rodada `open`.
Ver `supabase/seed-draft.sql` para seed manual.

---

## Checklist antes de commitar

- [ ] `npm run build` passou sem erros
- [ ] Sem chaves de API no código
- [ ] `user.id` validado em operações sensíveis (nunca confiar em `admin_id` do form)
- [ ] RLS ativo nas queries novas
- [ ] Textos em português claro
- [ ] Sem `SELECT *` sem filtro de RLS
