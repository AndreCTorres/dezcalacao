// app/auth/confirm/route.ts
// Route Handler stateless para processar magic link com token_hash.
// Não depende de cookies PKCE - usa verifyOtp diretamente.

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') || 'email'
  const next = searchParams.get('next') ?? '/admin'

  console.log('[Confirm] Recebendo confirmação de magic link (stateless)')
  console.log('[Confirm] Token hash presente:', !!token_hash)
  console.log('[Confirm] Type:', type)
  console.log('[Confirm] Origin:', origin)

  if (token_hash) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    console.log('[Confirm] Verificando OTP com token_hash...')
    
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as 'email' | 'sms' | 'phone_change' | 'signup',
      token_hash,
    })

    if (!error && data.user) {
      console.log('[Confirm] ✓ Sessão criada com sucesso (stateless)')
      console.log('[Confirm] Usuário:', data.user.email)
      console.log('[Confirm] Redirecionando para:', next)
      
      // Redireciona para /admin após login bem-sucedido
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[Confirm] ✗ Erro ao verificar OTP:', error)
    if (error) {
      console.error('[Confirm] Tipo do erro:', error.name)
      console.error('[Confirm] Mensagem:', error.message)
      console.error('[Confirm] Status:', error.status)
    }
  } else {
    console.log('[Confirm] Token hash não fornecido na URL')
  }

  // Se chegou aqui, algo deu errado. Redireciona para login com mensagem de erro.
  console.log('[Confirm] Falha na autenticação, redirecionando para /login')
  return NextResponse.redirect(`${origin}/login?error=confirm_failed`)
}
