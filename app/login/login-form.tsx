'use client'

// app/login/login-form.tsx
// Formulário de login (Client Component para interatividade).

import { useState } from 'react'
import { signInWithEmail } from './actions'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      setMessage({ type: 'error', text: 'Por favor, insira um e-mail válido' })
      return
    }

    setLoading(true)
    setMessage(null)

    const result = await signInWithEmail(email)

    setLoading(false)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ 
        type: 'success', 
        text: 'Link enviado! Verifique seu e-mail para continuar.' 
      })
      setEmail('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          disabled={loading}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
          required
        />
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-lime-400/10 text-lime-400 border border-lime-400/20'
              : 'bg-red-500/10 text-red-400 border border-red-400/20'
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-lime-400 hover:bg-lime-500 text-gray-900 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-lime-400"
      >
        {loading ? 'Enviando...' : 'Enviar link mágico'}
      </button>
    </form>
  )
}
