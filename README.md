# Dezcalação ⚽️ 10

Fantasy draft da Copa do Mundo pra jogar entre amigos. Pontuação pela nota de
desempenho de cada jogador no jogo.

## 🚀 Por onde começar

1. Leia **`docs/BRIEF.md`** — é o contexto completo do produto e das decisões.
2. Leia **`docs/README.md`** — índice de documentação.
3. Crie o projeto Next se ainda não existir: `npx create-next-app@latest .` (ou peça pro Cursor).
4. `cp .env.example .env.local` e preencha as chaves (Supabase + API-Football).
5. Rode `supabase/schema.sql` no SQL editor do Supabase.
6. `npm install && npm run dev`.

## 📚 Documentação

Toda a documentação está organizada em **`/docs`**:

- **`docs/BRIEF.md`** — Spec completo do produto (👈 começa aqui!)
- **`docs/ARCHITECTURE.md`** — Arquitetura técnica, fluxos, entidades, dependências
- **`docs/SETUP_LOGIN.md`** — Setup do sistema de autenticação
- **`docs/CONFIGURAR_SUPABASE.md`** — Configuração do Supabase Dashboard
- **`docs/CONFIGURAR_EMAIL_TEMPLATE.md`** — Configurar template de e-mail
- **`docs/FLUXO_STATELESS_PRONTO.md`** — Fluxo de autenticação stateless
- **`docs/GUIA-tela1-grupo.md`** — Guia de desenvolvimento (criar grupo)
- **`docs/SYNC_JOGADORES.md`** — Sincronização de jogadores da Copa 2026

## 🛠️ Estrutura do projeto

```
dezcalacao/
├── docs/                    # 📁 Documentação completa
├── app/                     # Next.js App Router
├── lib/                     # Utilitários (Supabase, API-Football, scoring)
├── supabase/                # Schema SQL e migrations
├── .cursorrules             # Convenções do projeto
├── middleware.ts            # Proteção de rotas
└── [configs]                # tsconfig, package.json, etc.
```

## ✅ Arquivos já prontos

- `.cursorrules` — convenções do projeto (para Cursor AI)
- `supabase/schema.sql` — modelo de dados completo
- `lib/apiFootball.ts` — cliente da API-Football (server-only)
- `lib/scoring.ts` — motor de pontuação (funções puras)
- `lib/supabase.ts` — clientes do Supabase
- `app/` — esqueleto das páginas com TODOs
- `dezcalacao.html` — landing page estática (independente)

## 🎯 Roadmap MVP

1. ✅ Autenticação (login por magic link)
2. ✅ Criar grupo + adicionar membros
3. ⏳ Sincronizar jogadores (API-Football)
4. ⏳ Tela de draft (atribuir jogadores)
5. ⏳ Tela de participante (ver time + pontos)
6. ⏳ Fechar rodada (calcular pontuação)
