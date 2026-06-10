# 🧪 Guia de Testes - Dezcalação

## Overview

Projeto usa **Playwright** para E2E e **Playwright Test** para unit tests.

```
tests/
├── e2e/
│   ├── scoring.spec.ts     # Fluxo de pontuação
│   ├── substitutions.spec.ts # Fluxo de substituições
│   └── ranking.spec.ts     # Fluxo de ranking
└── unit/
    └── scoring.test.ts     # Lógica pura de scoring
```

---

## 🚀 Quick Start

### Instalação
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

## 📝 Testes E2E

### `scoring.spec.ts` - Fluxo de Pontuação

**O que testa:**
- Admin fecha rodada
- Ratings são sincronizados (API-Football)
- Scores aparecem para participantes
- Ranking atualiza

**Pré-requisitos:**
- Grupo com 2+ participantes criado
- Draft realizado
- Rodada aberta

**Executar:**
```bash
npm run test:e2e -- scoring
```

---

### `substitutions.spec.ts` - Fluxo de Substituições

**O que testa:**
- Participante faz substituição
- Validações são aplicadas
- Botão de reverter funciona
- Limite de subs é respeitado
- Validação de posição

**Casos cobertos:**
1. ✅ Fazer uma substituição válida
2. ✅ Navegar via botão da home
3. ✅ Respeitar limite
4. ✅ Reverter substituição
5. ✅ Não substituir com posição diferente

**Executar:**
```bash
npm run test:e2e -- substitutions
```

---

### `ranking.spec.ts` - Ranking em Tempo Real

**O que testa:**
- Medalhas aparecem para top 3
- Usuário atual destacado em verde
- Pontos totais exibidos
- Último score de cada rodada
- Acordeom de rodadas funciona
- Atualização automática 30s

**Casos cobertos:**
1. ✅ Medalhas (🥇🥈🥉)
2. ✅ Destaque do usuário atual
3. ✅ Exibição de pontos
4. ✅ Último score
5. ✅ Acordeom por rodada
6. ✅ Indicador de carregamento

**Executar:**
```bash
npm run test:e2e -- ranking
```

---

## 🔬 Testes Unitários

### `scoring.test.ts` - Lógica Pura de Scoring

**Funções testadas:**
- `effectiveRating()` - Retorna rating com validações
- `basePoints()` - Soma pontos dos 11 titulares
- `selecaoDaRodada()` - Retorna XI da rodada

**Casos cobertos:**

#### effectiveRating()
- ✅ Rating quando >= minMinutos
- ✅ Retorna 0 quando < minMinutos
- ✅ Retorna neutralRating quando null
- ✅ Retorna 0 quando não jogou

#### basePoints()
- ✅ Soma correta de 11 titulares
- ✅ Ignora reservas
- ✅ Retorna 0 quando sem ratings

#### selecaoDaRodada()
- ✅ Retorna XI (1 GK, 2 ZAG, 2 LAT, 3 MEI, 3 ATK)
- ✅ Ignora < 20 minutos
- ✅ Ignora rating null

**Executar:**
```bash
npm run test:unit
```

---

## 📊 Estrutura de um Teste E2E

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login, navigate, etc.
    await page.goto('/login')
  })

  test('descrição do que testa', async ({ page }) => {
    // 1. Ação
    await page.click('button:has-text("Click me")')

    // 2. Verificação
    await expect(page.locator('text=Success')).toBeVisible()
  })
})
```

---

## 🏃 Rodar Localmente

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
# Use script: supabase/seed-test-team.sql (criar se necessário)

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

## 🐛 Debugging

### Ver vídeo de teste
```bash
npx playwright show-trace trace.zip
```

### Rodas em headless=false (vê browser)
```bash
npm run test:debug
```

### Pausar em ponto específico
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

## 📋 Checklist Antes de Commit

- [ ] `npm test` passa sem erros
- [ ] `npm run build` sem warnings
- [ ] `npm run lint` sem issues
- [ ] Novos testes para features novas
- [ ] Testes removidos se feature removida
- [ ] Sem `test.only()` no código

---

## 🔗 Referências

- [Playwright Docs](https://playwright.dev)
- [Testing Library](https://testing-library.com)
- [Configuração](../playwright.config.ts)
- [Tests E2E](../tests/e2e)
- [Tests Unit](../tests/unit)

---

**Última atualização:** Junho 2026
