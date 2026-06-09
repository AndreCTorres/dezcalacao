# 🔧 Configuração do Supabase Dashboard

## ⚠️ PASSO OBRIGATÓRIO

Para o magic link funcionar corretamente, você **PRECISA** adicionar a URL de callback no Supabase Dashboard.

---

## 📝 Como configurar:

### 1. Acesse seu projeto no Supabase
Vá para: https://app.supabase.com

### 2. Navegue até Authentication
No menu lateral esquerdo, clique em:
**Authentication** → **URL Configuration**

### 3. Adicione a URL de callback
Na seção **Redirect URLs**, adicione:

```
http://localhost:3000/auth/callback
```

**IMPORTANTE:** 
- ✅ Use `http://localhost:3000` (porta 3000)
- ✅ Não coloque barra `/` no final
- ✅ Certifique-se de clicar em **"Add URL"** ou **"Save"**

### 4. (Opcional) Configure para produção
Quando for para produção, adicione também a URL de produção:

```
https://seudominio.com/auth/callback
```

---

## 🧪 Como testar se funcionou:

1. Pare e reinicie o servidor Next.js:
   ```bash
   npm run dev
   ```

2. Acesse `http://localhost:3000/login`

3. Digite seu e-mail e clique em "Enviar link mágico"

4. No terminal do Next.js, você verá logs como:
   ```
   [Login] Enviando magic link para: seu@email.com
   [Login] URL de callback configurada: http://localhost:3000/auth/callback
   ```

5. Verifique seu e-mail e clique no link

6. Você deve ver no terminal:
   ```
   [Callback] Recebendo callback de autenticação
   [Callback] Code presente: true
   [Callback] Trocando code por sessão...
   [Callback] ✓ Sessão criada com sucesso
   [Callback] Redirecionando para: /admin
   ```

7. Você será redirecionado automaticamente para `/admin` e verá seu e-mail na tela

---

## 🐛 Troubleshooting

### O link ainda me leva para `/?code=...` em vez de `/auth/callback`

**Causa:** O Supabase não aceitou a URL de callback.

**Solução:**
1. Verifique se você adicionou exatamente `http://localhost:3000/auth/callback`
2. Certifique-se de ter clicado em **"Save"** ou **"Add URL"**
3. Aguarde alguns segundos para o cache do Supabase atualizar
4. Tente solicitar um novo magic link

### Ainda não funciona?

**Verifique:**
1. O servidor Next.js está rodando na porta **3000**?
   - Se estiver na porta 3001, adicione também `http://localhost:3001/auth/callback`
2. A variável `NEXT_PUBLIC_SITE_URL` está no `.env.local`?
   - Deve estar: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
3. Você reiniciou o servidor após adicionar a variável?

---

## 📚 Documentação oficial

Para mais informações, consulte:
- [Supabase Auth - Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Auth - Email OTP](https://supabase.com/docs/guides/auth/auth-email)
