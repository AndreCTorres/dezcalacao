'use client'

// app/admin/link-member-form.tsx
// Formulário inline para vincular um membro convidado a uma conta existente.

import { useState } from 'react'
import { linkMemberToEmail } from './actions'

type LinkMemberFormProps = {
  memberId: string
  memberName: string
}

export function LinkMemberForm({ memberId, memberName }: LinkMemberFormProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('memberId', memberId)
    formData.append('email', email)

    const result = await linkMemberToEmail(formData)

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
      setEmail('')
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast(result.message, 'success', 4000)
      }
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 rounded-full font-medium transition"
        style={{
          background: 'rgba(234,179,8,.1)',
          color: '#fbbf24',
          border: '1px solid rgba(234,179,8,.25)',
        }}
        title={`Vincular ${memberName} a uma conta`}
      >
        🔗
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="e-mail do usuário"
        required
        disabled={loading}
        autoFocus
        className="text-xs px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-400 w-40 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading || !email}
        className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded hover:bg-yellow-500/30 transition disabled:opacity-50"
      >
        {loading ? '...' : '✓'}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setError(null) }}
        className="text-xs px-2 py-1 text-gray-500 hover:text-gray-300 transition"
      >
        ✕
      </button>
      {error && (
        <span className="text-xs text-red-400 ml-1 max-w-48 truncate" title={error}>
          {error}
        </span>
      )}
    </form>
  )
}