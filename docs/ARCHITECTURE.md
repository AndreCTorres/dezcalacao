# DezcalaÃ§Ã£o â€” Arquitetura do Projeto

> Documento de referÃªncia tÃ©cnica. Descreve fluxo de autenticaÃ§Ã£o, entidades, regras de negÃ³cio, dependÃªncias e estrutura do projeto.

## 1. Fluxo de AutenticaÃ§Ã£o

### VisÃ£o Geral
- **Tipo:** Link mÃ¡gico (magic link) por e-mail + Google OAuth (opcional)
- **Provedor:** Supabase Auth
- **SessÃ£o:** Baseada em cookies (via `@supabase/ssr`)
- **ProteÃ§Ã£o:** Middleware Next.js valida sessÃ£o em cada requisiÃ§Ã£o

### Fluxo Detalhado

```
1. UsuÃ¡rio acessa /login
   â†“
2. Form envia e-mail â†’ server action (app/login/actions.ts)
   â†“
3. Supabase envia link mÃ¡gico por e-mail
   â†“
4. UsuÃ¡rio clica link â†’ rota /auth/callback ou /auth/confirm
   â†“
5. Callback/Confirm resgata token, cria sessÃ£o via cookie
   â†“
6. Middleware refresh token automaticamente (getUser())
   â†“
7. UsuÃ¡rio Ã© redirecionado para /admin ou /app
```

### Arquivos Relevantes
- `app/login/page.tsx` â€” pÃ¡gina de login
- `app/login/login-form.tsx` â€” form de e-mail
- `app/login/actions.ts` â€” server action que envia link
- `app/auth/callback/route.ts` â€” rota de callback (PKCE)
- `app/auth/confirm/route.ts` â€” rota de callback (stateless)
- `middleware.ts` â€” refresh de sessÃ£o e proteÃ§Ã£o de rotas
- `lib/supabase-server.ts` â€” clientes com SSR (cookies)

