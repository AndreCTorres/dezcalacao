'use client'

// app/auth/processing/page.tsx
// Página client-side para capturar o access_token do hash fragment.
//
// O Supabase no fluxo implícito retorna o token no hash (#access_token=...),
// que só é acessível no browser — não no servidor. O route.ts em /auth/callback
// redireciona para cá quando não encontra um ?code= na URL.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthProcessingPage() {
  const router = useRouter()
  const [mensagem, setMensagem] = useState('Autenticando...')

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function processarHash() {
      // Lê o hash da URL (ex: #access_token=...&refresh_token=...&type=magiclink)
      const hash = window.location.hash
      console.log('[Processing] Hash presente:', !!hash)

      if (!hash) {
        console.log('[Processing] Sem hash na URL')
        router.replace('/login?error=auth_failed')
        return
      }

      // Extrai os parâmetros do hash (remove o # inicial)
      const params = new URLSearchParams(hash.slice(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const tipo = params.get('type')

      console.log('[Processing] Tipo:', tipo)
      console.log('[Processing] Access token presente:', !!accessToken)
      console.log('[Processing] Refresh token presente:', !!refreshToken)

      if (!accessToken || !refreshToken) {
        console.error('[Processing] Tokens ausentes no hash')
        setMensagem('Falha na autenticação.')
        router.replace('/login?error=auth_failed')
        return
      }

      // Define a sessão com os tokens recebidos
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error || !data.session) {
        console.error('[Processing] Erro ao setar sessão:', error?.message)
        setMensagem('Falha na autenticação.')
        router.replace('/login?error=auth_failed')
        return
      }

      console.log('[Processing] ✓ Sessão criada para:', data.session.user.email)
      setMensagem('Login feito! Redirecionando...')

      // Verificar se o usuário é admin de algum grupo
      // para redirecionar para o lugar certo
      const { data: adminGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('admin_id', data.session.user.id)
        .maybeSingle()

      if (adminGroup) {
        router.replace('/admin')
      } else {
        router.replace('/app')
      }
    }

    processarHash()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-lime-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">{mensagem}</p>
      </div>
    </div>
  )
}
