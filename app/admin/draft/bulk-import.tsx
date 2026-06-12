'use client'

// app/admin/draft/bulk-import.tsx
// Formulário para importar lista de times (bulk import do draft feito externamente)

import { useState } from 'react'
import { bulkImportDraft } from './actions'

type BulkImportProps = {
  groupId: string
  members: any[]
  onSuccess?: () => void
}

export function BulkImport({ groupId, members, onSuccess }: BulkImportProps) {
  const [draftList, setDraftList] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await bulkImportDraft(groupId, draftList, members)

    if (res.success) {
      setSuccess(`✓ Draft importado! ${res.imported} atribuições registradas.`)
      setDraftList('')
      setTimeout(() => onSuccess?.(), 2000)
    } else {
      setError(res.error || 'Erro ao importar draft')
    }

    setLoading(false)
  }

  const exampleList = `Membro 1: Mbappé, Vinicius Jr, Rodri, Bellingham, Alaba, Lewandowski, Lautaro Martinez, Salah, Haaland, Kane, Bukayo Saka
Membro 2: Vinícius, Foden, Benzema, Van Dijk, Courtois, Gavi, Pedri, Benzema, Griezmann, Benzema, Benzema`

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-4">📋 Importar Draft (Bulk)</h2>

      {/* Instruções */}
      {showInstructions && (
        <div className="mb-4 p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
          <div className="flex justify-between items-start">
            <div className="text-sm text-blue-300">
              <p className="font-semibold mb-2">Como usar:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Faça o draft no TierMaker ou externamente</li>
                <li>Liste os jogadores de cada membro (um por linha)</li>
                <li>Formato: <code className="bg-gray-700 px-1 rounded">Membro: Jogador1, Jogador2, ...</code></li>
                <li>Cole a lista abaixo e clique em Importar</li>
              </ol>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="text-xs text-blue-400 hover:text-blue-300 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Textarea */}
        <div>
          <label htmlFor="draftList" className="block text-sm font-medium text-gray-300 mb-2">
            Lista de Jogadores por Membro
          </label>
          <textarea
            id="draftList"
            value={draftList}
            onChange={e => setDraftList(e.target.value)}
            placeholder="Exemplo:\nMembro 1: Mbappé, Vinicius Jr, Rodri, ...\nMembro 2: Kane, Saka, Mount, ..."
            disabled={loading}
            className="w-full h-48 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent disabled:opacity-50 resize-none"
          />
        </div>

        {/* Botão exemplo */}
        <button
          type="button"
          onClick={() => setDraftList(exampleList)}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-300 underline"
        >
          Usar exemplo
        </button>

        {/* Erros */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20 text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Sucesso */}
        {success && (
          <div className="p-3 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20 text-sm">
            {success}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !draftList.trim()}
          className="w-full py-2 px-4 bg-lime-400 hover:bg-lime-500 text-gray-900 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Importando...' : '📥 Importar Draft'}
        </button>
      </form>

      {/* Info de membros */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <p className="text-xs font-medium text-gray-400 mb-2">Membros do grupo:</p>
        <div className="space-y-1">
          {members.map((m: any) => (
            <p key={m.id} className="text-xs text-gray-500">
              • <span className="text-gray-300">{m.display_name}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
