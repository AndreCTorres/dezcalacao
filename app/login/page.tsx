// app/login/page.tsx
// Página de login com usuário + senha.

import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>
}) {
  const params = await searchParams
  let errorMessage = ''
  
  if (params.error === 'auth_failed') {
    errorMessage = 'Falha na autenticação. Tente novamente.'
  } else if (params.error === 'confirm_failed') {
    errorMessage = 'Sessão inválida ou expirada. Faça login novamente.'
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0a0e0c' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="text-4xl font-black tracking-tight mb-3"
            style={{ fontFamily: 'Anton, sans-serif', textTransform: 'uppercase' }}
          >
            <span style={{ color: '#c5f24a' }}>DEZ</span>
            <span className="text-white">calação</span>
          </div>
          <p className="text-gray-400 text-sm">
            Copa do Mundo 2026 · Fantasy Draft
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl shadow-2xl p-8"
          style={{
            background: 'linear-gradient(160deg, #111b16, #0c1410)',
            border: '1px solid rgba(197,242,74,.14)',
          }}
        >
          {/* Instrução contextual */}
          <div
            className="mb-6 p-4 rounded-xl text-sm"
            style={{ background: 'rgba(197,242,74,.07)', border: '1px solid rgba(197,242,74,.15)' }}
          >
            <p className="text-gray-300 leading-relaxed">
              👋 Use o <span style={{ color: '#c5f24a' }} className="font-semibold">nome de usuário e senha que o André te passou</span>. Você vai entrar direto no seu time.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 text-sm">
              {errorMessage}
            </div>
          )}

          <LoginForm />
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#5d6661' }}>
          Use o usuário e a senha que o admin criou pra você.
        </p>
      </div>
    </div>
  )
}
