---
inclusion: manual
---

# 🛠️ Setup & Configuração — Dezcalação

> Guia de referência para configurar o ambiente do zero. Inclua com `#SETUP` quando precisar de contexto de onboarding.

---

## Variáveis de Ambiente

Configure o `.env.local` com:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
API_FOOTBALL_KEY=sua_chave_aqui
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Nunca exponha `API_FOOTBALL_KEY` e `SUPABASE_SERVICE_ROLE_KEY` no cliente.

---

## Banco de Dados (Supabase)

1. Crie um projeto em https://app.supabase.com
2. Rode `supabase/schema.sql` no **SQL Editor**
3. Rode as migrations em ordem: `supabase/migrations/001_*.sql`, `002_*.sql`, `003_*.sql`
4. Para tornar um usuário admin, use `supabase/make-andre-admin.sql` como referência

### Configurar Auth (Magic Link)
1. No Supabase Dashboard → **Authentication → URL Configuration**
2. Adicione a URL de redirect: `http://localhost:3000/auth/callback`
3. Confirme que o **Email Provider** está habilitado em **Authentication → Providers**

### Sincronizar Jogadores (48 seleções)
1. Faça login como admin em `/admin`
2. Clique em **"🔄 Sincronizar Jogadores"**
3. Aguarde ~2-3 minutos (faz ~150 requisições na API-Football)
4. Runs subsequentes são rápidas — times já sincronizados são pulados
5. Mapeamentos de nomes conhecidos já estão em `app/admin/actions.ts`:
   - `South Korea` → `Korea Republic`, `Czechia` → `Czech Republic`, etc.

Se uma seleção não resolver, insira manualmente na tabela `teams`:
```sql
INSERT INTO teams (id, name, country, api_name, national, season)
VALUES (XXX, 'Nome', 'País', 'Api-Nome', true, '2026');
```

---

## Rodando Localmente

```bash
npm install
npm run dev        # localhost:3000
npm run build      # Build de produção
```

Se ver o erro `Cannot find module './276.js'`, o cache do Next corrompeu. Solução:
```bash
# Apagar .next e rebuildar
Remove-Item -Recurse -Force .next
npm run build
npm run dev
```

---

## Login em Desenvolvimento (Sem Email)

O magic link não chega em dev local. Use o endpoint de teste:

```bash
# PowerShell
$r = Invoke-RestMethod -Uri "http://localhost:3000/api/test-auth" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"teste@example.com"}'
Start-Process $r.testLink
```

Ou via arquivo `test.http` no VS Code com a extensão REST Client.

---

## Deploy (Vercel + Supabase)

```bash
git push   # auto-deploy na Vercel
```

Para migrations em produção:
```bash
supabase migration up
supabase db push
```

---

## Troubleshooting Comum

| Problema | Solução |
|----------|---------|
| Email de magic link não chega | Use endpoint `/api/test-auth` (dev) ou cheque spam |
| `auth_failed` ao clicar no link | Confirme URL de callback no Supabase Dashboard |
| Seleções pendentes no sync | Insira ID manualmente na tabela `teams` |
| Limite API excedido | Plano free: ~100 req/dia. Aguarde 24h ou upgrade |
| `Cannot find module './276.js'` | Apague `.next/` e rebuilde |
| Times femininos na lista | Filtro `/[WU]\d*$/` está em `app/admin/actions.ts` |
