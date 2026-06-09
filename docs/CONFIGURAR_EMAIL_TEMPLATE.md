# 📧 Configurar Template de E-mail no Supabase (Stateless)

## ⚠️ PASSO OBRIGATÓRIO

Para o fluxo stateless funcionar, você **PRECISA** editar o template de e-mail "Magic Link" no Supabase Dashboard para usar `{{ .TokenHash }}` em vez de `{{ .Token }}`.

---

## 📝 Passo a passo:

### 1. Acesse seu projeto no Supabase
```
https://app.supabase.com
```

### 2. Navegue até Email Templates
No menu lateral esquerdo:
```
Authentication → Email Templates
```

### 3. Selecione "Magic Link"
Clique no template chamado **"Magic Link"** (ou "Confirm signup" se for o primeiro login)

### 4. Localize o link no HTML
Procure por uma linha similar a uma destas:

**Opção A (link direto):**
```html
<a href="{{ .ConfirmationURL }}">Fazer login</a>
```

**Opção B (link customizado):**
```html
<a href="{{ .SiteURL }}/auth/callback?code={{ .Token }}">Fazer login</a>
```

### 5. Substitua pelo novo link stateless

**APAGUE** o link antigo e **COLE** este:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" style="display: inline-block; padding: 12px 24px; background-color: #bef264; color: #000000; text-decoration: none; border-radius: 6px; font-weight: bold;">
  Fazer login na Dezcalação
</a>
```

### 6. (Opcional) Template completo em português

Se quiser customizar todo o e-mail, aqui está um template completo:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #111827; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #111827; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1f2937; border-radius: 12px; padding: 40px; border: 1px solid #374151;">
          <tr>
            <td align="center">
              <h1 style="color: #bef264; margin: 0 0 16px 0; font-size: 32px;">
                Dezcalação
              </h1>
              <p style="color: #9ca3af; margin: 0 0 32px 0; font-size: 16px;">
                Seu link mágico chegou!
              </p>
              <p style="color: #d1d5db; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                Clique no botão abaixo para fazer login na sua conta:
              </p>
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" style="display: inline-block; padding: 14px 28px; background-color: #bef264; color: #000000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 0 0 24px 0;">
                Fazer login
              </a>
              <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5;">
                Este link expira em 1 hora. Se você não solicitou este e-mail, pode ignorá-lo com segurança.
              </p>
              <hr style="border: none; border-top: 1px solid #374151; margin: 32px 0;">
              <p style="color: #6b7280; margin: 0; font-size: 12px;">
                Ou copie e cole este link no seu navegador:<br>
                <span style="color: #9ca3af; word-break: break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### 7. Salve o template
Clique em **"Save"** ou **"Salvar"** no final da página.

---

## ✅ Verificação rápida

Antes de salvar, confirme que o link contém:

- ✅ `{{ .SiteURL }}` - URL base do site
- ✅ `/auth/confirm` - Nova rota stateless (não `/auth/callback`)
- ✅ `?token_hash={{ .TokenHash }}` - Token hash (não `.Token`)
- ✅ `&type=email` - Tipo de autenticação

**Exemplo de URL que o usuário receberá:**
```
http://localhost:3000/auth/confirm?token_hash=abc123xyz456&type=email
```

---

## 🧪 Como testar

1. **Salve o template** no Supabase Dashboard

2. **Solicite um novo magic link:**
   ```
   http://localhost:3000/login
   ```

3. **Verifique o e-mail recebido:**
   - Inspecione o código HTML (botão direito → "Ver código fonte")
   - O link deve apontar para `/auth/confirm?token_hash=...&type=email`
   - ✅ Se estiver correto, prossiga

4. **Clique no link do e-mail**

5. **Verifique o terminal do Next.js:**
   ```
   [Confirm] Recebendo confirmação de magic link (stateless)
   [Confirm] Token hash presente: true
   [Confirm] Type: email
   [Confirm] Verificando OTP com token_hash...
   [Confirm] ✓ Sessão criada com sucesso (stateless)
   [Confirm] Redirecionando para: /admin
   ```

6. **Você será redirecionado para `/admin`** ✅

---

## 🐛 Troubleshooting

### E-mail ainda aponta para `/auth/callback`
- Você salvou o template?
- Aguarde alguns minutos para o cache atualizar
- Solicite um **novo** magic link (não use links antigos)

### Link aponta para `/auth/confirm` mas ainda falha
- Verifique se usou `{{ .TokenHash }}` (com T e H maiúsculos)
- Verifique se adicionou `&type=email`
- Veja os logs no terminal do Next.js para detalhes do erro

### Erro "confirm_failed"
- O token pode ter expirado (validade: 1 hora)
- Solicite um novo magic link
- Verifique se o `NEXT_PUBLIC_SITE_URL` está correto no `.env.local`

---

## 📚 Variáveis disponíveis no template

O Supabase fornece estas variáveis para usar no template:

| Variável | Descrição | Usar? |
|----------|-----------|-------|
| `{{ .SiteURL }}` | URL base configurada | ✅ Sim |
| `{{ .TokenHash }}` | Hash do token (stateless) | ✅ Sim |
| `{{ .Token }}` | Code do PKCE (precisa cookie) | ❌ Não |
| `{{ .Email }}` | E-mail do usuário | ✅ Opcional |
| `{{ .ConfirmationURL }}` | URL padrão do Supabase | ❌ Não (queremos custom) |

---

## 🎯 Por que isso funciona?

**Fluxo antigo (PKCE com cookie):**
1. Login gera `code_verifier` → salva em cookie
2. E-mail tem `code`
3. Callback precisa do cookie + code
4. ❌ Cookie não estava sendo salvo

**Fluxo novo (Stateless):**
1. Login gera `token_hash`
2. E-mail tem `token_hash` diretamente na URL
3. Confirm usa só o `token_hash` da URL
4. ✅ Não depende de cookies!

---

## 📖 Referências

- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp)
