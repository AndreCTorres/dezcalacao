'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getLocalUsername(email: string) {
  return email.split('@')[0]?.trim().toLowerCase() ?? ''
}

function createLoginClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (e) {
            console.error('[Auth] Erro ao setar cookie:', e)
          }
        },
      },
    }
  )
}

export async function signInWithPassword(email: string, password: string) {
  const cookieStore = await cookies()
  const supabase = createLoginClient(cookieStore)

  console.log('[Login] Tentando login com senha para:', email)

  const { error, data } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[Login] Erro:', error.message)
    return { error: 'Usuario ou senha incorretos.' }
  }

  console.log('[Login] Login com senha OK:', data.user?.email)

  return {
    success: true,
    mustChangePassword: getLocalUsername(email) === password.trim().toLowerCase(),
  }
}

export async function changeCurrentUserPassword(newPassword: string, confirmPassword: string) {
  const password = newPassword.trim()
  const confirmation = confirmPassword.trim()

  if (!password || !confirmation) {
    return { error: 'Preencha a nova senha e a confirmacao.' }
  }

  if (password !== confirmation) {
    return { error: 'As senhas nao conferem.' }
  }

  if (password.length < 6) {
    return { error: 'Use pelo menos 6 caracteres.' }
  }

  const cookieStore = await cookies()
  const supabase = createLoginClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: 'Sua sessao expirou. Entre novamente.' }
  }

  if (password.toLowerCase() === getLocalUsername(user.email)) {
    return { error: 'Escolha uma senha diferente da senha inicial.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('[ChangePassword] Erro:', error.message)
    return { error: 'Nao foi possivel alterar a senha agora.' }
  }

  return { success: true }
}
