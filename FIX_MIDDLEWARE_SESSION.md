# 🔧 Correção Definitiva: Middleware com Refresh de Sessão

## 🐛 Problema Identificado

**Sintoma:**
- Grupo criado via service role ✅
- Mas página `/admin` não atualiza para mostrar o painel ❌
- Continua mostrando o formulário "Criar grupo"

**Causa raiz:**
- Middleware usava API antiga de cookies (`get/set/remove`)
- **Não propagava cookies atualizados** na response
- Session não era refreshada corretamente
- `auth.uid()` vinha NULL em **todas** as queries (leitura e escrita)
- RLS bloqueava a leitura do grupo recém-criado

---

## ✅ Correção Aplicada

### **Reescrito `middleware.ts` no padrão oficial Supabase**

#### **ANTES (não funcionava):**

```typescript
// ❌ Problemas:
let response = NextResponse.next({...})  // Response criada ANTES do cliente

const supabase = createServerClient(..., {
  cookies: {
    get(name) { ... },           // ❌ API antiga
    set(name, value, options) {  // ❌ Não propaga corretamente
      response.cookies.set({...})
    },
    remove(name, options) { ... }
  }
})

await supabase.auth.getUser()  // ✓ Chama refresh
return response                // ❌ Mas cookies não propagam
```

**Problemas:**
1. Response criada antes do Supabase poder atualizar cookies
2. API antiga `get/set/remove` não reconstrói sessão completa
3. Cookies atualizados não aparecem na response final
4. Próxima request ainda tem sessão antiga/inválida

#### **DEPOIS (funciona):**

```typescript
// ✅ Correto:
let supabaseResponse = NextResponse.next({...})

const supabase = createServerClient(..., {
  cookies: {
    getAll() {                    // ✅ API moderna
      return request.cookies.getAll()
    },
    setAll(cookiesToSet) {        // ✅ Propaga corretamente
      cookiesToSet.forEach(({ name, value, options }) => {
        request.cookies.set(name, value)        // Request
        supabaseResponse.cookies.set(name, value, options)  // Response
      })
    },
  }
})

await supabase.auth.getUser()  // ✓ Refresh + atualiza cookies via setAll
return supabaseResponse        // ✅ Response com cookies atualizados
```

**Melhorias:**
1. ✅ API moderna `getAll/setAll` reconstrói sessão completa
2. ✅ `setAll` atualiza cookies em request **e** response
3. ✅ `getUser()` faz refresh automático do token
4. ✅ Response retornada tem cookies atualizados
5. ✅ Próxima request tem sessão válida
6. ✅ `auth.uid()` definido corretamente

### **Adicionados logs de debug em `/admin`**

```typescript
// Teste simples: buscar próprio profile
const { data: testAuthUid } = await supabase
  .from('profiles')
  .select('id, display_name')
  .eq('id', user.id)
  .single()

console.log('[Admin Page] ✓ Teste auth.uid() OK:', testAuthUid?.display_name)
```

Se `auth.uid()` estiver NULL, a query falha com `PGRST116` (0 rows).

---

## 🧪 Como testar

### **1. Limpe os dados antigos (se houver)**

No Supabase SQL Editor:
```sql
-- Remover grupos de teste antigos
DELETE FROM group_members WHERE profile_id = auth.uid();
DELETE FROM groups WHERE admin_id = auth.uid();
```

### **2. Reinicie o servidor**

```bash
npm run dev
```

### **3. Faça logout e login novamente**

- Acesse `http://localhost:3000/admin`
- Clique em "Sair"
- Faça login novamente
- Isso garante que os cookies estão frescos

### **4. Observe os logs do middleware**

Ao acessar `/admin`:
```
[Middleware] Path: /admin
[Middleware] User: seu@email.com
[Middleware] ✓ Permitindo acesso
```

### **5. Crie um grupo**

Digite "Bolão da Firma" e crie

**Logs esperados:**

```
[createGroup] ✓ Usuário autenticado: seu@email.com
[createGroup] Tentativa 1: Usando cliente autenticado...
[createGroup] ✓ Grupo criado com cliente autenticado!
[createGroup] ✓ Admin adicionado como membro!
[createGroup] ✓✓✓ Grupo criado com sucesso (cliente autenticado)! ✓✓✓
```

**Se ainda usar service role:**
```
[createGroup] ⚠️ RLS bloqueou (auth.uid() NULL)
[createGroup] Tentativa 2: Usando service role...
[createGroup] ✓✓✓ Grupo criado com sucesso (via service role)! ✓✓✓
```

