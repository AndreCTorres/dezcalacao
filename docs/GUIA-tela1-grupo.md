# Guia — Tela 1: Criar grupo + convidar membros

Passo a passo pra construir no Cursor. Cada passo tem **o que fazer**, **o prompt pra colar**
e **como saber se funcionou**. Vá um passo de cada vez — só avance quando o anterior estiver ok.

> Regra de ouro com o Cursor: comece todo prompt mandando ele **ler o BRIEF.md e o .cursorrules**,
> e peça pra ele **explicar o plano antes de aplicar**. Faça commits pequenos a cada passo.

---

## Passo 0 — Preparação (uma vez só)

### 0.1 — Criar o app Next
**Prompt:**
> Leia BRIEF.md e .cursorrules. Este projeto vai ser um Next.js (App Router) + TypeScript +
> Tailwind. Configure o projeto Next neste diretório preservando os arquivos que já existem
> (BRIEF.md, .cursorrules, lib/, supabase/, app/ com stubs). Não sobrescreva esses arquivos.

**Check:** `npm run dev` abre em localhost:3000 sem erro.

### 0.2 — Criar o projeto no Supabase
1. Crie um projeto em supabase.com.
2. Em **SQL Editor**, rode o conteúdo de `supabase/schema.sql`.
3. Rode também este gatilho, que cria o `profiles` automaticamente quando alguém se cadastra:

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Check:** as tabelas aparecem em **Table Editor**.

### 0.3 — Variáveis de ambiente
Copie `.env.example` para `.env.local` e preencha com a URL e as chaves do Supabase
(Settings → API). **Nunca** commite o `.env.local`.

**Check:** `.env.local` existe e está no `.gitignore`.

### 0.4 — Ligar o login
No painel do Supabase, em **Authentication → Providers**, habilite **Email (magic link)**
(e Google, se quiser depois).

### 0.5 — Segurança básica (RLS)
**Prompt:**
> Ative Row Level Security nas tabelas e crie policies básicas: um usuário só lê os `groups`
> em que é membro; só o `admin_id` do grupo pode alterar o grupo e inserir em `group_members`
> e `team_players` daquele grupo. Use @supabase/ssr pra autenticação no App Router (cookies),
> que é o jeito recomendado. Explique as policies antes de aplicar.

**Check:** sem login, uma query a `groups` retorna vazio (não erro), e logado você vê os seus.

---

## Passo 1 — Tela de login (`/login`)

**Prompt:**
> Crie a rota `/login` com login por **magic link** (e-mail) usando o Supabase. Depois de
> logar, redirecione pra `/admin`. Crie também o callback de auth que o Supabase exige.
> Use @supabase/ssr. UI em português, simples, no estilo da landing (fundo escuro,
> acento verde-limão). Explique o fluxo antes de aplicar.

**Check:** você digita seu e-mail, recebe o link, clica, e cai logado em `/admin`. Confira
que apareceu uma linha sua em `profiles` (criada pelo gatilho).

---

## Passo 2 — Criar grupo (`/admin`)

**Prompt:**
> Na rota `/admin`, se o usuário logado ainda não tem grupo, mostre um formulário "Criar grupo"
> com o campo **nome**. Ao enviar:
> 1) insira em `groups` com `admin_id` = usuário atual, `status` = 'setup';
> 2) insira o próprio admin em `group_members` (role 'admin', status 'joined', profile_id = ele,
>    display_name = o nome do profile).
> Se o usuário já tem grupo, mostre o painel do grupo (nome + lista de membros, que faremos no
> próximo passo). Use server actions. Explique antes de aplicar.

**Check:** criar um grupo gera 1 linha em `groups` e 1 em `group_members` (você, como admin).
Recarregar a página mostra o painel, não o formulário de novo.

---

## Passo 3 — Adicionar e listar membros

**Prompt:**
> No painel do grupo em `/admin`, liste os membros (`group_members` do grupo) mostrando
> display_name e status. Adicione um formulário "Adicionar membro" com **nome** (obrigatório)
> e **e-mail** (opcional). Ao enviar, insira em `group_members` com profile_id nulo,
> status 'invited'. Só o admin do grupo pode adicionar. Atualize a lista sem recarregar.
> Explique antes de aplicar.

**Check:** adicionar "João" cria uma linha em `group_members` com status 'invited' e aparece
na lista. (Nesse ponto já dá pra usar esses nomes na futura tela de draft.)

---

## Passo 4 — Convite de verdade (link + reivindicar vaga)

> Opcional pra agora — dá pra deixar pra depois, porque com o Passo 3 você já consegue tocar
> o draft usando os nomes. Mas é o que liga a conta de cada amigo ao time dele.

**Prompt:**
> Crie um link de convite por grupo, ex.: `/entrar/[groupId]`. Quem abre faz login por magic
> link e cai numa tela "reivindicar sua vaga" que lista os membros do grupo ainda sem conta
> (profile_id nulo). A pessoa escolhe o nome dela; aí o sistema seta `profile_id` = usuário
> atual e `status` = 'joined' naquele `group_members`. Garanta que um profile só pode
> reivindicar uma vaga por grupo. Explique antes de aplicar.

**Check:** abrir o link em outra conta, escolher um nome e ver aquele membro virar 'joined'
com o profile_id preenchido.

---

## Como falar com o Cursor (resumo)

- Sempre: "leia BRIEF.md e .cursorrules" no começo, e "explique o plano antes de aplicar".
- Um passo por vez. Testa, commita, segue.
- Se ele quiser mudar o schema, peça pra justificar contra o `supabase/schema.sql` — o schema
  é a fonte da verdade.
- Se travar num erro, cola o erro inteiro pra ele e diga o que você esperava que acontecesse.
- Nunca deixe ele pôr chave/secret no código do cliente — isso já está no .cursorrules.

## Próxima tela
Depois dessa, o caminho natural é a **tela de draft do admin** (`/admin/draft`): atribuir
jogadores aos membros, com a lista vinda da API-Football e a validação de "um por seleção".
