'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPassword, signInWithEmail } from './actions'

export function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Converte o "nome de usuário" (ex: "lucas") para o e-mail interno
  function resolveEmail(input: string): string {
    const val = input.trim().toLowerCase()
    // Se já tem @, usa como está
    if (val.includes('@')) return val
    // Caso contrário, assume domínio interno
    return `${val}@dezcalacao.local`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      setError('Preencha usuário e senha.')
      return
    }

    setLoading(true)
    setError('')

    const email = resolveEmail(username)
    const result = await signInWithPassword(email, password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Sucesso — redireciona para /app (participante) ou /admin (admin)
    router.push('/admin')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Usuário */}
      <div>
        <label
          htmlFor="username"
          className="block text-sm font-semibold mb-2"
          style={{ color: '#8b9690', fontFamily: 'Space Mono, monospace', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '11px' }}
        >
          Usuário
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          autoComplete="username"
          className="w-full px-4 py-3 rounded-xl text-white outline-none transition disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(197,242,74,.15)',
            fontFamily: 'Hanken Grotesk, sans-serif',
            fontSize: '16px',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(197,242,74,.5)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(197,242,74,.15)' }}
        />
      </div>

      {/* Senha */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-semibold mb-2"
          style={{ color: '#8b9690', fontFamily: 'Space Mono, monospace', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '11px' }}
        >
          Senha
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="current-password"
          className="w-full px-4 py-3 rounded-xl text-white outline-none transition disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(197,242,74,.15)',
            fontFamily: 'Hanken Grotesk, sans-serif',
            fontSize: '16px',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(197,242,74,.5)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(197,242,74,.15)' }}
        />
      </div>

      {/* Erro */}
      {error && (
        <div
          className="p-3 rounded-xl text-sm flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', color: '#f87171' }}
        >
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Botão */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl font-bold text-base transition disabled:opacity-50"
        style={{
          background: loading ? '#9bc23a' : '#c5f24a',
          color: '#0a0e0c',
          fontFamily: 'Hanken Grotesk, sans-serif',
          fontSize: '16px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin inline-block" />
            Entrando...
          </span>
        ) : (
          'Entrar →'
        )}
      </button>
    </form>
  )
}
