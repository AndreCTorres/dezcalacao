# ðŸ§ª Guia de Testes - DezcalaÃ§Ã£o

## Overview

Projeto usa **Playwright** para E2E e **Playwright Test** para unit tests.

```
tests/
â”œâ”€â”€ e2e/
â”‚   â”œâ”€â”€ scoring.spec.ts     # Fluxo de pontuaÃ§Ã£o
â”‚   â”œâ”€â”€ substitutions.spec.ts # Fluxo de substituiÃ§Ãµes
â”‚   â””â”€â”€ ranking.spec.ts     # Fluxo de ranking
â””â”€â”€ unit/
    â””â”€â”€ scoring.test.ts     # LÃ³gica pura de scoring
```

---

## ðŸš€ Quick Start

### InstalaÃ§Ã£o
```bash
npm install
```

### Rodar todos os testes
```bash
npm test
```

### Rodar apenas E2E
```bash
npm run test:e2e
```

### Rodar apenas Unit
```bash
npm run test:unit
```

### UI Interativa (Playwright Test UI)
```bash
npm run test:ui
```

### Debug (passo a passo)
```bash
npm run test:debug
```

---

## ðŸ“ Testes E2E

### `scoring.spec.ts` - Fluxo de PontuaÃ§Ã£o

**O que testa:**
- Admin fecha rodada
- Ratings sÃ£o sincronizados (API-Football)
- Scores aparecem para participantes
- Ranking atualiza

**PrÃ©-requisitos:**
- Grupo com 2+ participantes criado
- Draft realizado
- Rodada aberta

**Executar:**
```bash
npm run test:e2e -- scoring
```

---

### `substitutions.spec.ts` - Fluxo de SubstituiÃ§Ãµes

**O que testa:**
- Participante faz substituiÃ§Ã£o
- ValidaÃ§Ãµes sÃ£o aplicadas
- BotÃ£o de reverter funciona
- Limite de subs Ã© respeitado
- ValidaÃ§Ã£o de posiÃ§Ã£o

**Casos cobertos:**
1. âœ… Fazer uma substituiÃ§Ã£o vÃ¡lida
2. âœ… Navegar via botÃ£o da home
3. âœ… Respeitar limite
4. âœ… Reverter substituiÃ§Ã£o
5. âœ… NÃ£o substituir com posiÃ§Ã£o diferente

**Executar:**
```bash
npm run test:e2e -- substitutions
```

---

### `ranking.spec.ts` - Ranking em Tempo Real

**O que testa:**
- Medalhas aparecem para top 3
- UsuÃ¡rio atual destacado em verde
- Pontos totais exibidos
- Ãšltimo score de cada rodada
- Acordeom de rodadas funciona
- AtualizaÃ§Ã£o automÃ¡tica 30s

**Casos cobertos:**
1. âœ… Medalhas (ðŸ¥‡ðŸ¥ˆðŸ¥‰)
2. âœ… Destaque do usuÃ¡rio atual
3. âœ… ExibiÃ§Ã£o de pontos
4. âœ… Ãšltimo score
5. âœ… Acordeom por rodada
6. âœ… Indicador de carregamento

**Executar:**
```bash
npm run test:e2e -- ranking
```

---

## ðŸ”¬ Testes UnitÃ¡rios

### `scoring.test.ts` - LÃ³gica Pura de Scoring

**FunÃ§Ãµes testadas:**
- `effectiveRating()` - Retorna rating com validaÃ§Ãµes
- `basePoints()` - Soma pontos dos 11 titulares
- `selecaoDaRodada()` - Retorna XI da rodada

**Casos cobertos:**

#### effectiveRating()
- âœ… Rating quando >= minMinutos
- âœ… Retorna 0 quando < minMinutos
- âœ… Retorna neutralRating quando null
- âœ… Retorna 0 quando nÃ£o jogou

#### basePoints()
- âœ… Soma correta de 11 titulares
- âœ… Ignora reservas
- âœ… Retorna 0 quando sem ratings

#### selecaoDaRodada()
- âœ… Retorna XI (1 GK, 2 ZAG, 2 LAT, 3 MEI, 3 ATK)
- ? Conta notas independentemente dos minutos
- âœ… Ignora rating null

**Executar:**
```bash
npm run test:unit
```

---

## ðŸ“Š Estrutura de um Teste E2E

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login, navigate, etc.
    await page.goto('/login')
  })

  test('descriÃ§Ã£o do que testa', async ({ page }) => {
    // 1. AÃ§Ã£o
    await page.click('button:has-text("Click me")')

    // 2. VerificaÃ§Ã£o
    await expect(page.locator('text=Success')).toBeVisible()
  })
})
```

---

## ðŸƒ Rodar Localmente

### Setup do Banco de Teste

Antes de rodar E2E, configure uma rodada de teste:

```bash
# 1. Criar grupo de teste
supabase sql \
  'INSERT INTO groups (name, admin_id, season, status)
   VALUES ("Test Group", "user-id", "2026", "active")'

# 2. Criar membros de teste
supabase sql \
  'INSERT INTO group_members (group_id, profile_id, display_name, status)
   VALUES ("group-id", "user-id", "Test User", "joined")'

# 3. Criar draft de teste (16 jogadores)
# Use script: supabase/seed-test-team.sql (criar se necessÃ¡rio)

# 4. Criar rodada aberta
supabase sql \
  'INSERT INTO rounds (group_id, name, status)
   VALUES ("group-id", "Test Round 1", "open")'
```

### Rodar Dev Server + Testes

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Testes
npm test
```

---

## ðŸ› Debugging

### Ver vÃ­deo de teste
```bash
npx playwright show-trace trace.zip
```

### Rodas em headless=false (vÃª browser)
```bash
npm run test:debug
```

### Pausar em ponto especÃ­fico
```typescript
test('meu teste', async ({ page }) => {
  await page.pause() // Pausa aqui
  await page.click('button')
})
```

### Logs do navegador
```typescript
page.on('console', msg => console.log(msg.text()))
```

---

## ðŸ“‹ Checklist Antes de Commit

- [ ] `npm test` passa sem erros
- [ ] `npm run build` sem warnings
- [ ] `npm run lint` sem issues
- [ ] Novos testes para features novas
- [ ] Testes removidos se feature removida
- [ ] Sem `test.only()` no cÃ³digo

---

## ðŸ”— ReferÃªncias

- [Playwright Docs](https://playwright.dev)
- [Testing Library](https://testing-library.com)
- [ConfiguraÃ§Ã£o](../playwright.config.ts)
- [Tests E2E](../tests/e2e)
- [Tests Unit](../tests/unit)

---

**Ãšltima atualizaÃ§Ã£o:** Junho 2026
