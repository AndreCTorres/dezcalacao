// app/admin/group-panel.tsx
// Painel principal do grupo (quando o usuário já tem um grupo).

import { LogoutButton } from '../components/logout-button'
import { AddMemberForm } from './add-member-form'
import { SyncPlayersButton } from './sync-players-button'
import Link from 'next/link'

type Group = {
  id: string
  name: string
  status: string
  season: string
}

type GroupMember = {
  id: string
  display_name: string
  role: string
  status: string
}

type GroupPanelProps = {
  group: Group
  members: GroupMember[]
  isAdmin: boolean
}

export function GroupPanel({ group, members, isAdmin }: GroupPanelProps) {
  const statusLabels: Record<string, string> = {
    setup: 'Configuração',
    drafting: 'Draft em andamento',
    active: 'Ativo',
    finished: 'Finalizado',
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-lime-400 mb-2">
              {group.name}
            </h1>
            <div className="flex gap-4 text-sm text-gray-400">
              <span>Temporada: {group.season}</span>
              <span>•</span>
              <span>Status: {statusLabels[group.status] || group.status}</span>
              {isAdmin && (
                <>
                  <span>•</span>
                  <span className="text-lime-400">Você é admin</span>
                </>
              )}
            </div>
          </div>
          <LogoutButton />
        </div>

        {/* Grid de cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Card: Membros */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">
              Membros ({members.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {members.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhum membro ainda</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">{member.display_name}</p>
                      {member.role === 'admin' && (
                        <p className="text-xs text-lime-400">Admin</p>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        member.status === 'joined'
                          ? 'bg-lime-400/20 text-lime-400'
                          : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {member.status === 'joined' ? 'Ativo' : 'Convidado'}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            {/* Formulário de adicionar membro (só para admin) */}
            {isAdmin && <AddMemberForm groupId={group.id} />}
          </div>

          {/* Card: Draft */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">
              Jogadores
            </h2>
            {isAdmin && (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Sincronize os convocados da Copa 2026 antes do draft
                </p>
                <SyncPlayersButton />
              </div>
            )}
            {!isAdmin && (
              <p className="text-gray-400 text-sm">
                Apenas o admin pode sincronizar jogadores
              </p>
            )}
          </div>

          {/* Card: Draft */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">
              Draft
            </h2>
            {group.status === 'setup' ? (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  O draft ainda não começou. Adicione membros primeiro.
                </p>
                {isAdmin && members.length > 1 && (
                  <Link
                    href="/admin/draft"
                    className="block w-full py-2 px-4 bg-lime-400 hover:bg-lime-500 text-gray-900 text-center font-semibold rounded-lg transition"
                  >
                    Iniciar draft
                  </Link>
                )}
                {isAdmin && members.length <= 1 && (
                  <p className="text-xs text-gray-500">
                    Adicione pelo menos 2 membros para iniciar o draft
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Draft em andamento ou finalizado
                </p>
                {isAdmin && (
                  <Link
                    href="/admin/draft"
                    className="block w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white text-center font-medium rounded-lg transition"
                  >
                    Ir para o draft
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Card: Rodadas */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">
              Rodadas
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Gerencie as rodadas do torneio e calcule pontuações
            </p>
            {isAdmin && (
              <Link
                href="/admin/rodadas"
                className="block w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white text-center font-medium rounded-lg transition"
              >
                Gerenciar rodadas
              </Link>
            )}
          </div>
        </div>

        {/* Info adicional */}
        <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-2">
            Próximos passos
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm">
            <li className={members.length >= 2 ? 'line-through text-gray-500' : ''}>
              Adicione membros ao grupo (mínimo 2 para jogar)
            </li>
            <li>Sincronize os jogadores convocados da API</li>
            <li>Faça o draft atribuindo jogadores aos membros</li>
            <li>Configure e gerencie as rodadas</li>
            <li>Calcule as pontuações após cada rodada</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
