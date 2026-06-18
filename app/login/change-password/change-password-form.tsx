'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { changeCurrentUserPassword } from '../actions'

export function ChangePasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await changeCurrentUserPassword(password, confirmPassword)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">
          Nova senha
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="new-password"
          className="w-full px-4 py-3 rounded-xl text-white outline-none disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(197,242,74,.18)' }}
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">
          Confirmar senha
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          autoComplete="new-password"
          className="w-full px-4 py-3 rounded-xl text-white outline-none disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(197,242,74,.18)' }}
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm text-red-300 border border-red-500/30 bg-red-500/10">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl font-bold transition disabled:opacity-50"
        style={{ background: '#c5f24a', color: '#0a0e0c' }}
      >
        {loading ? 'Salvando...' : 'Salvar nova senha'}
      </button>
    </form>
  )
}
