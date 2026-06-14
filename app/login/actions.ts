'use server'

// app/login/actions.ts
// Server Actions para autenticação.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Login com e-mail + senha (para usuários locais tipo lucas@dezcalacao.local)
export async function signInWithPassword(email: string, password: string) {
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  console.log('[Login] Usando Supabase URL:', url?.substring(0, 30) + '...')
  console.log('[Login] Anon key presente:', !!anonKey)

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (e) {
            console.error('[Login] Erro ao setar cookie:', e)
          }
        },
      },
    }
  )

  console.log('[Login] Tentando login com senha para:', email)

  const { error, data } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[Login] Erro:', error.message)
    return { error: 'Usuário ou senha incorretos.' }
  }

  console.log('[Login] ✓ Login com senha OK:', data.user?.email)
  return { success: true }
}

// Login com magic link (para e-mails reais, ex: admin)
export async function signInWithEmail(email: string) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (e) {
            console.error('[Login] Erro ao setar cookie:', e)
          }
        },
      },
    }
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const callbackUrl = `${siteUrl}/auth/callback`

  console.log('[Login] Enviando magic link para:', email)

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl },
  })

  if (error) {
    console.error('[Login] Erro:', error.message)
    return { error: error.message || 'Erro ao enviar e-mail. Tente novamente.' }
  }

  return { success: true }
}
