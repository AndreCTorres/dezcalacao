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
│   │   └── internal/                 # ✨ Rotas internas
│   │       ├── sync/
│   │       └── scoring/
│   ├── components/
│   │   ├── ui/                       # ✨ Componentes genéricos
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── index.ts
│   │   └── [componentes específicos]
│   ├── admin/
│   ├── app/
│   ├── login/
│   ├── auth/
│   ├── layout.tsx
│   └── globals.css
│
├── lib/                              # Código reutilizável
│   ├── services/                     # ✨ Services de negócio
│   │   ├── group.service.ts          # Lógica de grupos
│   │   ├── scoring.service.ts        # Orquestração de pontuação
│   │   ├── sync.service.ts           # Sincronização de dados
│   │   └── index.ts
│   ├── types.ts                      # ✨ Tipos compartilhados
│   ├── supabase.ts
│   ├── supabase-server.ts
│   ├── apiFootball.ts
│   └── scoring.ts                    # Lógica pura de pontuação
│
├── supabase/                         # Banco de dados
│   ├── migrations/                   # ✨ Migrations organizadas
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_teams_sync.sql
│   │   └── 003_rls_policies.sql
│   ├── schema.sql                    # (legado - ver migrations/001)
│   ├── rls-policies.sql              # (legado - ver migrations/003)
│   └── migration-teams-sync.sql      # (legado - ver migrations/002)
│
└── [config files]                    # tsconfig, package.json, etc.
```

**Novidades:**
- ✨ `lib/types.ts` — Tipos compartilhados (centralizados)
- ✨ `lib/services/` — Services de negócio (grupo, scoring, sync)
- ✨ `app/components/ui/` — Componentes genéricos reutilizáveis
- ✨ `supabase/migrations/` — Migrations versionadas

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

## 📚 Referências Rápidas

- **Schema:** `supabase/schema.sql`
- **Scoring:** `lib/scoring.ts`
- **API-Football:** `lib/apiFootball.ts`
- **Docs:** `docs/` (começar com `BRIEF.md`)
- **Convenções:** Este arquivo

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

---

**Última atualização:** Junho 2026  
**Versão:** 1.0
