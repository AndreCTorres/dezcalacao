// middleware.ts
// Middleware para refresh de sessão e proteção de rotas.
// Usa API moderna getAll/setAll do @supabase/ssr.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Criar response que será modificada pelo Supabase
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh da sessão se necessário
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('[Middleware] Path:', request.nextUrl.pathname)
  console.log('[Middleware] User:', user?.email || 'não autenticado')

  // Se está tentando acessar rotas protegidas sem estar logado
  if (!user && (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/app'))) {
    console.log('[Middleware] ✗ Acesso negado - redirecionando para /login')
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Se está logado e tenta acessar /login, redirecionar para /app
  // (página /app ou /admin farão a verificação de role apropriada)
  if (user && request.nextUrl.pathname === '/login') {
    console.log('[Middleware] ✓ Já autenticado - redirecionando para /app')
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/app'
    return NextResponse.redirect(redirectUrl)
  }

  console.log('[Middleware] ✓ Permitindo acesso')
  
  // IMPORTANTE: Retornar supabaseResponse que tem os cookies atualizados
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Files with extensions (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
