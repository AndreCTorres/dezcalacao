'use client'

// app/admin/rodadas/round-form.tsx
// Formulário para criar nova rodada

import { useState } from 'react'
import { createRound } from './actions'

type RoundFormProps = {
  groupId: string
}

export function RoundForm({ groupId }: RoundFormProps) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const res = await createRound(groupId, name, date ? new Date(date).toISOString() : undefined)

    if (res.success) {
      setSuccess(true)
      setName('')
      setDate('')
      setTimeout(() => setSuccess(false), 3000)
    } else {
      setError(res.error)
    }

    setLoading(false)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-lg font-bold text-white mb-4">Nova Rodada</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
            Nome da Rodada *
          </label>
          <input
            id="name"
            type="text"
            placeholder="Ex: Rodada 1, Oitavas, Semifinal..."
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={loading}
            required
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent disabled:opacity-50"
          />
        </div>

        {/* Data */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-2">
            Data (opcional)
          </label>
          <input
            id="date"
            type="datetime-local"
            value={date}
            onChange={e => setDate(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent disabled:opacity-50"
          />
        </div>

        {/* Erro */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 text-sm">
            {error}
          </div>
        )}

        {/* Sucesso */}
        {success && (
          <div className="p-3 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20 text-sm">
            ✓ Rodada criada com sucesso!
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-2 px-4 bg-lime-400 hover:bg-lime-500 text-gray-900 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Criando...' : '➕ Criar Rodada'}
        </button>
      </form>
    </div>
  )
}
