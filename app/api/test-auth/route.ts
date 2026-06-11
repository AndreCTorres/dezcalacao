// app/api/test-auth/route.ts
// Endpoint de teste APENAS para desenvolvimento local
// Simula o fluxo de autenticação sem e-mail real

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // ⚠️ APENAS PARA DESENVOLVIMENTO LOCAL
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  const { email } = await request.json()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  }

  try {
    // Usar admin API para criar/verificar usuário
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log('[Test Auth] Email:', email)

    // 1. Listar usuários para checar se existe
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      console.error('[Test] Erro ao listar:', listError)
      return NextResponse.json({ error: listError.message }, { status: 400 })
    }

    let userId = users?.find((u: any) => u.email === email)?.id

    console.log('[Test] Usuário existe?', !!userId)

    // 2. Se não existe, criar
    if (!userId) {
      console.log('[Test] Criando novo usuário...')
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: 'TempPassword123!',
        email_confirm: true,
      })

      if (createError) {
        console.error('[Test] Erro ao criar:', createError)
        return NextResponse.json({ error: createError.message }, { status: 400 })
      }

      userId = newUser.user?.id
      console.log('[Test] ✓ Usuário criado:', userId)
    }

    // 3. Gerar um link de acesso (magic link simulado)
    const { data: signInData, error: signInError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (signInError) {
      console.error('[Test] Erro ao gerar link:', signInError)
      return NextResponse.json({ error: signInError.message }, { status: 400 })
    }

    console.log('[Test] ✓ Link gerado')
    console.log('[Test] Action link:', signInData?.properties?.action_link)

    // 4. Retornar o link (em produção, seria enviado por e-mail)
    return NextResponse.json({
      success: true,
      message: 'Link de teste gerado',
      testLink: signInData?.properties?.action_link,
      redirectUrl: '/admin',
    })
  } catch (error) {
    console.error('[Test] Erro geral:', error)
    return NextResponse.json(
      { error: 'Erro ao processar: ' + String(error) },
      { status: 500 }
    )
  }
}


