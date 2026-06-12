'use client'

// app/admin/draft/draft-interface.tsx
// Interface de draft: membros, busca de jogadores, times

import { useState, useEffect } from 'react'
import { getDraftState, searchPlayers, assignPlayerToMember, unassignPlayer, closeDraft } from './actions'
import { MemberLineup } from './member-lineup'
import { PlayerSearch } from './player-search'
import { BulkImport } from './bulk-import'
import type { Position } from '@/lib/types'

type GroupMember = {
  id: string
  display_name: string
  profile_id: string | null
  status: string
}

type Props = {
  groupId: string
  members: GroupMember[]
}

export function DraftInterface({ groupId, members }: Props) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || '')
  const [draftState, setDraftState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [closingDraft, setClosingDraft] = useState(false)

  // Load draft state initially
  useEffect(() => {
    loadDraftState()
  }, [])

  async function loadDraftState() {
    const res = await getDraftState(groupId)
    if (res.success && res.state) {
      setDraftState(res.state)
      setLoading(false)
    } else {
      setError(res.error || 'Erro ao carregar draft')
      setLoading(false)
    }
  }

  async function handlePlayerAssign(playerId: number, slot: 'starter' | 'bench', position: Position) {
    if (!selectedMemberId) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await assignPlayerToMember(groupId, selectedMemberId, playerId, slot, position)

    if (res.success) {
      setSuccess(`Jogador atribuído!`)
      await loadDraftState()
      setTimeout(() => setSuccess(null), 3000)
    } else {
      setError(res.error || 'Erro ao atribuir jogador')
    }

    setLoading(false)
  }

  async function handlePlayerRemove(teamPlayerId: string) {
    if (!window.confirm('Remover este jogador?')) return

    setLoading(true)
    setError(null)

    const res = await unassignPlayer(groupId, teamPlayerId)

    if (res.success) {
      await loadDraftState()
    } else {
      setError(res.error || 'Erro ao remover jogador')
    }

    setLoading(false)
  }

  async function handleCloseDraft() {
    if (!window.confirm('Tem certeza? O draft não poderá ser alterado depois.')) return

    setClosingDraft(true)
    setError(null)

    const res = await closeDraft(groupId)

    if (res.success) {
      setSuccess('Draft fechado! Grupo ativo.')
      await loadDraftState()
    } else {
      setError(res.error || 'Erro ao fechar draft')
    }

    setClosingDraft(false)
  }

  if (loading && !draftState) {
    return (
      <div className="text-center py-8">
        <div className="w-10 h-10 border-4 border-lime-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Carregando draft...</p>
      </div>
    )
  }

  if (!draftState || !selectedMemberId) {
    return <p className="text-red-400">Erro ao carregar estado do draft</p>
  }

  const selectedMember = draftState.members.find((m: any) => m.memberId === selectedMemberId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Members List */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">Membros</h2>
        <div className="space-y-2">
          {draftState.members.map((member: any) => (
            <button
              key={member.memberId}
              onClick={() => setSelectedMemberId(member.memberId)}
              className={`w-full text-left p-3 rounded-lg transition ${
                selectedMemberId === member.memberId
                  ? 'bg-lime-400/20 border border-lime-400 text-lime-400'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              <div className="font-medium">{member.memberName}</div>
              <div className="text-xs mt-1">
                {member.teamCount} / 16 jogadores
                {member.teamCount === 16 && <span className="ml-2 text-lime-400">✓</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Close Draft Button */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <button
            onClick={handleCloseDraft}
            disabled={closingDraft || !draftState.draftComplete}
            className="w-full py-2 px-4 bg-lime-400 hover:bg-lime-500 text-gray-900 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {closingDraft ? 'Fechando...' : 'Fechar Draft'}
          </button>
          {!draftState.draftComplete && (
            <p className="text-xs text-gray-500 mt-2">
              Completa todos os times para fechar o draft
            </p>
          )}
        </div>
      </div>

      {/* Center: Selected Member's Team */}
      {selectedMember && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <MemberLineup member={selectedMember} onRemovePlayer={handlePlayerRemove} loading={loading} />
        </div>
      )}

      {/* Right: Player Search */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <PlayerSearch groupId={groupId} onPlayerAssign={handlePlayerAssign} loading={loading} />
      </div>

      {/* Messages */}
      {error && (
        <div className="col-span-full p-4 rounded-lg bg-red-500/10 text-red-400 border border-red-400/20">
          {error}
        </div>
      )}

      {success && (
        <div className="col-span-full p-4 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20">
          {success}
        </div>
      )}

      {/* Bulk Import */}
      <div className="col-span-full">
        <BulkImport
          groupId={groupId}
          members={draftState.members.map((m: any) => ({ id: m.memberId, display_name: m.memberName }))}
          onSuccess={() => loadDraftState()}
        />
      </div>
    </div>
  )
}