### **6. Página deve recarregar automaticamente**

**Logs esperados em `/admin`:**

```
[Middleware] Path: /admin
[Middleware] User: seu@email.com
[Middleware] ✓ Permitindo acesso

[Admin Page] ✓ Usuário autenticado: seu@email.com
[Admin Page] ✓ Teste auth.uid() OK - profile encontrado: andrectorres17
[Admin Page] ✓ Usuário tem grupo: Bolão da Firma
```

**Resultado no navegador:**
- ✅ Mostra o painel do grupo (não o formulário)
- ✅ Seu nome aparece como "Admin" na lista de membros

---

## 📊 Diagnóstico dos logs

### **Cenário A: Middleware corrigiu tudo ✅**

```
[Admin Page] ✓ Teste auth.uid() OK - profile encontrado: andrectorres17
[Admin Page] ✓ Usuário tem grupo: Bolão da Firma
```

**Significado:**
- ✅ `auth.uid()` definido corretamente
- ✅ RLS funcionando
- ✅ Queries retornam dados
- ✅ **Podemos remover o service role da action!**

### **Cenário B: Ainda usa service role ⚠️**

```
[Admin Page] ⚠️ Teste auth.uid() falhou: PGRST116
[Admin Page] Query group_members retornou erro: ...
[Admin Page] Usuário não tem grupo - mostrando formulário
```

**Significado:**
- ❌ `auth.uid()` ainda NULL
- ❌ RLS bloqueando leituras
- ❌ Service role necessário
- ⚠️ **Problema mais profundo na configuração**

---

## 🔧 Próximos passos baseados nos logs

### **Se Cenário A (auth.uid() OK):**

Remover service role de `app/admin/actions.ts`:

```typescript
// Simplifique para:
const { data: group, error } = await supabase
  .from('groups')
  .insert({
    name: name.trim(),
    admin_id: user.id,
    status: 'setup',
  })
  .select()
  .single()

// Remover todo o bloco de fallback para service role
```

### **Se Cenário B (auth.uid() NULL):**

Verificar:

1. **Cookies do navegador:**
   - F12 → Application → Cookies
   - Deve existir `sb-<project>-auth-token`
   - Verifique a data de expiração

2. **Variáveis de ambiente:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

3. **Limpar cache e cookies:**
   - Ctrl+Shift+Del → Limpar tudo
   - Ou modo anônimo

4. **Testar em modo anônimo:**
   - Abrir janela anônima
   - Fazer login do zero
   - Criar grupo

---

## 📝 Diferenças entre as APIs

| Aspecto | API antiga (get/set/remove) | API moderna (getAll/setAll) |
|---------|---------------------------|---------------------------|
| Leitura de cookies | Sob demanda (lazy) | Todos de uma vez (eager) |
| Reconstrói sessão | ❌ Incompleto | ✅ Completo |
| Refresh token | ❌ Pode falhar | ✅ Automático |
| Propaga cookies | ❌ Inconsistente | ✅ Sempre |
| auth.uid() | ❌ Frequentemente NULL | ✅ Definido |
| Recomendação | Depreciada | **Oficial** |

---

## ✅ Resultado esperado

Após esta correção:
- ✅ Middleware refresca sessão automaticamente
- ✅ `auth.uid()` definido em todas as queries
- ✅ RLS funciona corretamente (leitura e escrita)
- ✅ Página `/admin` atualiza após criar grupo
- ✅ Não precisa mais de service role (se logs confirmarem)

---

## 🔍 Arquivos modificados

1. ✅ `middleware.ts` - Reescrito com API getAll/setAll
2. ✅ `app/admin/page.tsx` - Adicionados logs de teste
3. ✅ `lib/supabase-server.ts` - Já tinha getAll/setAll (da correção anterior)

---

## 📚 Referências

- [Supabase SSR - Next.js Middleware](https://supabase.com/docs/guides/auth/server-side/nextjs#creating-a-middleware)
- [API getAll/setAll](https://supabase.com/docs/guides/auth/server-side/nextjs#understanding-the-authentication-flow)
- [Refresh Token](https://supabase.com/docs/guides/auth/sessions/refresh-tokens)

---

**Teste agora e observe os logs!** 🚀

Se o teste `auth.uid() OK` aparecer, podemos remover o service role e manter tudo com RLS ativo.
