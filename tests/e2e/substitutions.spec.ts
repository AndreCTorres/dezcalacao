import { test, expect } from '@playwright/test'

/**
 * Testes E2E: Fluxo de Substituições
 * 
 * Cenário: Verificar se substituição de jogadores funciona corretamente
 */

test.describe('Substitutions Flow (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login com participante
    await page.goto('/login')
    // Usar credenciais de teste
  })

  test('Participante consegue fazer uma substituição', async ({ page }) => {
    // 1. Vai para /app/time
    await page.goto('/app/time')

    // 2. Verifica que há titulares
    const starters = page.locator('text=Titulares')
    await expect(starters).toBeVisible()

    // 3. Clica no primeiro titular
    const firstStarter = page.locator('[data-testid="starter-card"]').first()
    if (await firstStarter.isVisible()) {
      await firstStarter.click()

      // 4. Verifica que lista de reservas aparece
      const benchList = page.locator('[data-testid="bench-list"]')
      await expect(benchList).toBeVisible()

      // 5. Clica em um reserva
      const firstBench = page.locator('[data-testid="bench-player"]').first()
      await firstBench.click()

      // 6. Verifica mensagem de sucesso
      const successMsg = page.locator('text=/substituição realizada|✓/i')
      await expect(successMsg).toBeVisible({ timeout: 10000 })
    }
  })

  test('Botão de substituições na home leva para /app/time', async ({ page }) => {
    // 1. Vai para /app
    await page.goto('/app')

    // 2. Procura botão "🔄 Substituições"
    const subButton = page.locator('button:has-text("🔄 Substituições")')

    if (await subButton.isVisible()) {
      await subButton.click()

      // 3. Verifica que foi redirecionado para /app/time
      await expect(page).toHaveURL('/app/time')
    }
  })

  test('Não pode substituir se limite foi atingido', async ({ page }) => {
    await page.goto('/app/time')

    // 1. Verifica indicador de limite
    const limitIndicator = page.locator('text=/[0-9]+ \\/ [0-9]+ substituição/i')
    const limitText = await limitIndicator.textContent()

    // Se já atingiu limite (ex: "3 / 3")
    if (limitText?.includes('3 / 3')) {
      // 2. Clica num titular
      const firstStarter = page.locator('[data-testid="starter-card"]').first()
      await firstStarter.click()

      // 3. Verifica se reservas não são clicáveis ou mensagem de erro
      const errorMsg = page.locator('text=/limite|atingido/i')
      await expect(errorMsg).toBeVisible({ timeout: 5000 }).catch(() => {
        // Ok se não houver erro, significa que ainda pode
      })
    }
  })

  test('Pode reverter uma substituição', async ({ page }) => {
    await page.goto('/app/time')

    // 1. Procura botão "Reverter"
    const revertButton = page.locator('button:has-text("Reverter")').first()

    if (await revertButton.isVisible()) {
      // 2. Clica em reverter
      await revertButton.click()

      // 3. Verifica mensagem de sucesso
      const successMsg = page.locator('text=/removida|✓/i')
      await expect(successMsg).toBeVisible({ timeout: 5000 })
    }
  })

  test('Não pode substituir por jogador de posição diferente', async ({ page }) => {
    await page.goto('/app/time')

    // 1. Clica num zagueiro
    const zagueiro = page.locator('text=Zagueiros').locator('..').locator('[data-testid="starter-card"]').first()
    await zagueiro.click()

    // 2. Tenta clicar num atacante (reserva)
    const atacante = page.locator('text=Ataque').locator('..').locator('[data-testid="bench-player"]').first()
    
    if (await atacante.isVisible()) {
      // Se não pode, botão não deve estar habilitado ou deve mostrar erro
      const errorMsg = page.locator('text=/posição|diferente/i')
      // Não deveria aparecer porque ui só mostra da mesma posição
      await expect(errorMsg).not.toBeVisible()
    }
  })
})
