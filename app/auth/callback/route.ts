// app/auth/callback/route.ts
// Route Handler para processar o callback do magic link.
// O Supabase redireciona para cá após o usuário clicar no link do e-mail.

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/admin'

  console.log('[Callback] Recebendo callback de autenticação')
  console.log('[Callback] Code presente:', !!code)
  console.log('[Callback] Origin:', origin)
  console.log('[Callback] URL completa:', request.url)

  if (code) {
    const cookieStore = cookies()
    
    // Log dos cookies presentes (para debug do PKCE)
    const allCookies = cookieStore.getAll()
    const pkceCookies = allCookies.filter(c => c.name.includes('pkce') || c.name.includes('code_verifier'))
    console.log('[Callback] Cookies PKCE encontrados:', pkceCookies.length > 0 ? 'SIM' : 'NÃO')
    if (pkceCookies.length > 0) {
      console.log('[Callback] Cookies PKCE:', pkceCookies.map(c => c.name))
    }
    
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

    console.log('[Callback] Trocando code por sessão...')
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      console.log('[Callback] ✓ Sessão criada com sucesso')
      console.log('[Callback] Redirecionando para:', next)
      // Redireciona para /admin após login bem-sucedido
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[Callback] ✗ Erro ao trocar code por sessão:', error)
    console.error('[Callback] Tipo do erro:', error.name)
    console.error('[Callback] Mensagem:', error.message)
  }

  // Se chegou aqui, algo deu errado. Redireciona para login com mensagem de erro.
  console.log('[Callback] Falha na autenticação, redirecionando para /login')
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
