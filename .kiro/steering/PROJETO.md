# 🎯 Guia do Projeto Dezcalação

> Padrões, regras e contexto para desenvolvimento com Kiro. Esta steering file é incluída automaticamente em todas as interações.

---

## 📖 Contexto do Projeto

**Dezcalação** é um fantasy draft da Copa do Mundo para jogar entre amigos.

Leia primeiro:
- `docs/BRIEF.md` — Spec completo do produto
- `docs/ARCHITECTURE.md` — Arquitetura técnica

---

## 🛠️ Stack Técnico

- **Frontend + Backend:** Next.js (App Router) + TypeScript
- **Estilo:** Tailwind CSS
- **Banco + Auth:** Supabase (Postgres + Auth via magic link)
- **Dados de Futebol:** API-Football (chamadas via servidor)
- **Hospedagem:** Vercel + Supabase

---

## ⚠️ Regras Inegociáveis

### 🚨 Economia de Requisições à API-Football
- **Limite diário real: ~100 req/dia** no plano free. Cada requisição conta.
- ✅ Jogadores das 48 seleções já estão sincronizados no banco (`season = 'WC2026'`). **NÃO rodar syncPlayers() novamente** — os dados estão completos.
- ✅ As próximas requisições devem ser **exclusivamente para coleta de notas** (ratings por fixture/rodada).
- ❌ Nunca rodar sync de elencos novamente sem motivo explícito e aprovação do admin.
- ❌ Nunca fazer chamadas exploratórias/diagnóstico à API-Football sem necessidade real.
- ✅ Usar `/api/sync-check` (zero requisições) para verificar estado antes de qualquer sync.
- ✅ IDs de times já resolvidos e hardcoded em `KNOWN_TEAM_IDS` — não rebuscar.
- ✅ Ao fechar rodadas, usar throttle de 6500ms entre requisições para não estourar o rate limit.

