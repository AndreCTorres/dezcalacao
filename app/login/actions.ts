'use server'

// app/login/actions.ts
// Server Actions para autenticação.

import { createActionClient } from '@/lib/supabase-server'

export async function signInWithEmail(email: string) {
  // Usa createActionClient() para permitir escrita de cookies (necessário para PKCE)
  const supabase = createActionClient()

  // Constrói a URL de callback
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const callbackUrl = `${siteUrl}/auth/callback`

  console.log('[Login] Enviando magic link para:', email)
  console.log('[Login] URL de callback configurada:', callbackUrl)
  console.log('[Login] NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL)
  console.log('[Login] Usando createActionClient para gravar cookie PKCE...')

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
      },
    })

    if (error) {
      console.error('[Login] Erro ao enviar magic link:', error)
      return { error: 'Erro ao enviar e-mail. Tente novamente.' }
    }

    console.log('[Login] ✓ Magic link enviado com sucesso')
    console.log('[Login] ✓ Cookie PKCE deve ter sido gravado')
    return { success: true }
  } catch (error) {
    console.error('[Login] ✗ Exceção ao processar login:', error)
    return { error: 'Erro inesperado. Tente novamente.' }
  }
}
