# 📋 Spec: Semana 1 — Autenticação

**Objetivo:** Validar e completar o fluxo de magic link, middleware, sessão e logout.

**Status:** Em Progresso (validação)  
**Prioridade:** 🔴 Crítica  
**Semana:** 1

---

## 1️⃣ Requisitos

### 1.1 Fluxo de Magic Link
- [ ] Usuário acessa `/login` sem autenticação
- [ ] Digita e-mail e clica "Enviar link mágico"
- [ ] Server Action `signInWithEmail()` envia e-mail via Supabase
- [ ] Link chega no e-mail (pode levar minutos)
- [ ] Clica no link → abre `/auth/callback` com `code` de autenticação
- [ ] `/auth/callback` valida o `code` e troca por sessão
- [ ] Usuário é redirecionado para `/admin` (grupo) ou `/app` (membro)
- [ ] Sessão fica ativa nos cookies

### 1.2 Proteção de Rotas (Middleware)
- [ ] Sem autenticação: `/admin` → redireciona para `/login`
- [ ] Sem autenticação: `/app` → redireciona para `/login`
- [ ] Com autenticação: `/login` → redireciona para `/admin`
- [ ] Com autenticação: rotas públicas (`/`, `/dezcalacao.html`) funcionam normalmente
- [ ] Refresh de token automático ao acessar rotas protegidas

### 1.3 Logout
- [ ] Botão "Logout" visível na página do admin
- [ ] Clica logout → POST `/api/auth/logout`
- [ ] Sessão é limpa (cookies removidos)
- [ ] Redirecionado para `/login`
- [ ] Próxima tentativa de acessar `/admin` requer novo login

### 1.4 Dados do Usuário
- [ ] `profiles` criado automaticamente ao fazer login
- [ ] `user.id` é validado em cada operação sensível (não vem do client)
- [ ] `display_name` derivado de `user_metadata` ou e-mail

---

## 2️⃣ Design & UX

### 2.1 Páginas

**`/login` — Página de Login**
- Background: `bg-gray-900` (cinza escuro)
- Card central: `bg-gray-800` (cinza médio)
- Input: foco com borda `border-lime-400`
- Botão: `bg-lime-400 text-gray-900` (verde-limão)
- Placeholder: "seu@email.com"
- Link de logout (quando aplicável): sutil, `text-gray-400 hover:text-white`

**`/admin` — Painel do Admin**
- Header com "Dezcalação" + "Logout" (canto superior direito)
- Se sem grupo: mostra `CreateGroupForm`
- Se com grupo: mostra `GroupPanel`
- Estilos: mesmo padrão de background + cards + botões verde-limão

### 2.2 Textos (PT-BR)

| Elemento | Texto |
|----------|-------|
| Título do formulário | "Bora entrar?" ou "Seu e-mail" |
| Placeholder input | "seu@email.com" |
| Botão envio | "Enviar link mágico" |
| Mensagem sucesso | "Link enviado! Verifique seu e-mail (pode cair no spam)" |
| Erro conexão | "Oops... não conseguimos enviar. Tenta de novo?" |
| Logout | "Sair" |
| Redirecionamento | "Um segundo..." |

---

## 3️⃣ Tarefas de Validação

### ✅ Task 1: Testar fluxo de magic link (ponta a ponta)
**Descrição:** Validar envio, recebimento e processamento do link de autenticação.

**Pré-requisitos:**
- `.env.local` configurado com Supabase URL + ANON_KEY + SERVICE_ROLE_KEY + NEXT_PUBLIC_SITE_URL
- Projeto Next.js rodando (`npm run dev`)
- Supabase Dashboard acessível

**Passo a passo:**
1. [ ] Abra http://localhost:3000/login
2. [ ] Digite um e-mail de teste (ex: `teste@example.com`)
3. [ ] Clique "Enviar link mágico"
4. [ ] Verifique se:
   - [ ] Mensagem de sucesso aparece na tela
   - [ ] E-mail chega na caixa (ou spam) dentro de 1 minuto
5. [ ] Clique no link do e-mail
6. [ ] Verifique se:
   - [ ] Browser redireciona automaticamente para `/admin`
   - [ ] URL mostra `/admin` (não `/auth/callback`)
7. [ ] Abra o DevTools (F12) → Application → Cookies
   - [ ] Procure por cookies `sb-` (supabase session)
   - [ ] Deve ter pelo menos 2 cookies: `sb-[project]-auth-token` e `sb-[project]-auth-token-code-verifier`

**Sucesso:** Você está em `/admin` e os cookies de sessão existem.

---

### ✅ Task 2: Validar proteção de rotas (middleware)
**Descrição:** Verificar redirecionamentos corretos entre áreas públicas e protegidas.

**Pré-requisitos:**
- Estar logado (completou Task 1) — caso contrário, refaça o login

**Passo a passo:**

**Cenário A: Deslogado**
1. [ ] Abra DevTools → Application → Cookies
2. [ ] Delete os cookies `sb-*` (simular deslogado)
3. [ ] Refresque a página ou acesse http://localhost:3000/admin
4. [ ] Verifique se:
   - [ ] Redirecionou para `/login`
   - [ ] Parâmetro `redirect=/admin` na URL (para voltar depois)
5. [ ] Tente acessar `/app`
6. [ ] Verifique se:
   - [ ] Redirecionou para `/login`
   - [ ] Parâmetro `redirect=/app` na URL

