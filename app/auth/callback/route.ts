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

  console.log('[Callback] URL completa:', request.url)
  console.log('[Callback] Params:', {
    code: !!code,
    token: !!searchParams.get('token'),
    type: searchParams.get('type'),
  })

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options })
          })
        },
      },
    }
  )

  // Fluxo 1: OTP com code (magic link padrão)
  if (code) {
    console.log('[Callback] Processando OTP com code...')
    try {
      const { error, data } = await supabase.auth.exchangeCodeForSession(code)

      if (!error && data.session) {
        console.log('[Callback] ✓ Sessão criada para:', data.session.user.email)
        // Redirecionar para /app por padrão — /admin redireciona participantes de volta
        // e /app agora auto-vincula convites pendentes
        return NextResponse.redirect(`${origin}${next}`)
      }

      if (error) {
        console.error('[Callback] ✗ Erro:', error.message)
      }
    } catch (err) {
      console.error('[Callback] ✗ Exceção:', err)
    }
  }

  // Fluxo 2: Fluxo implícito — o Supabase redireciona com #access_token no hash.
  // O servidor não consegue ler o hash (não é enviado pelo browser),
  // então redirecionamos para uma página client-side que lê e processa.
  console.log('[Callback] Nenhum code encontrado — pode ser fluxo implícito com hash.')
  console.log('[Callback] Redirecionando para /auth/processing para tratamento client-side...')

  return NextResponse.redirect(`${origin}/auth/processing`)
}


