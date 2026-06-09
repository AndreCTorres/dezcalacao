# Dezcalação — Arquitetura do Projeto

> Documento de referência técnica. Descreve fluxo de autenticação, entidades, regras de negócio, dependências e estrutura do projeto.

## 1. Fluxo de Autenticação

### Visão Geral
- **Tipo:** Link mágico (magic link) por e-mail + Google OAuth (opcional)
- **Provedor:** Supabase Auth
- **Sessão:** Baseada em cookies (via `@supabase/ssr`)
- **Proteção:** Middleware Next.js valida sessão em cada requisição

### Fluxo Detalhado

```
1. Usuário acessa /login
   ↓
2. Form envia e-mail → server action (app/login/actions.ts)
   ↓
3. Supabase envia link mágico por e-mail
   ↓
4. Usuário clica link → rota /auth/callback ou /auth/confirm
   ↓
5. Callback/Confirm resgata token, cria sessão via cookie
   ↓
6. Middleware refresh token automaticamente (getUser())
   ↓
7. Usuário é redirecionado para /admin ou /app
```

### Arquivos Relevantes
- `app/login/page.tsx` — página de login
- `app/login/login-form.tsx` — form de e-mail
- `app/login/actions.ts` — server action que envia link
- `app/auth/callback/route.ts` — rota de callback (PKCE)
- `app/auth/confirm/route.ts` — rota de callback (stateless)
- `middleware.ts` — refresh de sessão e proteção de rotas
- `lib/supabase-server.ts` — clientes com SSR (cookies)

### Detalhes de Implementação
- **Cliente anon:** Usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` (pública, segura)
- **Cookies:** Armazenam `sb-access-token` e `sb-refresh-token`
- **Refresh automático:** Middleware chama `getUser()` que atualiza token se necessário
- **Proteção de rotas:**
  - `/admin` e `/app` requerem autenticação
  - Se não autenticado → redireciona para `/login`
  - Se autenticado em `/login` → redireciona para `/admin`

---

## 2. Entidades do Banco de Dados

### Schema Completo (Supabase / Postgres)

#### `profiles`
Espelho de `auth.users`. Cada usuário autenticado tem um perfil.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Chave primária:** `id` (UUID, gerada pelo Auth do Supabase)  
**Campos:**
- `display_name` — nome do usuário (exibição)
- `created_at` — data de criação

---

#### `groups`
Representa um bolão/grupo de amigos.

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  season TEXT NOT NULL DEFAULT 'WC2026',
  status TEXT NOT NULL DEFAULT 'setup',
  bonus_selecao_rodada BOOLEAN NOT NULL DEFAULT false,
  bonus_craque_partida BOOLEAN NOT NULL DEFAULT false,
  max_subs_por_rodada INT NOT NULL DEFAULT 3,
  min_minutos INT NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Estados (`status`):**
- `setup` — configurando o grupo
- `drafting` — em andamento o draft
- `active` — torneio ativo (draft fechado)
- `finished` — torneio encerrado

**Regras configuráveis por grupo:**
- `bonus_selecao_rodada` — ativar bônus XI da rodada
- `bonus_craque_partida` — ativar bônus craque dos jogos
- `max_subs_por_rodada` — limite de substituições por rodada (padrão: 3)
- `min_minutos` — minutos mínimos para pontuação (padrão: 20)

---

#### `group_members`
Membros de um grupo. Pode existir sem `profile_id` (convidados sem conta).

```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id),
  display_name TEXT NOT NULL,
  invite_email TEXT,
  role TEXT NOT NULL DEFAULT 'player',
  status TEXT NOT NULL DEFAULT 'invited',
  joined_at TIMESTAMPTZ,
  UNIQUE(group_id, profile_id)
);
```

**Roles:**
- `player` — participante normal
- `admin` — criador/administrador do grupo

**Estados (`status`):**
- `invited` — convidado, ainda sem conta
- `joined` — aceitou e tem conta

---

#### `teams` (cache da API)
Cache de seleções/times da Copa 2026.

```sql
CREATE TABLE teams (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL UNIQUE,
  api_name TEXT,
  national BOOLEAN DEFAULT true,
  season TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
```

Populada automaticamente ao sincronizar via `syncPlayers()`.

---

#### `players`
Jogadores convocados (vindos da API-Football, populados via `syncPlayers()`).

```sql
CREATE TABLE players (
  api_player_id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  team_id BIGINT NOT NULL,
  team_name TEXT NOT NULL,
  api_position TEXT,
  position TEXT NOT NULL,
  age INT,
  number INT,
  photo_url TEXT,
  season TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);
```

**Posições (`position`):**
- `GK` — goleiro
- `ZAG` — zagueiro
- `LAT` — lateral
- `MEI` — meio-campo
- `ATK` — ataque

---

#### `team_players`
Draft registrado: quem pegou qual jogador.

```sql
CREATE TABLE team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES players(api_player_id),
  slot TEXT NOT NULL,
  position_slot TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_member_id, player_id)
);
```

**Slots:**
- `starter` — 11 titulares
- `bench` — 5 reservas

---

#### `rounds`
Rodadas/matchdays do torneio.

```sql
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Estados (`status`):**
- `open` — rodada aberta, pode fazer substituições
- `locked` — rodada travada, aguardando resultados
- `scored` — pontuação calculada

---

#### `player_round_ratings`
Nota de cada jogador em cada rodada (puxada da API-Football).

```sql
CREATE TABLE player_round_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id BIGINT NOT NULL REFERENCES players(api_player_id),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  fixture_id BIGINT REFERENCES fixtures(id),
  rating NUMERIC(4,2),
  minutes INT DEFAULT 0,
  source TEXT DEFAULT 'api-football',
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, round_id)
);
```

