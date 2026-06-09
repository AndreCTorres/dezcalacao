// app/login/page.tsx
// Página de login com magic link (e-mail).
// UI em português, fundo escuro com acento verde-limão.

import { LoginForm } from './login-form'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; redirect?: string }
}) {
  let errorMessage = ''
  
  if (searchParams.error === 'auth_failed') {
    errorMessage = 'Falha na autenticação. Tente solicitar um novo link.'
  } else if (searchParams.error === 'confirm_failed') {
    errorMessage = 'Link inválido ou expirado. Solicite um novo.'
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-lime-400 mb-2">
            Dezcalação
          </h1>
          <p className="text-gray-400">
            Entre com seu e-mail para continuar
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 text-sm">
              {errorMessage}
            </div>
          )}
          <LoginForm />
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Você receberá um link mágico no seu e-mail para fazer login
        </p>
      </div>
    </div>
  )
}
