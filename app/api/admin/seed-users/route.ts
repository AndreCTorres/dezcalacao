// app/api/admin/seed-users/route.ts
// Endpoint para criar usuários de teste + admin
// POST /api/admin/seed-users
// Body: { groupId: string }

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const USERS = [
  { email: 'andrevitor17@yahoo.com.br', password: 'admin', displayName: 'André', role: 'admin' },
  { email: 'lucas@dezcalacao.local', password: 'lucas', displayName: 'Lucas', role: 'player' },
  { email: 'danyel@dezcalacao.local', password: 'danyel', displayName: 'Danyel', role: 'player' },
  { email: 'gombas@dezcalacao.local', password: 'gombas', displayName: 'Gombas', role: 'player' },
  { email: 'joaolucas@dezcalacao.local', password: 'joaolucas', displayName: 'João Lucas', role: 'player' },
  { email: 'andre@dezcalacao.local', password: 'andre', displayName: 'André', role: 'player' },
  { email: 'pedro@dezcalacao.local', password: 'pedro', displayName: 'Pedro', role: 'player' },
  { email: 'pontes@dezcalacao.local', password: 'pontes', displayName: 'Pontes', role: 'player' },
]

export async function POST(request: Request) {
  try {
    const { groupId } = await request.json()

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: 'Informe groupId no body' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Faltam variáveis do Supabase' },
        { status: 500 }
      )
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const results = {
      created: [] as { email: string; password: string; displayName: string }[],
      errors: [] as { email: string; error: string }[],
    }

    // 1. Criar usuários no Auth
    console.log('[Seed Users] Criando usuários...')

    for (const user of USERS) {
      try {
        console.log(`[Seed Users] Criando ${user.email}...`)

        // Criar no Auth
        const { data: authUser, error: authError } = await admin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Confirma o email automaticamente
          user_metadata: {
            display_name: user.displayName,
          },
        })

        if (authError || !authUser.user) {
          throw new Error(authError?.message || 'Erro ao criar usuário no Auth')
        }

        const userId = authUser.user.id
        console.log(`[Seed Users] ✓ Auth criado: ${userId}`)

        // 2. Criar profile
        const { error: profileError } = await admin
          .from('profiles')
          .upsert(
            {
              id: userId,
              display_name: user.displayName,
            },
            { onConflict: 'id' }
          )

        if (profileError) {
          throw new Error(`Erro ao criar profile: ${profileError.message}`)
        }

        console.log(`[Seed Users] ✓ Profile criado`)

        // 3. Adicionar como membro do grupo
        const { error: memberError } = await admin
          .from('group_members')
          .insert({
            group_id: groupId,
            profile_id: userId,
            display_name: user.displayName,
            role: user.role,
            status: 'joined',
            joined_at: new Date().toISOString(),
          })

        if (memberError) {
          throw new Error(`Erro ao adicionar membro: ${memberError.message}`)
        }

        console.log(`[Seed Users] ✓ Membro adicionado ao grupo`)

        results.created.push({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
        })
      } catch (error: any) {
        console.error(`[Seed Users] ✗ Erro com ${user.email}:`, error.message)
        results.errors.push({
          email: user.email,
          error: error.message,
        })
      }
    }

    console.log('[Seed Users] ========================================')
    console.log(`[Seed Users] Criados: ${results.created.length}`)
    console.log(`[Seed Users] Erros: ${results.errors.length}`)
    console.log('[Seed Users] ========================================')

    return NextResponse.json({
      success: results.errors.length === 0,
      created: results.created,
      errors: results.errors,
      message: `${results.created.length}/${USERS.length} usuários criados`,
    })
  } catch (error: any) {
    console.error('[Seed Users] Erro geral:', error.message)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