---

#### `substitutions`
Trocas de reserva por titular (mesma posição, por rodada).

```sql
CREATE TABLE substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  out_player_id BIGINT NOT NULL REFERENCES players(api_player_id),
  in_player_id BIGINT NOT NULL REFERENCES players(api_player_id),
  position_slot TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

#### `round_scores`
Pontuação calculada por membro por rodada.

```sql
CREATE TABLE round_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_member_id UUID NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  base_points NUMERIC(7,2) NOT NULL DEFAULT 0,
  bonus_points NUMERIC(7,2) NOT NULL DEFAULT 0,
  total_points NUMERIC(7,2) NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_member_id, round_id)
);
```

---

## 3. Regras de Negócio

### Regras do Jogo

#### Composição do Time
- **16 jogadores:** 11 titulares + 5 reservas
- **Um por seleção:** não pode ter 2 jogadores do mesmo país no mesmo time
- **Por posição:** validar conforme requerimento específico

#### Pontuação
**Base (obrigatória):**
1. Soma das notas dos 11 titulares naquela rodada
2. Nota vem da API-Football (escala ~0–10)
3. Se jogador jogou menos de `min_minutos` (padrão: 20 min) → nota 0
4. Se seleção não jogou ou foi eliminada → nota 0
5. Se nota ainda não saiu → usar `neutralRating` (padrão: 6.0) temporariamente

**Bônus (opcionais, por grupo):**
- **XI da Rodada:** +1.0 ponto por jogador no XI determinístico (maior nota por posição)
- **Craque da Partida:** +1.0 ponto por jogador com maior nota em seu jogo

#### Substituições
- **Limite:** até `max_subs_por_rodada` (padrão: 3) por rodada, por membro
- **Regra:** reserva entra no lugar de titular, **mesma posição**
- **Janela:** após rodada travar (ou limite de tempo)
- **Contabilização:** score recalculado com nova escalação

---

## 4. Dependências Entre Módulos

### Dependências Externas (package.json)

```json
{
  "next": "^14.2.0",                    // Framework React + routing
  "react": "^18.3.0",                   // UI
  "@supabase/supabase-js": "^2.45.0",  // Cliente do banco
  "@supabase/ssr": "^0.10.3",          // SSR + cookies
  "tailwindcss": "^3.4.19",            // Estilo CSS
  "typescript": "^5"                    // Type safety
}
```

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│ NAVEGADOR                                               │
├─────────────────────────────────────────────────────────┤
│ • Server Components (RSC)                               │
│ • Client Components (form, interação)                   │
└─────────────────┬─────────────────────────────────────┬─┘
                  │                                       │
         ┌────────▼────────┐                   ┌─────────▼──────┐
         │ Server Actions  │                   │ API Routes     │
         │ (lib/supabase)  │                   │ (/api/...)     │
         └────────┬────────┘                   └─────────┬──────┘
                  │                                       │
                  └─────────────┬──────────────────────────┘
                                │
                        ┌───────▼────────┐
                        │ Supabase       │
                        │ • Auth         │
                        │ • Postgres DB  │
                        │ • RLS Policies │
                        └────────────────┘
```

---

## 5. Estrutura de Pastas

```
dezcalacao/
├── app/                           # Rotas Next.js (App Router)
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Landing (/)
│   ├── admin/                     # Painel do admin
│   ├── app/                       # Painel do participante
│   ├── login/                     # Autenticação
│   ├── auth/                      # Callbacks de auth
│   ├── api/                       # API routes
│   ├── components/                # Componentes compartilhados
│   └── globals.css                # Estilos globais
│
├── lib/                           # Utilitários e clientes
│   ├── supabase.ts                # Clientes Supabase
│   ├── supabase-server.ts         # Clientes SSR
│   ├── apiFootball.ts             # Cliente API-Football
│   └── scoring.ts                 # Motor de pontuação
│
├── supabase/                      # Scripts e SQL
│   ├── schema.sql                 # Schema completo
│   ├── rls-policies.sql           # Políticas de segurança
│   └── migration-teams-sync.sql   # Migrations
│
├── docs/                          # 📁 NOVA: Documentação
│   ├── README.md                  # Índice de docs
│   ├── BRIEF.md                   # Spec do produto
│   ├── ARCHITECTURE.md            # Arquitetura técnica
│   ├── SETUP_LOGIN.md             # Setup de autenticação
│   ├── CONFIGURAR_SUPABASE.md     # Config do Supabase
│   ├── CONFIGURAR_EMAIL_TEMPLATE.md # Config de e-mail
│   ├── GUIA-tela1-grupo.md        # Guia de desenvolvimento
│   ├── FLUXO_STATELESS_PRONTO.md  # Fluxo de auth
│   └── SYNC_JOGADORES.md          # Sincronização de jogadores
│
├── middleware.ts                  # Middleware Next.js
├── tsconfig.json                  # Config TypeScript
├── package.json                   # Dependências
├── .env.example                   # Template de env
├── .cursorrules                   # Convenções (Cursor AI)
├── .gitignore                     # Git ignore
└── README.md                      # Setup rápido
```

---

## 6. Próximos Passos

1. ✅ **Arquitetura documentada** em `ARCHITECTURE.md`
2. ✅ **Documentação agrupada** em `/docs`
3. 📋 **Implementar tela de admin** (criar grupo, draft)
4. 📋 **Sincronizar jogadores** (API-Football)
5. 📋 **Implementar pontuação** (closing rodadas)
6. 📋 **UI do participante** (ver time + substituições)

---

**Última atualização:** Junho 2026  
**Versão:** 1.0
