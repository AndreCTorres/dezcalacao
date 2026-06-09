# ✅ Passo 3: Adicionar e Listar Membros - Implementado!

## 🎯 O que foi implementado

Funcionalidade completa de adicionar e listar membros no painel do grupo em `/admin`, seguindo o Passo 3 do GUIA-tela1-grupo.md.

---

## 📁 Arquivos criados/modificados

### **Criados:**
1. ✅ `app/admin/add-member-form.tsx` - Formulário Client Component
   - Campo nome (obrigatório)
   - Campo e-mail (opcional)
   - Validação client-side
   - Feedback visual (loading, sucesso, erro)
   - Limpa formulário após adicionar

### **Modificados:**
2. ✅ `app/admin/actions.ts` - Adicionada `addMember()` Server Action
   - Valida usuário autenticado
   - **SEGURANÇA:** Verifica que usuário é admin do grupo
   - Valida nome e e-mail
   - Verifica duplicação de nomes
   - Insere membro com `profile_id: null` e `status: 'invited'`
   
3. ✅ `app/admin/group-panel.tsx` - Integração do formulário
   - Lista de membros melhorada (scroll, contador)
   - Formulário inline no card de membros
   - Botão "Iniciar draft" habilitado quando tem 2+ membros
   - Checklist atualizado dinamicamente

---

## 🔒 Segurança (Service Role)

A action `addMember()` segue o modelo de segurança estabelecido:

```typescript
// 1. Validar usuário
const { data: { user } } = await supabase.auth.getUser()

// 2. VERIFICAR que o usuário É admin do grupo
const { data: group } = await admin
  .from('groups')
  .select('id')
  .eq('id', groupId)           // Grupo solicitado
  .eq('admin_id', user.id)     // ← FILTRO: user.id é admin
  .single()

if (!group) {
  return { error: 'Sem permissão' }  // Não é admin ou grupo não existe
}

// 3. Inserir membro (já validamos permissão)
await admin.from('group_members').insert({
  group_id: groupId,      // ← Seguro: validamos que user.id é admin
  display_name,
  invite_email,
  profile_id: null,       // Convidado sem conta
  status: 'invited',
})
```

**Por que é seguro:**
- ✅ Valida `user.id` no servidor
- ✅ Filtra grupo por `admin_id = user.id`
- ✅ Se query retornar 0 rows → não é admin → nega
- ✅ `groupId` vem do cliente, mas validamos ownership
- ✅ Não confia em nenhum outro dado do cliente para escopo

---

## 🎨 UI Implementada

### **Card de Membros:**
- Título com contador: "Membros (3)"
- Lista com scroll (max-height: 24rem)
- Cada membro mostra:
  - Nome
  - Badge "Admin" (se role = 'admin')
  - Status: "Ativo" (verde-limão) ou "Convidado" (cinza)

### **Formulário "Adicionar membro":**
- Aparece apenas para admin (dentro do card de membros)
- Campos:
  - **Nome** (obrigatório, text input)
  - **E-mail** (opcional, email input)
  - Hint: "O e-mail será usado futuramente para convidar"
- Feedback:
  - Sucesso: banner verde-limão "Membro adicionado com sucesso!"
  - Erro: banner vermelho com mensagem
  - Loading: botão desabilitado "Adicionando..."
- Limpa formulário automaticamente após sucesso

### **Melhorias na UX:**
- Botão "Iniciar draft" só aparece com 2+ membros
- Primeiro item do checklist marca-se quando tem 2+ membros
- Contador de membros no título do card

---

## 🧪 Como testar

### **1. Acesse o painel do grupo**
```bash
npm run dev
```

Acesse `http://localhost:3000/admin`

### **2. Adicione um membro**

No card "Membros", preencha:
- Nome: "João Silva"
- E-mail: "joao@email.com"
- Clique em "Adicionar membro"

**Resultado esperado:**
- ✅ Banner verde "Membro adicionado com sucesso!"
- ✅ Lista atualiza **sem reload** mostrando "João Silva"
- ✅ Status: "Convidado" (cinza)
- ✅ Formulário limpa automaticamente
- ✅ Contador atualiza: "Membros (2)"

### **3. Adicione outro membro**

- Nome: "Maria Santos"
- E-mail: (deixe vazio)
- Clique em "Adicionar membro"

