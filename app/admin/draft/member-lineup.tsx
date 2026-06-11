'use client'

// app/admin/draft/member-lineup.tsx
// Exibe o time atual de um membro com opção de remover

import { POSITION_LABELS } from '@/lib/types'

type MemberLineupProps = {
  member: any // member state from getDraftState
  onRemovePlayer: (teamPlayerId: string) => void
  loading: boolean
}

export function MemberLineup({ member, onRemovePlayer, loading }: MemberLineupProps) {
  const starters = member.team.filter((tp: any) => tp.slot === 'starter')
  const bench = member.team.filter((tp: any) => tp.slot === 'bench')

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-1">{member.memberName}</h3>
        <div className="text-sm text-gray-400">
          {member.teamCount} / 16 jogadores
          {member.teamCount === 16 && <span className="ml-2 text-lime-400 font-semibold">✓ Completo</span>}
        </div>
      </div>

      {/* Titulares */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-lime-400 mb-2">
          Titulares ({starters.length} / 11)
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {starters.length === 0 ? (
            <p className="text-xs text-gray-500">Nenhum titular selecionado</p>
          ) : (
            starters.map((tp: any) => (
              <div
                key={tp.id}
                className="flex justify-between items-center p-2 bg-gray-700/50 rounded text-sm"
              >
                <div className="flex-1">
                  <div className="text-white font-medium">{tp.players.name}</div>
                  <div className="text-xs text-gray-400">
                    {tp.players.team_name} • {tp.players.number || '—'} • {tp.position_slot}
                  </div>
                </div>
                <button
                  onClick={() => onRemovePlayer(tp.id)}
                  disabled={loading}
                  className="ml-2 px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded transition disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reservas */}
      <div>
        <h4 className="text-sm font-semibold text-gray-400 mb-2">
          Reservas ({bench.length} / 5)
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {bench.length === 0 ? (
            <p className="text-xs text-gray-500">Nenhum reserva selecionado</p>
          ) : (
            bench.map((tp: any) => (
              <div
                key={tp.id}
                className="flex justify-between items-center p-2 bg-gray-700/30 rounded text-sm"
              >
                <div className="flex-1">
                  <div className="text-gray-300 font-medium">{tp.players.name}</div>
                  <div className="text-xs text-gray-500">
                    {tp.players.team_name} • {tp.players.number || '—'} • {tp.position_slot}
                  </div>
                </div>
                <button
                  onClick={() => onRemovePlayer(tp.id)}
                  disabled={loading}
                  className="ml-2 px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded transition disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
