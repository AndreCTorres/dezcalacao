# Dezcalação ⚽️ 10

Fantasy draft da Copa do Mundo pra jogar entre amigos. Pontuação pela nota de
desempenho de cada jogador no jogo.

## Por onde começar
1. Leia **BRIEF.md** — é o contexto completo do produto e das decisões.
2. Crie o projeto Next se ainda não existir: `npx create-next-app@latest .` (ou peça pro Cursor).
3. `cp .env.example .env.local` e preencha as chaves (Supabase + API-Football).
4. Rode `supabase/schema.sql` no SQL editor do Supabase.
5. `npm install && npm run dev`.

## Arquivos já prontos
- `BRIEF.md` — spec do produto (cole no Cursor como contexto).
- `.cursorrules` — convenções do projeto.
- `supabase/schema.sql` — modelo de dados.
- `lib/apiFootball.ts` — cliente da API-Football (server-only).
- `lib/scoring.ts` — motor de pontuação (funções puras).
- `lib/supabase.ts` — clientes do Supabase.
- `app/` — esqueleto das páginas com TODOs.

## A landing
A landing page (`dezcalacao.html`) é um arquivo único e independente — pode hospedar
direto na Vercel/Netlify/GitHub Pages, ou virar a rota `/` depois.
