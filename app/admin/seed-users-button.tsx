'use client'

// app/admin/seed-users-button.tsx
// Botão para seed de usuários (admin only)

import { useState } from 'react'

type SeedUsersButtonProps = {
  groupId: string
}

export function SeedUsersButton({ groupId }: SeedUsersButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleClick = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/admin/seed-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuários')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
      >
        {loading ? '⏳ Criando usuários...' : '👥 Seed de Usuários'}
      </button>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-600 rounded-lg text-red-300 text-sm">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-900/30 border border-green-600 rounded-lg text-green-300 text-sm space-y-2">
          <strong>✓ {result.message}</strong>

          {result.created.length > 0 && (
            <div>
              <p className="font-semibold text-green-400 mt-2">Criados:</p>
              <pre className="bg-gray-900 p-2 rounded mt-1 text-xs overflow-x-auto">
                {result.created.map((u: any) => `${u.email} / ${u.password}`).join('\n')}
              </pre>
            </div>
          )}

          {result.errors.length > 0 && (
            <div>
              <p className="font-semibold text-red-400 mt-2">Erros:</p>
              <ul className="list-disc list-inside text-xs">
                {result.errors.map((e: any, i: number) => (
                  <li key={i}>
                    {e.email}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
