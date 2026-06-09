# ✅ Passo 2: Criar Grupo - Implementado!

## 🎯 O que foi implementado

Funcionalidade completa de criação de grupo no painel `/admin`, seguindo o Passo 2 do GUIA-tela1-grupo.md.

---

## 🔒 PRIMEIRO PASSO: Rodar o SQL de RLS no Supabase

**⚠️ OBRIGATÓRIO:** Antes de testar, você precisa rodar o script SQL no Supabase para ativar o Row Level Security.

### 📍 Como fazer:

1. **Acesse seu projeto no Supabase:**
   ```
   https://app.supabase.com/project/htepcmnsvhidapbchlgl
   ```

2. **Vá em SQL Editor:**
   - Menu lateral → SQL Editor
   - Clique em **"New query"**

3. **Cole o conteúdo do arquivo:**
   ```
   supabase/rls-policies.sql
   ```
   
4. **Execute o script:**
   - Clique em **"Run"** ou pressione `Ctrl+Enter`
   - Aguarde a confirmação de sucesso

5. **Verifique se as policies foram criadas:**
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   ORDER BY tablename, policyname;
   ```

### ✅ Resultado esperado:

Você deve ver policies criadas para as tabelas:
- `profiles` (2 policies)
- `groups` (4 policies)
- `group_members` (4 policies)
- `team_players` (4 policies)

---

## 📁 Arquivos criados

### **SQL:**
- ✅ `supabase/rls-policies.sql` - Policies de segurança (RLS)

### **Backend:**
- ✅ `app/admin/actions.ts` - Server Action `createGroup()`

### **Frontend:**
- ✅ `app/admin/create-group-form.tsx` - Formulário criar grupo (Client Component)
- ✅ `app/admin/group-panel.tsx` - Painel do grupo (Server Component)

### **Atualizado:**
- ✅ `app/admin/page.tsx` - Lógica de roteamento (sem grupo → formulário, com grupo → painel)

---

## 🎨 Funcionalidades implementadas

### **1. Verificação de grupo existente**
- Ao acessar `/admin`, verifica se o usuário já tem grupo
- Query no Supabase com RLS ativo (só vê grupos em que é membro)

### **2. Formulário "Criar grupo"** (quando não tem grupo)
- Campo: Nome do grupo (obrigatório)
- Validação de entrada
- Feedback visual (loading, erro)
- Design verde-limão sobre fundo escuro

### **3. Server Action `createGroup()`**
Fluxo completo:
1. ✅ Valida o nome do grupo
2. ✅ Verifica autenticação do usuário
3. ✅ Busca o `display_name` do profile
4. ✅ Insere em `groups` com `status='setup'`
5. ✅ Insere o admin em `group_members` com:
   - `role='admin'`
   - `status='joined'`
   - `joined_at=now()`
6. ✅ Revalida a página (`revalidatePath`)
7. ✅ Tratamento de erros com rollback

### **4. Painel do grupo** (quando já tem grupo)
Mostra:
- ✅ Nome do grupo
- ✅ Status (setup, drafting, active, finished)
- ✅ Temporada (WC2026)
- ✅ Indicação se é admin
- ✅ Lista de membros com:
  - Nome
  - Role (admin/player)
  - Status (joined/invited)
- ✅ Cards para:
  - Membros
  - Draft (link para `/admin/draft`)
  - Rodadas (link para `/admin/rodadas`)
- ✅ Próximos passos (orientação)
- ✅ Botão de logout

---

## 🧪 Como testar

### **1. Prepare o ambiente**

```bash
npm run dev
```

### **2. Acesse o admin**
```
http://localhost:3000/admin
```

### **3. Crie um grupo**

Você deve ver o formulário "Criar grupo":
- Digite um nome (ex: "Bolão da Firma")
- Clique em "Criar grupo"
- Aguarde o loading

### **4. Verifique o resultado**

Você deve:
- ✅ Ver o painel do grupo (não o formulário)
- ✅ Ver o nome do grupo no topo
- ✅ Ver "Você é admin" no header
- ✅ Ver você mesmo na lista de membros com badge "Admin" e status "Ativo"

### **5. Verifique no banco (Supabase)**

**Table Editor → groups:**
```
Deve ter 1 linha:
- name: "Bolão da Firma"
- admin_id: seu user id
- status: "setup"
- season: "WC2026"
```

**Table Editor → group_members:**
```
Deve ter 1 linha:
- group_id: id do grupo criado
- profile_id: seu user id
- display_name: seu nome
- role: "admin"
- status: "joined"
- joined_at: timestamp
```

### **6. Recarregue a página**
- Não deve mostrar o formulário de novo
- Deve continuar mostrando o painel do grupo

### **7. Teste o RLS**

Faça logout e login com outra conta:
- A nova conta NÃO deve ver o grupo anterior
- Deve ver o formulário de criar grupo
- Pode criar seu próprio grupo

---

## 🔒 Segurança (RLS)

As policies implementadas garantem:

### **Profiles:**
- ✅ Qualquer usuário autenticado pode ler todos os profiles (para ver nomes)
- ✅ Usuário só pode atualizar seu próprio profile

### **Groups:**
- ✅ Usuário só vê grupos em que é membro
- ✅ Qualquer usuário pode criar grupo (como admin)
- ✅ Apenas o admin pode atualizar/deletar o grupo

### **Group Members:**
- ✅ Usuário só vê membros dos grupos que participa
- ✅ Apenas admin pode adicionar/atualizar/remover membros
- ✅ Proteção contra acesso não autorizado

### **Team Players:**
- ✅ Usuário vê times dos grupos que participa
- ✅ Apenas admin pode fazer o draft (inserir/atualizar/deletar)

---

## 🐛 Troubleshooting

### Erro "permission denied for table groups"
- Você não rodou o script de RLS
- Rode `supabase/rls-policies.sql` no SQL Editor

### Erro "Erro ao criar grupo"
- Verifique se o usuário está autenticado
- Verifique os logs no terminal (console.log)
- Confirme que a tabela `profiles` tem seu usuário

### Não vejo o formulário nem o painel
- Verifique se está logado
- Limpe o cache do navegador
- Verifique os logs no terminal

### Criei grupo mas ainda vejo o formulário
- Verifique se a inserção foi bem-sucedida no Supabase
- Veja os logs no terminal
- Recarregue a página forçando cache (`Ctrl+Shift+R`)

---

## 📊 Fluxo de dados

```
1. Usuário acessa /admin
   ↓
2. Server Component busca grupos do usuário (RLS ativo)
   ↓
3a. Não tem grupo → Mostra CreateGroupForm
   ↓
4. Usuário preenche nome e submete
   ↓
5. Server Action createGroup():
   - Valida dados
   - Insere em groups
   - Insere em group_members
   - Revalida página
   ↓
6. Página recarrega automaticamente
   ↓
7. Agora tem grupo → Mostra GroupPanel
```

---

## 🎯 Próximos passos

Com o Passo 2 completo, você pode:

1. **Passo 3:** Adicionar e listar membros no grupo
2. **Passo 4:** Sistema de convite por link (opcional)
3. **Draft:** Tela de atribuir jogadores aos membros
4. **Rodadas:** Gerenciar rodadas e calcular pontuações

---

## 📚 Referências

- BRIEF.md - Regras de negócio
- GUIA-tela1-grupo.md - Passo a passo completo
- supabase/schema.sql - Estrutura do banco
- supabase/rls-policies.sql - Políticas de segurança

---

**Status: ✅ Pronto para usar!**

Após rodar o SQL de RLS, o sistema está completo e funcional para criar grupos.
