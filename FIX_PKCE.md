# 🔧 Correção do PKCE Error

## 🐛 Problema Identificado

**Erro:** `AuthPKCECodeVerifierMissingError` / `pkce_code_verifier_not_found`

**Causa raiz:** O cliente Supabase usado na Server Action (`signInWithEmail`) tinha handlers de cookie com `try/catch` que **silenciavam erros**. Quando tentava gravar o `pkce_code_verifier` em cookie, o erro era capturado silenciosamente e o cookie não era salvo. Resultado: quando o callback tentava fazer `exchangeCodeForSession`, o verifier estava faltando.

---

## ✅ Solução Aplicada

### **1. Criado `createActionClient()` em `lib/supabase-server.ts`**

Novo helper específico para **Server Actions** que:
- ✅ **Remove o try/catch** dos handlers de cookie
- ✅ Permite que cookies sejam gravados (Server Actions conseguem escrever)
- ✅ Salva o `pkce_code_verifier` corretamente

**Diferença entre os clientes:**

| Cliente | Uso | Escreve Cookies? |
|---------|-----|------------------|
| `createClient()` | Server Components | ❌ Não (try/catch silencia) |
| `createActionClient()` | Server Actions | ✅ Sim (sem try/catch) |
| Route Handler inline | Route Handlers | ✅ Sim (handlers diretos) |

### **2. Atualizado `app/login/actions.ts`**

Mudou de `createClient()` para `createActionClient()`:
```typescript
const supabase = createActionClient() // <-- Mudança aqui
```

### **3. Adicionados logs detalhados**

**No login (`app/login/actions.ts`):**
```
[Login] Enviando magic link para: usuario@email.com
[Login] URL de callback configurada: http://localhost:3000/auth/callback
[Login] Usando createActionClient para gravar cookie PKCE...
[Login] ✓ Magic link enviado com sucesso
[Login] ✓ Cookie PKCE deve ter sido gravado
```

**No callback (`app/auth/callback/route.ts`):**
```
[Callback] Recebendo callback de autenticação
[Callback] Code presente: true
[Callback] Cookies PKCE encontrados: SIM
[Callback] Cookies PKCE: [ 'sb-xxxxx-auth-token-code-verifier' ]
[Callback] Trocando code por sessão...
[Callback] ✓ Sessão criada com sucesso
[Callback] Redirecionando para: /admin
```

---

## 🧪 Como testar

1. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

2. **Acesse o login:**
   ```
   http://localhost:3000/login
   ```

3. **Digite seu e-mail e envie**

4. **Observe o terminal** - deve mostrar:
   ```
   [Login] Usando createActionClient para gravar cookie PKCE...
   [Login] ✓ Cookie PKCE deve ter sido gravado
   ```

5. **Abra o DevTools do navegador** (F12):
   - Vá em **Application** → **Cookies** → `http://localhost:3000`
   - Você deve ver um cookie como: `sb-htepcmnsvhidapbchlgl-auth-token-code-verifier`
   - ✅ **Se esse cookie existir, o PKCE está funcionando!**

6. **Clique no link do e-mail**

7. **Observe o terminal novamente:**
   ```
   [Callback] Cookies PKCE encontrados: SIM
   [Callback] ✓ Sessão criada com sucesso
   [Callback] Redirecionando para: /admin
   ```

8. **Você será redirecionado para `/admin` automaticamente** ✅

---

## 🔍 Troubleshooting

### Se o erro PKCE ainda aparecer:

1. **Verifique se o cookie foi gravado:**
   - Abra DevTools → Application → Cookies
   - Procure por `sb-*-auth-token-code-verifier`
   - Se **não existir**, o problema é na gravação do cookie

2. **Verifique os logs do login:**
   - Se não aparecer `[Login] ✓ Cookie PKCE deve ter sido gravado`
   - Pode haver um erro sendo lançado na Server Action

3. **Limpe cookies antigos:**
   - Apague todos os cookies de `localhost:3000`
   - Tente novamente

4. **Verifique o browser:**
   - Alguns navegadores/extensões bloqueiam cookies third-party
   - Tente em modo anônimo

### Se nada funcionar → Solução 2 (Stateless)

Se o problema persistir, podemos implementar o **fluxo stateless** com `token_hash`:
- ✅ Não depende de cookies entre requests
- ✅ Usa `verifyOtp()` com token do e-mail
- ✅ Mais robusto para ambientes com restrições de cookies

---

## 📚 Referências

- [Supabase PKCE Flow](https://supabase.com/docs/guides/auth/server-side/pkce-flow)
- [@supabase/ssr Documentation](https://github.com/supabase/auth-helpers)
- [Next.js Server Actions & Cookies](https://nextjs.org/docs/app/api-reference/functions/cookies)

---

## 📊 Por que isso aconteceu?

O padrão recomendado do `@supabase/ssr` é usar `try/catch` nos handlers de cookie para Server Components, porque eles são **read-only**. Porém:

- ✅ **Server Components** → read-only → precisa do try/catch
- ✅ **Server Actions** → pode escrever → NÃO deve ter try/catch
- ✅ **Route Handlers** → pode escrever → NÃO deve ter try/catch

Agora temos **dois clientes** que cobrem todos os casos de uso corretamente! 🎉
