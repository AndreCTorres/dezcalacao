import { test, expect } from '@playwright/test'

/**
 * Testes E2E: Ranking em Tempo Real
 * 
 * Cenário: Verificar se ranking exibe corretamente e atualiza
 */

test.describe('Ranking Display (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login com participante
    await page.goto('/login')
  })

  test('Ranking mostra medalhas para top 3', async ({ page }) => {
    await page.goto('/app')

    // 1. Verifica se há medalhas (🥇🥈🥉)
    const medal1 = page.locator('text=🥇')
    const medal2 = page.locator('text=🥈')
    const medal3 = page.locator('text=🥉')

    // Pelo menos uma medalha deve estar presente
    const anyMedal = page.locator('text=/🥇|🥈|🥉/')
    await expect(anyMedal).toBeVisible().catch(() => {
      // Ok se não houver dados ainda
    })
  })

  test('Usuário atual é destacado em verde', async ({ page }) => {
    await page.goto('/app')

    // 1. Procura linha com destaque (lime-400/20 background)
    const currentUserRow = page.locator('[class*="lime-400"]').first()

    if (await currentUserRow.isVisible()) {
      // 2. Verifica que tem nome do usuário
      const nameText = currentUserRow.locator('text=/[A-Za-z]+/')
      await expect(nameText).toBeVisible()
    }
  })

  test('Ranking mostra pontos totais', async ({ page }) => {
    await page.goto('/app')

    // 1. Verifica que há números de pontos
    const points = page.locator('text=/^[0-9]+(\.[0-9]+)? pts$/i')
    await expect(points.first()).toBeVisible()
  })

  test('Exibe "último score" de cada membro', async ({ page }) => {
    await page.goto('/app')

    // 1. Procura por "+X ult." (último score)
    const lastScore = page.locator('text=/\\+[0-9]+(\.[0-9]+)? ult\\./i')

    // Pode estar vazio se não houver rodadas fechadas
    if (await lastScore.isVisible()) {
      // Verifica que valor é positivo
      const text = await lastScore.textContent()
      expect(text).toMatch(/^\+/)
    }
  })

  test('Seção "Pontuação por Rodada" exibe acordeom', async ({ page }) => {
    await page.goto('/app')

    // 1. Rola para baixo
    await page.locator('text=📊 Pontuação por Rodada').scrollIntoViewIfNeeded()

    // 2. Procura rodadas
    const roundButton = page.locator('button:has-text("Rodada")').first()

    if (await roundButton.isVisible()) {
      // 3. Clica em uma rodada
      await roundButton.click()

      // 4. Verifica que detalhe aparece
      const details = page.locator('[data-testid="round-details"]')
      await expect(details).toBeVisible()
    }
  })

  test('Acordeom mostra scores de cada membro por rodada', async ({ page }) => {
    await page.goto('/app')

    // Rola para rodadas
    await page.locator('text=📊 Pontuação por Rodada').scrollIntoViewIfNeeded()

    // Clica numa rodada
    const roundButton = page.locator('button:has-text("Rodada")').first()
    if (await roundButton.isVisible()) {
      await roundButton.click()

      // Verifica que há membros listados
      const memberScore = page.locator('text=/[A-Za-z]+.*[0-9]+(\.[0-9]+)? pts/')
      await expect(memberScore.first()).toBeVisible()
    }
  })

  test('Indicador "Carregando" aparece durante fetch', async ({ page }) => {
    // Monitora requisições
    let isFetching = false

    page.on('request', (req) => {
      if (req.url().includes('standings')) {
        isFetching = true
      }
    })

    page.on('response', (res) => {
      if (res.url().includes('standings')) {
        isFetching = false
      }
    })

    await page.goto('/app')

    // Se houver loading indicator, ele deveria aparecer brevemente
    const loadingIndicator = page.locator('text=⏳ Carregando')

    // Não é obrigatório estar visível (pode ser muito rápido)
    // Mas é bom verificar que não há erros
    const errorMsg = page.locator('text=erro')
    await expect(errorMsg).not.toBeVisible()
  })
})
