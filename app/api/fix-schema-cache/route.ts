// app/api/fix-schema-cache/route.ts
// Forçar recarga do schema cache do Supabase
// Problema: Supabase cacheou estrutura antiga de 'players' sem as colunas age, nationality, photo_url

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    console.log('\n========================================')
    console.log('[Fix Cache] Recarregando schema cache do Supabase')
    console.log('========================================\n')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Faltam variáveis de ambiente do Supabase')
    }

    const admin = createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'public' },
    })

    // Request 1: Query simples pra forçar refresh da introspection
    console.log('[Fix Cache] Request 1: Testando SELECT simples...')
    const { data: testData, error: testError } = await admin
      .from('players')
      .select('id, name') // Só as colunas que sempre existiram
      .limit(1)

    if (testError) {
      throw new Error(`Erro no SELECT simples: ${testError.message}`)
    }
    console.log('[Fix Cache] ✓ SELECT simples OK')

    // Request 2: Query com as colunas "novas" pra testar se o cache foi recarregado
    console.log('[Fix Cache] Request 2: Testando SELECT com colunas "novas"...')
    const { data: fullData, error: fullError } = await admin
      .from('players')
      .select('id, name, age, photo_url, nationality')
      .limit(1)

    if (fullError) {
      console.error('[Fix Cache] ✗ ERRO ao acessar colunas:', fullError.message)
      return NextResponse.json(
        {
          success: false,
          message: 'Schema cache ainda desatualizado. Tente novamente em 5 minutos.',
          error: fullError.message,
          recommendation: 'Se persistir, regenere as API keys no Supabase Dashboard > Settings > API',
        },
        { status: 500 }
      )
    }

    console.log('[Fix Cache] ✓ Colunas acessíveis OK')
    console.log('[Fix Cache] ========================================')
    console.log('[Fix Cache] ✓ SCHEMA CACHE RECARREGADO COM SUCESSO')
    console.log('[Fix Cache] ========================================\n')

    return NextResponse.json({
      success: true,
      message: 'Schema cache recarregado. Rode syncPlayers() novamente.',
      detail: {
        basicColumns: testData?.length || 0,
        fullColumns: fullData?.length || 0,
      },
    })
  } catch (error: any) {
    console.error('[Fix Cache] ❌ Erro:', error.message)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