**Resultado esperado:**
- ✅ Membro adicionado sem e-mail
- ✅ Lista mostra "Maria Santos"
- ✅ Contador: "Membros (3)"

### **4. Teste validações**

#### **Nome vazio:**
- Deixe nome vazio
- Clique em "Adicionar"
- ✅ Navegador mostra validação HTML5 "Por favor, preencha este campo"

#### **E-mail inválido:**
- Nome: "Pedro"
- E-mail: "pedro@invalido"
- ✅ Banner vermelho "E-mail inválido"

#### **Nome duplicado:**
- Nome: "João Silva" (já existe)
- ✅ Banner vermelho "Já existe um membro com esse nome no grupo"

### **5. Verifique no Supabase**

**Table Editor → group_members:**
```
Deve ter 3 linhas:
1. Você (profile_id = seu UUID, status = 'joined', role = 'admin')
2. João Silva (profile_id = null, status = 'invited', role = 'player', invite_email = 'joao@email.com')
3. Maria Santos (profile_id = null, status = 'invited', role = 'player', invite_email = null)
```

### **6. Botão "Iniciar draft"**

Com 2+ membros, o botão "Iniciar draft" deve aparecer (verde-limão) no card "Draft".

---

## 🔄 Como a atualização sem reload funciona

```typescript
// 1. Usuário submete formulário
handleSubmit() → addMember(formData)

// 2. Server Action processa
addMember() {
  // Valida, insere no banco
  await admin.from('group_members').insert(...)
  
  // IMPORTANTE: revalida o cache do Next.js
  revalidatePath('/admin')
  
  return { success: true }
}

// 3. Next.js invalida cache da rota /admin
// 4. Server Component re-executa automaticamente
// 5. Lista de membros é re-renderizada com novos dados
// 6. UI atualiza sem full page reload!
```

**Magia:** `revalidatePath('/admin')` + React Server Components = atualização automática

---

## 🐛 Troubleshooting

### Erro: "Grupo não encontrado ou você não tem permissão"
**Causa:** O `groupId` não corresponde a um grupo que você administra.

**Solução:**
- Verifique que você criou o grupo
- Veja no Supabase se `groups.admin_id = seu user.id`

### Membro não aparece na lista após adicionar
**Causa:** `revalidatePath` pode não estar funcionando.

**Solução:**
1. Recarregue a página manualmente (F5)
2. Se aparecer → problema temporário
3. Se não aparecer → veja logs do servidor

### Formulário não limpa após adicionar
**Causa:** `e.currentTarget.reset()` pode ter falhado.

**Solução:**
- Recarregue a página
- Membro foi adicionado (verifique no Supabase)

### Erro de validação de e-mail não aparece
**Causa:** Regex pode não estar funcionando.

**Solução:**
- Use um e-mail válido por enquanto
- Verifique console.error no servidor

---

## 📊 Estrutura de Dados

### **group_members após adicionar 2 membros:**

| id | group_id | profile_id | display_name | invite_email | role | status |
|----|----------|------------|--------------|--------------|------|--------|
| uuid1 | group-uuid | your-uuid | andrectorres17 | null | admin | joined |
| uuid2 | group-uuid | **null** | João Silva | joao@email.com | player | **invited** |
| uuid3 | group-uuid | **null** | Maria Santos | null | player | **invited** |

**Pontos importantes:**
- ✅ `profile_id = null` para membros convidados
- ✅ `status = 'invited'` indica que ainda não tem conta
- ✅ `role = 'player'` por padrão (admin é exceção)
- ✅ `invite_email` é opcional

---

## 🎯 Próximos passos

Com o Passo 3 completo:

### **✅ Implementado:**
1. Login e autenticação
2. Criar grupo
3. **Adicionar e listar membros** ← Você está aqui

### **🔜 Próximos passos (futuros):**
4. Sistema de convite por link (Passo 4 - opcional)
5. Sincronizar jogadores da API-Football
6. Tela de draft do admin (atribuir jogadores)
7. Tela de rodadas e cálculo de pontuação

---

## 📚 Referências

- BRIEF.md - Regras de negócio
- GUIA-tela1-grupo.md - Passo a passo
- SERVICE_ROLE_APPROACH.md - Modelo de segurança
- supabase/schema.sql - Estrutura do banco

---

**Status: ✅ Funcionando!**

Você pode agora adicionar quantos membros quiser ao grupo, e quando tiver 2+, pode iniciar o draft! 🎉