### Detalhes de ImplementaÃ§Ã£o
- **Cliente anon:** Usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` (pÃºblica, segura)
- **Cookies:** Armazenam `sb-access-token` e `sb-refresh-token`
- **Refresh automÃ¡tico:** Middleware chama `getUser()` que atualiza token se necessÃ¡rio
- **ProteÃ§Ã£o de rotas:**
  - `/admin` e `/app` requerem autenticaÃ§Ã£o
  - Se nÃ£o autenticado â†’ redireciona para `/login`
  - Se autenticado em `/login` â†’ redireciona para `/admin`

---

## 2. Entidades do Banco de Dados

### Schema Completo (Supabase / Postgres)

#### `profiles`
Espelho de `auth.users`. Cada usuÃ¡rio autenticado tem um perfil.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Chave primÃ¡ria:** `id` (UUID, gerada pelo Auth do Supabase)  
**Campos:**
- `display_name` â€” nome do usuÃ¡rio (exibiÃ§Ã£o)
- `created_at` â€” data de criaÃ§Ã£o

---

#### `groups`
Representa um bolÃ£o/grupo de amigos.

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
- `setup` â€” configurando o grupo
- `drafting` â€” em andamento o draft
- `active` â€” torneio ativo (draft fechado)
- `finished` â€” torneio encerrado

**Regras configurÃ¡veis por grupo:**
- `bonus_selecao_rodada` â€” ativar bÃ´nus XI da rodada
- `bonus_craque_partida` â€” ativar bÃ´nus craque dos jogos
- `max_subs_por_rodada` â€” limite de substituiÃ§Ãµes por rodada (padrÃ£o: 3)
- `min_minutos` - legado/configuração antiga; minutos não filtram pontuação no motor atual

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
- `player` â€” participante normal
- `admin` â€” criador/administrador do grupo

**Estados (`status`):**
- `invited` â€” convidado, ainda sem conta
- `joined` â€” aceitou e tem conta

---

#### `teams` (cache da API)
Cache de seleÃ§Ãµes/times da Copa 2026.

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

**PosiÃ§Ãµes (`position`):**
- `GK` â€” goleiro
- `ZAG` â€” zagueiro
- `LAT` â€” lateral
- `MEI` â€” meio-campo
- `ATK` â€” ataque

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
- `starter` â€” 11 titulares
- `bench` â€” 5 reservas

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
- `open` â€” rodada aberta, pode fazer substituiÃ§Ãµes
- `locked` â€” rodada travada, aguardando resultados
- `scored` â€” pontuaÃ§Ã£o calculada

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
Trocas de reserva por titular (mesma posiÃ§Ã£o, por rodada).

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
PontuaÃ§Ã£o calculada por membro por rodada.

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

## 3. Regras de NegÃ³cio

### Regras do Jogo

#### ComposiÃ§Ã£o do Time
- **16 jogadores:** 11 titulares + 5 reservas
- **Um por seleÃ§Ã£o:** nÃ£o pode ter 2 jogadores do mesmo paÃ­s no mesmo time
- **Por posiÃ§Ã£o:** validar conforme requerimento especÃ­fico

#### PontuaÃ§Ã£o
**Base (obrigatÃ³ria):**
1. Soma das notas dos 11 titulares naquela rodada
2. Nota vem da API-Football (escala ~0â€“10)
3. Minutos não filtram pontuação; se o jogador tem nota, ela conta integralmente
4. Se seleÃ§Ã£o nÃ£o jogou ou foi eliminada â†’ nota 0
5. Se nota ainda nÃ£o saiu â†’ usar `neutralRating` (padrÃ£o: 6.0) temporariamente

**BÃ´nus (opcionais, por grupo):**
- **XI da Rodada:** +1.0 ponto por jogador no XI determinÃ­stico (maior nota por posiÃ§Ã£o)
- **Craque da Partida:** +1.0 ponto por jogador com maior nota em seu jogo

#### SubstituiÃ§Ãµes
- **Limite:** atÃ© `max_subs_por_rodada` (padrÃ£o: 3) por rodada, por membro
- **Regra:** reserva entra no lugar de titular, **mesma posiÃ§Ã£o**
- **Janela:** apÃ³s rodada travar (ou limite de tempo)
- **ContabilizaÃ§Ã£o:** score recalculado com nova escalaÃ§Ã£o

---

## 4. DependÃªncias Entre MÃ³dulos

### DependÃªncias Externas (package.json)

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
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ NAVEGADOR                                               â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ â€¢ Server Components (RSC)                               â”‚
â”‚ â€¢ Client Components (form, interaÃ§Ã£o)                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”˜
                  â”‚                                       â”‚
         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”                   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
         â”‚ Server Actions  â”‚                   â”‚ API Routes     â”‚
         â”‚ (lib/supabase)  â”‚                   â”‚ (/api/...)     â”‚
         â””â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜                   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
                  â”‚                                       â”‚
                  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                â”‚
                        â”Œâ”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”
                        â”‚ Supabase       â”‚
                        â”‚ â€¢ Auth         â”‚
                        â”‚ â€¢ Postgres DB  â”‚
                        â”‚ â€¢ RLS Policies â”‚
                        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## 5. Estrutura de Pastas

```
dezcalacao/
â”œâ”€â”€ app/                           # Rotas Next.js (App Router)
â”‚   â”œâ”€â”€ layout.tsx                 # Root layout
â”‚   â”œâ”€â”€ page.tsx                   # Landing (/)
â”‚   â”œâ”€â”€ admin/                     # Painel do admin
â”‚   â”œâ”€â”€ app/                       # Painel do participante
â”‚   â”œâ”€â”€ login/                     # AutenticaÃ§Ã£o
â”‚   â”œâ”€â”€ auth/                      # Callbacks de auth
â”‚   â”œâ”€â”€ api/                       # API routes
â”‚   â”œâ”€â”€ components/                # Componentes compartilhados
â”‚   â””â”€â”€ globals.css                # Estilos globais
â”‚
â”œâ”€â”€ lib/                           # UtilitÃ¡rios e clientes
â”‚   â”œâ”€â”€ supabase.ts                # Clientes Supabase
â”‚   â”œâ”€â”€ supabase-server.ts         # Clientes SSR
â”‚   â”œâ”€â”€ apiFootball.ts             # Cliente API-Football
â”‚   â””â”€â”€ scoring.ts                 # Motor de pontuaÃ§Ã£o
â”‚
â”œâ”€â”€ supabase/                      # Scripts e SQL
â”‚   â”œâ”€â”€ schema.sql                 # Schema completo
â”‚   â”œâ”€â”€ rls-policies.sql           # PolÃ­ticas de seguranÃ§a
â”‚   â””â”€â”€ migration-teams-sync.sql   # Migrations
â”‚
â”œâ”€â”€ docs/                          # ðŸ“ NOVA: DocumentaÃ§Ã£o
â”‚   â”œâ”€â”€ README.md                  # Ãndice de docs
â”‚   â”œâ”€â”€ BRIEF.md                   # Spec do produto
â”‚   â”œâ”€â”€ ARCHITECTURE.md            # Arquitetura tÃ©cnica
â”‚   â”œâ”€â”€ SETUP_LOGIN.md             # Setup de autenticaÃ§Ã£o
â”‚   â”œâ”€â”€ CONFIGURAR_SUPABASE.md     # Config do Supabase
â”‚   â”œâ”€â”€ CONFIGURAR_EMAIL_TEMPLATE.md # Config de e-mail
â”‚   â”œâ”€â”€ GUIA-tela1-grupo.md        # Guia de desenvolvimento
â”‚   â”œâ”€â”€ FLUXO_STATELESS_PRONTO.md  # Fluxo de auth
â”‚   â””â”€â”€ SYNC_JOGADORES.md          # SincronizaÃ§Ã£o de jogadores
â”‚
â”œâ”€â”€ middleware.ts                  # Middleware Next.js
â”œâ”€â”€ tsconfig.json                  # Config TypeScript
â”œâ”€â”€ package.json                   # DependÃªncias
â”œâ”€â”€ .env.example                   # Template de env
â”œâ”€â”€ .cursorrules                   # ConvenÃ§Ãµes (Cursor AI)
â”œâ”€â”€ .gitignore                     # Git ignore
â””â”€â”€ README.md                      # Setup rÃ¡pido
```

---

## 6. PrÃ³ximos Passos

1. âœ… **Arquitetura documentada** em `ARCHITECTURE.md`
2. âœ… **DocumentaÃ§Ã£o agrupada** em `/docs`
3. ðŸ“‹ **Implementar tela de admin** (criar grupo, draft)
4. ðŸ“‹ **Sincronizar jogadores** (API-Football)
5. ðŸ“‹ **Implementar pontuaÃ§Ã£o** (closing rodadas)
6. ðŸ“‹ **UI do participante** (ver time + substituiÃ§Ãµes)

---

**Ãšltima atualizaÃ§Ã£o:** Junho 2026  
**VersÃ£o:** 1.0
