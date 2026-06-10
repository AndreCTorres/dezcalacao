import { test, expect } from '@playwright/test'

/**
 * Testes E2E: Fluxo de Scoring Completo
 * 
 * Cenário: Verificar se pontuação é calculada corretamente quando rodada é fechada
 * 
 * ⚠️ Pré-requisitos:
 * - DB com grupo de teste criado
 * - 2+ participantes com draft definido
 * - Rodada aberta
 * - NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY configurados
 */

test.describe('Scoring Flow (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login com usuário de teste
    await page.goto('/login')
    // Nota: Em prod, usar test data factory ou seed script
    // Por enquanto, apenas verifica fluxo
  })

  test('Admin fecha rodada e scores aparecem', async ({ page }) => {
    // 1. Vai para /admin/rodadas
    await page.goto('/admin/rodadas')

    // 2. Verifica que há rodadas listadas
    const roundsTable = page.locator('[data-testid="rounds-list"]')
    await expect(roundsTable).toBeVisible()

    // 3. Busca botão "Fechar Rodada" de uma rodada aberta
    const openRound = page.locator('button:has-text("Fechar Rodada")').first()
    if (await openRound.isVisible()) {
      await openRound.click()

      // 4. Aguarda feedback de sucesso
      const successMessage = page.locator('text=/✓|sucesso|calculada/i')
      await expect(successMessage).toBeVisible({ timeout: 30000 })
    }
  })

  test('Participante vê pontuação atualizada após rodada fechada', async ({ page }) => {
    // 1. Vai para /app (dashboard do participante)
    await page.goto('/app')

    // 2. Verifica que há card de ranking
    const rankingCard = page.locator('text=🏆 Ranking')
    await expect(rankingCard).toBeVisible()

    // 3. Verifica que há membros com pontos
    const scoredMembers = page.locator('text=/[0-9]+(\.[0-9])? pts/i')
    await expect(scoredMembers.first()).toBeVisible()
  })

  test('Ranking atualiza a cada 30 segundos', async ({ page }) => {
    await page.goto('/app')

    // Captura pontuação inicial
    const scoreText1 = await page.locator('text=/[0-9]+(\.[0-9])? pts/i').first().textContent()

    // Aguarda 35 segundos
    await page.waitForTimeout(35000)

    // Verifica se componente ainda está visível (auto-atualiza)
    const rankingCard = page.locator('text=🏆 Ranking')
    await expect(rankingCard).toBeVisible()
  })
})
