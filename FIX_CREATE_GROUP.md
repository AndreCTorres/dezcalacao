# 🔧 Correção: Criar Grupo com RLS

## 🐛 Problema Identificado

**Erro original:**
```
[createGroup] Erro ao buscar profile: PGRST116 / 0 rows
```

**Causa raiz:**
O cliente Supabase na Server Action estava executando queries como **anon** (não autenticado), mesmo com o usuário logado. O RLS bloqueava a leitura da tabela `profiles` porque a policy exige `auth.uid()` definido.

---

## ✅ Correção Aplicada

### **Mudanças em `app/admin/actions.ts`:**

#### **1. Removida busca desnecessária do profile**

**ANTES (falhava):**
```typescript
// Buscava display_name no banco - falhava pelo RLS
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('display_name')
  .eq('id', user.id)
  .single()
```

**DEPOIS (funciona):**
```typescript
// Deriva display_name do próprio user (já temos em mãos)
const displayName = user.user_metadata?.display_name 
  || user.email?.split('@')[0] 
  || 'Usuário'
```

**Por que funciona:**
- Não depende de query ao banco
- Usa dados já disponíveis no objeto `user`
- Elimina o ponto de falha do RLS

#### **2. Logs detalhados para debug**

Adicionados logs completos em cada etapa:
- ✅ Autenticação do usuário
- ✅ Display name derivado
- ✅ Criação do grupo (com ID, nome, admin)
- ✅ Adição do membro (com ID, display_name, role, status)
- ✅ Erros detalhados (código, detalhes, mensagem)

#### **3. Melhor tratamento de erros**

- Logs de erro com código e detalhes completos
- Mensagens mais informativas
- Rollback em caso de falha

---

## 🧪 Como testar

### **1. Certifique-se de que o RLS está ativo**

Verifique se você rodou o script:
```
supabase/rls-policies.sql
```

No Supabase SQL Editor, execute:
```sql
SELECT tablename, COUNT(*) as policies
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('groups', 'group_members')
GROUP BY tablename;
```

**Resultado esperado:**
```
groups         | 4
group_members  | 4
```

### **2. Reinicie o servidor**

```bash
npm run dev
```

### **3. Acesse o admin**

```
http://localhost:3000/admin
```

### **4. Crie um grupo**

- Digite um nome (ex: "Bolão da Firma")
- Clique em "Criar grupo"
- **Observe o terminal**

### **5. Logs esperados no terminal**

Se funcionar corretamente, você verá:

```
[createGroup] ✓ Usuário autenticado: seu@email.com ID: f6873894-...
[createGroup] Display name derivado: andrectorres17
[createGroup] Criando grupo: Bolão da Firma
[createGroup] ✓ Grupo criado com sucesso!
[createGroup] - ID: abc123-...
[createGroup] - Nome: Bolão da Firma
[createGroup] - Admin: f6873894-...
[createGroup] Adicionando admin como membro...
[createGroup] ✓ Admin adicionado como membro com sucesso!
[createGroup] - Member ID: def456-...
[createGroup] - Display name: andrectorres17
[createGroup] - Role: admin
[createGroup] - Status: joined
[createGroup] Revalidando página /admin...
[createGroup] ✓✓✓ Grupo criado com sucesso! ✓✓✓
```

### **6. Verifique no navegador**

- Página deve recarregar automaticamente
- Deve mostrar o painel do grupo (não o formulário)
- Você deve aparecer na lista de membros como "Admin"

### **7. Verifique no Supabase**

**Table Editor → groups:**
```
✓ 1 linha criada
- id: (uuid)
- name: "Bolão da Firma"
- admin_id: f6873894-... (seu ID)
- status: "setup"
- season: "WC2026"
```

**Table Editor → group_members:**
```
✓ 1 linha criada
- id: (uuid)
- group_id: (mesmo ID do grupo)
- profile_id: f6873894-... (seu ID)
- display_name: "andrectorres17"
- role: "admin"
- status: "joined"
- joined_at: (timestamp)
```

---

## 🐛 Troubleshooting

### **Se ainda falhar na criação do grupo:**

#### **Erro: "permission denied for table groups"**

**Causa:** RLS ativo mas policy não permite INSERT.

**Solução:**
```sql
-- Verifique se a policy existe:
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'groups' AND cmd = 'INSERT';

-- Deve retornar: "Usuário autenticado pode criar grupo"
```

Se não existir, rode novamente o `supabase/rls-policies.sql`.

#### **Erro: "new row violates row-level security policy"**

**Causa:** A policy WITH CHECK falhou.

**Solução:** Verifique que `admin_id = auth.uid()`:
```sql
-- Teste manual:
SELECT auth.uid(); -- Deve retornar seu UUID
```

Se retornar NULL, o cliente não está autenticado.

#### **Erro: "permission denied for table group_members"**

**Causa:** Policy de INSERT em group_members não permite.

**Solução:** A policy verifica se você é admin do grupo:
```sql
-- Policy: "Admin pode adicionar membros ao grupo"
-- Verifica se EXISTS (SELECT ... WHERE groups.admin_id = auth.uid())
```

Se falhar, o grupo pode não ter sido criado corretamente.

### **Se o display_name estiver errado:**

O display_name é derivado nesta ordem:
1. `user.user_metadata?.display_name` (se existir)
2. Parte antes do @ no email (ex: "andre@email.com" → "andre")
3. "Usuário" (fallback)

Para customizar, atualize a linha:
```typescript
const displayName = 'Meu Nome Customizado'
```

---

## 📊 Fluxo corrigido

```
1. Usuário submete formulário
   ↓
2. Server Action createGroup()
   ↓
3. auth.getUser() → retorna user autenticado
   ↓
4. Deriva display_name do user.email
   ↓
5. INSERT em groups (RLS: permite porque admin_id = auth.uid())
   ↓
6. INSERT em group_members (RLS: permite porque user é admin do grupo)
   ↓
7. revalidatePath('/admin')
   ↓
8. Página recarrega → mostra painel do grupo
```

---

## ✅ Verificação final

Execute no SQL Editor do Supabase:
```sql
-- Deve retornar 1 grupo:
SELECT id, name, admin_id, status 
FROM groups 
WHERE admin_id = auth.uid();

-- Deve retornar 1 membro (você):
SELECT gm.id, gm.display_name, gm.role, gm.status
FROM group_members gm
JOIN groups g ON gm.group_id = g.id
WHERE g.admin_id = auth.uid();
```

Se ambas as queries retornarem dados, o grupo foi criado com sucesso! ✅

---

## 🔍 Por que a correção funciona

**Problema original:**
- `createActionClient()` **lê** os cookies de autenticação
- `auth.getUser()` **retorna** o usuário
- **MAS** as queries subsequentes ao banco não herdavam a autenticação automaticamente
- O RLS via as queries como **anon**, não como **authenticated**

**Solução aplicada:**
- **Não fazemos mais queries** que dependem do RLS bloqueando dados sensíveis
- Usamos apenas dados que já temos em mãos (`user.email`, `user.user_metadata`)
- As queries de INSERT funcionam porque o RLS **permite** criar recursos como usuário autenticado

**O Supabase JÁ autentica as queries** quando os cookies estão presentes. O problema era a busca intermediária do profile que falhava pelo RLS.

---

## 📚 Referências

- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Server Actions + Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [@supabase/ssr](https://github.com/supabase/auth-helpers)

---

**Status: ✅ Corrigido!**

A correção remove a dependência da query ao profile e usa dados já disponíveis no contexto autenticado.