### Segurança
- ✅ Chaves de API (`API_FOOTBALL_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) **NUNCA** vão pro cliente
- ✅ Toda chamada à API-Football acontece em **API routes** ou **Server Actions** (servidor)
- ✅ RLS (Row Level Security) ativo em todas as tabelas do Supabase
- ✅ Validar `user.id` em cada operação sensível

### Regras do Jogo
- **Pontuação:** NOTA do jogador no jogo (~0-10), conforme `lib/scoring.ts`
- **Time:** 16 jogadores (11 titulares + 5 reservas)
- **Exclusividade:** Um por seleção por membro, draft exclusivo no grupo
- **Posições:** GK, ZAG, LAT, MEI, ATK
- **Substituições:** Respeita posição, limite configurável por grupo
- **Draft:** Registrado pelo admin (não é ao vivo)

### Dados
- Fonte única de verdade: `supabase/schema.sql`
- Bônus (XI da rodada, craque da partida) são **opcionais e aditivos**
- Sem marcas/logos FIFA, sem imagens de jogadores reais sem cuidado legal
- Sem qualquer mecânica de aposta — é bolão entre amigos

---

## 📝 Convenções de Código

### Linguagem
- UI e textos em **português do Brasil**, tom informal mas claro
- Nomes de variáveis/funções em inglês, comentários em português

### Estrutura
- Funções de regra de negócio: **puras e testáveis** (padrão: `lib/scoring.ts`)
- Server Actions em `app/*/actions.ts`
- Tipos compartilhados em `lib/types.ts` (criar conforme necessário)
- Componentes UI em `app/components/`

### Padrões de Segurança
```typescript
// ✅ Correto: Validar user.id antes de operação
const user = await auth.getUser()
if (!user) return { error: 'Não autenticado' }

// ✅ Correto: Usar user.id do servidor, não do cliente
await db.from('groups').insert({ admin_id: user.id })

// ❌ Incorreto: Confiar em admin_id do formulário
const formData = await request.formData()
const adminId = formData.get('admin_id') // Nunca! user.id validado no servidor
```

---

## 🗂️ Estrutura de Pastas

```
dezcalacao/
├── .kiro/
│   └── steering/
│       └── PROJETO.md                # Este arquivo
│
├── docs/                             # Documentação completa
│   ├── BRIEF.md                      # Spec do produto
│   ├── ARCHITECTURE.md               # Arquitetura técnica
│   └── [guias de setup]
│
├── app/                              # Next.js App Router
│   ├── api/
│   │   ├── rounds/
│   │   │   └── [groupId]/
│   │   │       └── details/
│   │   │           └── route.ts      # ✨ API para detalhes de rodadas
│   │   └── [outras rotas]
│   ├── components/
│   │   ├── ui/                       # ✨ Componentes genéricos
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── index.ts
│   │   └── logout-button.tsx
│   ├── admin/
│   │   ├── rodadas/
│   │   │   ├── actions.ts            # closeRound() com scoring
│   │   │   └── page.tsx
│   │   └── [outras páginas]
│   ├── app/                          # Dashboard do participante
│   │   ├── page.tsx                  # Home com ranking + time + rodadas
│   │   ├── time/
│   │   │   └── page.tsx              # ✨ Gerenciar substituições
│   │   ├── participant-team.tsx      # ✨ Time com botão de subs
│   │   ├── participant-standings.tsx # ✨ Ranking ao vivo (30s)
│   │   ├── round-details.tsx         # ✨ Acordeon de rodadas
│   │   ├── substitutions-actions.ts  # ✨ Server Actions de subs
│   │   ├── substitution-interface.tsx # ✨ UI interativa de subs
│   │   └── standings-actions.ts      # ✨ Server Actions de ranking
│   ├── login/
│   ├── auth/
│   ├── layout.tsx
│   └── globals.css
│
├── lib/                              # Código reutilizável
│   ├── services/
│   │   ├── group.service.ts          # Lógica de grupos
│   │   ├── scoring.service.ts        # ✨ Orquestração + standings
│   │   │   ├── calculateMemberRoundScore()
│   │   │   ├── calculateRoundScores()
│   │   │   └── getGroupStandings() [FIXED: filtra por grupo]
│   │   ├── sync.service.ts           # Sincronização de dados
│   │   └── index.ts
│   ├── types.ts                      # ✨ Tipos compartilhados
│   │   ├── Substitution
│   │   ├── RoundScore
│   │   ├── PlayerRoundRating
│   │   └── [tipos do domínio]
│   ├── supabase.ts
│   ├── supabase-server.ts
│   ├── apiFootball.ts
│   └── scoring.ts                    # ✨ Lógica pura de pontuação
│       ├── effectiveRating()
│       ├── basePoints()
│       ├── selecaoDaRodada()
│       └── craquesDaRodada()
│
├── supabase/                         # Banco de dados
│   ├── migrations/                   # Migrations versionadas
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_teams_sync.sql
│   │   └── 003_rls_policies.sql
│   └── [schema files]
│
└── [config files]                    # tsconfig, package.json, etc.
```

**✨ Novidades (Junho 2026 - Pontuação, Subs, Ranking):**
- ✨ `app/app/substitution-interface.tsx` — UI interativa (GK/ZAG/LAT/MEI/ATK)
- ✨ `app/app/substitutions-actions.ts` — Server Actions com 8 validações
- ✨ `app/app/time/page.tsx` — Página de escalação + substituições
- ✨ `app/app/standings-actions.ts` — Busca standings com grupo filtrado
- ✨ `app/app/participant-standings.tsx` — Ranking ao vivo (atualiza 30s, medalhas top 3)
- ✨ `app/app/round-details.tsx` — Acordeon de pontuação por rodada
- ✨ `app/api/rounds/[groupId]/details/route.ts` — API de detalhes de rodadas
- ✨ `app/app/participant-team.tsx` — Adicionado botão "🔄 Substituições"
- ✨ `lib/scoring.ts` — Lógica pura + tipos definidos
- ✨ `lib/services/scoring.service.ts` — Orquestração + bug fix em `getGroupStandings()`
- ✨ `app/admin/rodadas/actions.ts` — `closeRound()` integrado com scoring completo

---

## 🔄 Fluxos Principais

### Autenticação
1. Usuário vai para `/login`
2. Envia e-mail → Server Action
3. Clica link do e-mail → `/auth/confirm`
4. Middleware refresha sessão
5. Redirecionado para `/admin` ou `/app`

### Criar Grupo
1. Admin em `/admin` submete formulário
2. Server Action `createGroup()` valida `user.id`
3. Insere em `groups` com `admin_id = user.id`
4. Insere em `group_members` (admin como membro)
5. Página recarrega mostrando painel

### Sincronizar Jogadores
1. Admin clica botão em `/admin`
2. Server Action `syncPlayers()` valida admin
3. Resolve IDs de 48 seleções (API-Football)
4. Sincroniza elencos (upsert em `players`)
5. Retorna resultado (sucesso/pendências)

### Fechar Rodada & Calcular Pontuação
1. Admin em `/admin/rodadas` clica "Fechar Rodada"
2. `closeRound()` orquestra:
   - Busca fixtures da Copa 2026 (API-Football)
   - Para cada fixture: fetch player stats + upsert em `player_round_ratings`
   - Chama `calculateRoundScores(groupId, roundId)`
   - Cada membro: `calculateMemberRoundScore()` → busca draft + subs + ratings
   - `applySubstitutions()` → lineup efetivo (subs contam como titulares)
   - `basePoints()` → soma notas dos 11 titulares (com validação de minutos)
   - Upsert em `round_scores`
   - Muda `round.status = 'scored'`
3. Retorna feedback com stats (ratings inseridos, membros calculados)

### Fazer Substituição (Antes da Rodada Ser Fechada)
1. Participante em `/app/time` clica um titular
2. Seleciona uma reserva (mesma posição)
3. `applySubstitution()` valida:
   - Membro autenticado (user.id == member.profile_id)
   - Rodada aberta (status = 'open')
   - Titular sai (slot = 'starter'), reserva entra (slot = 'bench')
   - Mesma posição (position_slot)
   - Limite respeitado (< max_subs_por_rodada)
4. Insere em `substitutions` table
5. Quando `calculateMemberRoundScore()` roda, aplica substituições automaticamente

### Ver Ranking & Pontuação
1. Participante em `/app` vê:
   - **Card "Seu Time"**: titulares + reservas (com botão "🔄 Substituições")
   - **Card "🏆 Ranking"**: standings com:
     - 🥇🥈🥉 para top 3
     - Total geral (acumulado)
     - Último score (+X)
     - Atualiza a cada 30s via `getGroupStandingsWithRounds()`
   - **Seção "📊 Pontuação por Rodada"**: acordeon expandível
     - Clica rodada → vê scores de cada membro naquela rodada
     - Via `/api/rounds/[groupId]/details`
2. Dados vêm de `round_scores` summed por membro + rodada

---

## 🎨 Design & UX

### Cores
- **Background:** Cinza escuro (`#111827`, `bg-gray-900`)
- **Acento principal:** Verde-limão (`#bef264`, `lime-400`)
- **Acento secundário:** Dourado (para notas)
- **Cards:** Cinza médio (`#1f2937`, `gray-800`)

### Tipografia
- **Títulos:** Anton
- **Corpo:** Hanken Grotesk
- **Números/Monospace:** Space Mono

### Tom
- Informal mas claro
- Encorajador ("Vamos?", "Bora!")
- Sem jargão técnico desnecessário

---

## 📊 Entidades Principais

Veja `docs/ARCHITECTURE.md` para schema completo. Resumo:

- **profiles** → Usuários (espelho de auth.users)
- **groups** → Bolões/grupos de amigos
- **group_members** → Membros de um grupo
- **players** → Jogadores convocados (API-Football)
- **team_players** → Draft (quem pegou quem)
- **rounds** → Rodadas/matchdays
- **player_round_ratings** → Nota por jogador por rodada
- **round_scores** → Pontuação calculada

---

## 🔍 Checklist para PRs/Commits

Antes de fazer commit/PR, verifique:

- ✅ Não há chaves de API no código
- ✅ RLS está ativo nas queries sensíveis
- ✅ `user.id` foi validado antes de operações
- ✅ Textos em português claro
- ✅ Funções de negócio estão puras (testáveis)
- ✅ Nenhuma query `select *` sem filtro RLS
- ✅ Admin-only actions têm verificação de permissão
- ✅ Types estão em `lib/types.ts` ou inline conforme necessário

---

## 📋 Status de Implementação (Junho 2026)

### ✅ Priority 1: Integrar Pontuação ao Fluxo
- ✅ `closeRound()` em `app/admin/rodadas/actions.ts`
- ✅ Sincronização de ratings (API-Football → `player_round_ratings`)
- ✅ Cálculo automático de pontuação (`calculateRoundScores()`)
- ✅ Atualização de status de rodada para `'scored'`
- ✅ Build sem erros, testes manuais passando

### ✅ Priority 2: UI de Substituições
- ✅ Server Actions com 8 validações (`substitutions-actions.ts`)
- ✅ Interface interativa por posição (`substitution-interface.tsx`)
- ✅ Página completa `/app/time`
- ✅ Botão "🔄 Substituições" na home
- ✅ Reversão de substituições
- ✅ Indicador de limite (N / max_subs)

### ✅ Priority 3: Ranking em Tempo Real
- ✅ Componente com auto-atualização 30s (`participant-standings.tsx`)
- ✅ Medalhas para top 3 (🥇🥈🥉)
- ✅ Exibição de último score
- ✅ Acordeon de rodadas com detalhes (`round-details.tsx`)
- ✅ API route `/api/rounds/[groupId]/details`
- ✅ Bug fix em `getGroupStandings()` para filtrar por grupo

### 🎯 Priority 4: Testes + Polimento (Atual - IMPLEMENTANDO)
- ✅ Testes E2E com Playwright (3 suites)
- ✅ Testes unitários de scoring
- ✅ Error handling melhorado (try/catch + toasts)
- ✅ Loading states visuais
- ✅ Toast notifications (sucesso/erro)
- ✅ Documentação de testes (`docs/TESTING.md`)
- ⏳ Scripts de teste em package.json
- ⏳ Data seeding para testes

---

## 🧪 Testes (Priority 4)

### E2E com Playwright

**Suites:**
- `tests/e2e/scoring.spec.ts` — Fluxo: admin fecha → scores aparecem
- `tests/e2e/substitutions.spec.ts` — Fluxo: participante faz sub → reverter
- `tests/e2e/ranking.spec.ts` — Fluxo: ranking ao vivo + acordeom

**Commands:**
```bash
npm test              # Todos os testes
npm run test:e2e      # Apenas E2E
npm run test:ui       # UI interativa
npm run test:debug    # Debug passo a passo
```

### Unit Tests

**Suite:**
- `tests/unit/scoring.test.ts` — Funções puras:
  - `effectiveRating()` — Nota com validações
  - `basePoints()` — Soma dos 11 titulares
  - `selecaoDaRodada()` — XI da rodada

**Command:**
```bash
npm run test:unit
```

### Error Handling

**Implementado:**
- Try/catch em Server Actions
- Toast notifications (sucesso/erro/warning/info)
- `app/components/toast.tsx` — Sistema de notificações
- Messages de feedback em componentes
- Logs estruturados ([Rounds], [Scoring], [Substitution])

**Usar toasts:**
```typescript
if (typeof window !== 'undefined' && (window as any).showToast) {
  (window as any).showToast('Mensagem', 'success', 3000)
}
// ou: 'error', 'warning', 'info'
```

### Referências

- `docs/TESTING.md` — Guia completo de testes
- `playwright.config.ts` — Configuração Playwright
- `tests/` — Suites de teste

---

- **Schema:** `supabase/schema.sql`
- **Scoring:** `lib/scoring.ts` (lógica pura) + `lib/services/scoring.service.ts` (orquestração)
- **API-Football:** `lib/apiFootball.ts`
- **Substituições:** `app/app/substitutions-actions.ts` (server) + `app/app/substitution-interface.tsx` (UI)
- **Ranking:** `app/app/standings-actions.ts` (server) + `app/app/participant-standings.tsx` (UI)
- **Docs:** `docs/BRIEF.md` (spec do produto) + `docs/ARCHITECTURE.md` (arquitetura técnica) + `docs/TESTING.md` (guia de testes)
- **Steering files:**
  - `PROJETO.md` — Convenções, regras e contexto (este arquivo, sempre incluído)
  - `SETUP.md` — Configuração do ambiente (incluir com `#SETUP`)
  - `DEV_REFERENCE.md` — Cheat sheet de rotas, actions e componentes (incluir com `#DEV_REFERENCE`)

---

## 🔌 Fluxos de Dados (Referência Técnica)

### Cálculo de Pontuação (Quando rodada é fechada)
```
closeRound(groupId, roundId)
  → getFixtures() [API-Football]
  → Para cada fixture:
      → getPlayerStats(fixtureId) [API-Football]
      → Upsert em player_round_ratings
  → calculateRoundScores(groupId, roundId)
      → Para cada membro do grupo:
          → Busca team_players (draft)
          → Busca substitutions dessa rodada
          → applySubstitutions() → lineup efetivo
          → Busca player_round_ratings
          → basePoints(lineup, ratings) → soma dos 11 titulares
          → Upsert em round_scores
  → round.status = 'scored'
```

### Exibição de Ranking
```
/app (home)
  → ParticipantStandings (client component, useEffect)
      → getGroupStandingsWithRounds(groupId)
          → Busca todas as rodadas do grupo
          → Para cada membro: sum(round_scores.total_points)
          → Retorna standings ordenado + last_round
      → Renderiza com medalhas top 3
      → Atualiza a cada 30s

  → RoundDetails (client component, useEffect)
      → /api/rounds/[groupId]/details
          → Para cada rodada: busca scores + nomes
          → Retorna array de rodadas com scores
      → Renderiza acordeon expandível
```

### Aplicação de Substituição (Antes da rodada fechar)
```
/app/time (página de subs)
  → SubstitutionInterface (client, trata cliques)
      → applySubstitution(outPlayerId, inPlayerId)
          ✅ Valida membro autenticado
          ✅ Valida rodada aberta
          ✅ Valida titular → reserva
          ✅ Valida mesma posição
          ✅ Valida limite
          → Insere em substitutions
          → Revalidate /app/time
      → removeSubstitution(subId)
          ✅ Valida ownership
          → Delete de substitutions
          → Revalidate /app/time
```

### Retenção de Substituições
```
Quando calculateMemberRoundScore() é chamado:
  1. Busca team_players (16 do draft)
  2. Busca substitutions da rodada
  3. applySubstitutions() modifica lineup:
     - Se jogador foi out_player_id, substitui por in_player_id
     - Substituto conta como "starter" para cálculo
  4. basePoints() soma 11 titulares (incluindo substitutos)
  5. Reservas que entraram recebem rating do jogo que jogaram
```

---

## 💡 Dúvidas Frequentes

### "Posso usar biblioteca X?"
- Cheque se já está em `package.json`
- Prefira well-known + actively maintained
- Evite duplicação (ex: se já usa Tailwind, não use PostCSS customizado)

### "Por que o draft é fora da plataforma?"
- Velocidade: não precisa de UI em tempo real complexa
- Flexibilidade: admin conduz no Discord/Stream
- Upgrade: fase 2 pode ter draft ao vivo

### "Posso modificar o schema?"
- Sim, mas justifique contra `docs/ARCHITECTURE.md`
- Use migrations em `supabase/migrations/`
- Atualize `ARCHITECTURE.md` após change

### "Como testar a sincronização de jogadores?"
- Veja `docs/SYNC_JOGADORES.md`
- Execute `supabase/migration-teams-sync.sql` primeiro
- Use botão em `/admin` (admin-only)

### "Como funciona o cálculo de pontuação?"
- **Base**: Soma das notas dos 11 titulares (minutos >= 20, nota >= 0)
- **Nota faltando**: Usa `neutralRating` (6.0) até a nota chegar, depois recalcula
- **Substituição**: Reserva que entrou conta como titular (recebe nota do jogo)
- **Bônus**: XI da rodada + craque (desativado na fase 1, fase 2 tem)
- **Limite**: Máximo de N substituições por rodada (configurável por grupo)

### "Quando as substituições são aplicadas?"
- **Entrada**: Participante faz em `/app/time` enquanto rodada está `open`
- **Validação**: Check de posição, limite, status
- **Aplicação**: Quando `calculateMemberRoundScore()` roda (admin fecha rodada)
- **Permanência**: Só valem para aquela rodada, reset em rodada nova

### "O ranking é ao vivo?"
- Sim, `/app` atualiza a cada 30s via `useEffect`
- Busca via `getGroupStandingsWithRounds()`
- Soma acumulada de todas as rodadas fechadas

### "Posso ver apenas uma rodada?"
- API route `/api/rounds/[groupId]/details` traz todas as rodadas
- Frontend com acordeon expandível (clique para ver scores)
- Scores ordenados por total_points DESC

### "Como rodar testes?"
- E2E: `npm run test:e2e` (precisa dev server rodando)
- Unit: `npm run test:unit`
- UI interativa: `npm run test:ui`
- Debug: `npm run test:debug`
- Veja `docs/TESTING.md` para detalhes

### "Meu teste E2E está falhando"
1. Cheque se dev server está rodando (`npm run dev`)
2. Verifique DB de teste tem dados (grupo, participantes, rodada)
3. Use `npm run test:debug` para pausar e ver
4. Verifique seletores (data-testid, text=, etc)
5. Aumente timeout se necessário: `timeout: 30000`

---

**Última atualização:** Junho 2026  
**Versão:** 3.0 (com Testes + Polimento)