**Cenário B: Logado, tenta `/login` novamente**
1. [ ] Faça login novamente (Task 1)
2. [ ] Acesse http://localhost:3000/login
3. [ ] Verifique se:
   - [ ] Redirecionou automaticamente para `/admin`
   - [ ] Não vê o formulário de login

**Cenário C: Páginas públicas funcionam**
1. [ ] Delete os cookies `sb-*` novamente (deslogado)
2. [ ] Acesse http://localhost:3000 (home)
3. [ ] Verifique se:
   - [ ] Carrega a página sem redirecionar
   - [ ] Não tenta forçar login

**Sucesso:** Middleware funciona em 3 cenários.

---

### ✅ Task 3: Validar logout
**Descrição:** Verificar se logout limpa sessão e força novo login.

**Pré-requisitos:**
- Estar logado no `/admin`

**Passo a passo:**
1. [ ] No painel admin, procure pelo botão "Logout" ou "Sair" (canto superior direito)
2. [ ] Clique nele
3. [ ] Verifique se:
   - [ ] Página redireciona para `/login`
   - [ ] Campo de e-mail está vazio (formulário limpo)
4. [ ] Abra DevTools → Application → Cookies
5. [ ] Verifique se:
   - [ ] Cookies `sb-*` foram deletados (não existem mais)
6. [ ] Tente acessar `/admin` sem refazer login
7. [ ] Verifique se:
   - [ ] Redireciona para `/login` (não consegue forçar entrada)

**Sucesso:** Logout funciona completamente.

---

### ✅ Task 4: Testar refresh de token (opcional, avançado)
**Descrição:** Validar que sessão expira e é renovada automaticamente.

**Pré-requisitos:**
- Estar logado

**Notas:**
- Supabase renova tokens automaticamente antes de expirarem (padrão ~24h)
- Essa task é mais para documentação — requer esperar várias horas ou mockar tempo

**Passo a passo:**
1. [ ] Está logado e em `/admin`
2. [ ] Deixe a aba aberta por 2+ horas (ou simule tempo passando no DevTools)
3. [ ] Interaja com a página (refresque, clique em um botão)
4. [ ] Verifique se:
   - [ ] Continua funcionando (não é forçado fazer logout)
   - [ ] Cookies `sb-*` foram atualizados (timestamps novos)

**Sucesso:** Sessão é renovada automaticamente.

---

### ✅ Task 5: Verificar integração com Admin Panel
**Descrição:** Confirmar que após login, usuário vê o painel admin e pode gerenciar grupos.

**Pré-requisitos:**
- Completou Task 1 (login funcional)

**Passo a passo:**
1. [ ] Faça login (Task 1)
2. [ ] Está em `/admin`
3. [ ] Verifique se:
   - [ ] Vê um formulário "Criar Grupo" (se é primeira vez)
   - [ ] Ou vê "Seu Grupo" com membros (se já criou)
4. [ ] Se vê "Criar Grupo":
   - [ ] Digite um nome (ex: "Grupo de Teste")
   - [ ] Clique "Criar"
   - [ ] Verifique se grupo foi criado e você é admin
5. [ ] Se vê grupo já criado:
   - [ ] Verifique badge/indicador "Admin" perto do seu nome
   - [ ] Botões de ação devem estar visíveis (Adicionar Membro, Sincronizar, Draft, etc.)

**Sucesso:** Admin panel funciona e está integrado com auth.

---

## 4️⃣ Checklist Técnico

- [ ] **Segurança**
  - [ ] API keys (API_FOOTBALL_KEY, SUPABASE_SERVICE_ROLE_KEY) **nunca** aparecem no DevTools → Network
  - [ ] `user.id` é validado em cada Server Action (não confia em formData)
  - [ ] RLS está ativo: query sem filtro de user.id falha (teste em DevTools Console)

- [ ] **Código**
  - [ ] `middleware.ts` redireciona corretamente para `/login` e `/admin`
  - [ ] `/auth/callback/route.ts` trata erro de code inválido
  - [ ] `/api/auth/logout/route.ts` limpa cookies
  - [ ] Server Actions usam `createActionClient()` para validar sessão

- [ ] **Environment**
  - [ ] `.env.local` tem: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`
  - [ ] Supabase URL de callback configurada: `http://localhost:3000/auth/callback` (dev) + `https://seu-dominio.com/auth/callback` (prod)

- [ ] **UX**
  - [ ] Textos em português claro e informal
  - [ ] Cores seguem tema (background cinza-escuro, acento verde-limão)
  - [ ] Erros são claros e actionáveis

---

## 5️⃣ Notas

### Troubleshooting comum

**E-mail não chega:**
- Verifique spam
- Confirme Email Provider ativo em Supabase → Authentication → Providers
- Verifique logs em Supabase → Authentication → Logs

**Erro "auth_failed" após clicar link:**
- URL de callback incorreta no Supabase
- `NEXT_PUBLIC_SITE_URL` incorreta no `.env.local`

**Middleware não redireciona:**
- Limpe cookies e refresque (Ctrl+Shift+R)
- Verifique se matcher em `middleware.ts` inclui o path

---

## 6️⃣ Próximos Passos

Após validar Semana 1:
→ **Semana 2:** Criar Grupo + Adicionar Membros (aprofundar UI do admin panel)

