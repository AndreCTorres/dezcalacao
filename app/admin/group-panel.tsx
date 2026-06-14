// app/admin/group-panel.tsx
// Painel principal do grupo (quando o usuário já tem um grupo).

import { LogoutButton } from '../components/logout-button'
import { ModeSwitcher } from '../components/mode-switcher'
import { AddMemberForm } from './add-member-form'
import { SyncPlayersButton } from './sync-players-button'
import { SeedUsersButton } from './seed-users-button'
import { LinkMemberForm } from './link-member-form'
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
  profile_id?: string | null
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

  const statusEmojis: Record<string, string> = {
    setup: '⚙️',
    drafting: '📋',
    active: '🟢',
    finished: '🏁',
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: '#0a0e0c' }}
    >
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Header com modo switcher */}
        <div className="flex justify-between items-start mb-8 gap-4">
          <div className="flex-1">
            <Link href="/" className="text-lime-400 hover:text-lime-300 text-sm mb-3 inline-block">
              ← Dezcalação
            </Link>
            <h1
              className="text-3xl sm:text-4xl font-black text-lime-400 tracking-tight mb-3"
              style={{ fontFamily: 'Anton, sans-serif', textTransform: 'uppercase' }}
            >
              {group.name}
            </h1>
            <div className="flex flex-wrap gap-3 items-center text-sm">
              <span className="text-gray-400">
                Temporada <span className="text-white font-semibold">{group.season}</span>
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-2">
                <span>{statusEmojis[group.status] || '❓'}</span>
                <span className="text-gray-300">{statusLabels[group.status] || group.status}</span>
              </span>
              {isAdmin && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="inline-block px-2 py-1 bg-lime-400/20 text-lime-400 rounded text-xs font-medium">
                    🔑 Admin
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 items-end">
            <ModeSwitcher isAdmin={isAdmin} />
            <LogoutButton />
          </div>
        </div>

        {/* Grid de cards principais: esquerda (sidebar) + direita (main) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Coluna Esquerda: Membros + Adicionar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card: Membros */}
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-lime-400">👥 Membros</h2>
                <span className="bg-lime-400/20 text-lime-400 text-sm px-2 py-1 rounded-lg font-semibold">
                  {members.length}
                </span>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">Nenhum membro ainda</p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex justify-between items-center p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition border border-gray-700/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{member.display_name}</p>
                        {member.role === 'admin' && (
                          <p className="text-xs text-lime-400 font-semibold mt-0.5">🔑 Admin</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            member.status === 'joined'
                              ? 'bg-lime-400/20 text-lime-400'
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}
                        >
                          {member.status === 'joined' ? '✓ Ativo' : '⏳ Convidado'}
                        </span>
                        {/* Botão de visualização — sempre visível para o admin */}
                        {isAdmin && (
                          <Link
                            href={`/admin/view-member/${member.id}`}
                            className="text-xs px-2.5 py-1 rounded-full font-medium transition"
                            style={{
                              background: 'rgba(197,242,74,.1)',
                              color: '#c5f24a',
                              border: '1px solid rgba(197,242,74,.25)',
                            }}
                            title={`Ver visão de ${member.display_name}`}
                          >
                            👁️
                          </Link>
                        )}
                        {/* Botão de vincular — para membros convidados sem conta */}
                        {isAdmin && member.status === 'invited' && !member.profile_id && (
                          <LinkMemberForm memberId={member.id} memberName={member.display_name} />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Card: Adicionar Membro (só para admin) */}
            {isAdmin && (
              <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition">
                <h2 className="text-lg font-bold text-lime-400 mb-4">➕ Adicionar Membro</h2>
                <div className="space-y-3">
                  <AddMemberForm groupId={group.id} />
                  <SeedUsersButton groupId={group.id} />
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Cards de ações principais */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card: Sincronizar Jogadores */}
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-lime-400">⚽ Jogadores</h2>
                <span className="text-xl">🔄</span>
              </div>
              {isAdmin ? (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Sincronize os convocados da Copa 2026 antes do draft.
                  </p>
                  <SyncPlayersButton />
                </div>
              ) : (
                <p className="text-gray-500 text-sm py-4">
                  Apenas o admin pode sincronizar jogadores
                </p>
              )}
            </div>

            {/* Card: Draft */}
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-lime-400">🏆 Draft</h2>
                <span className="text-xl">
                  {group.status === 'setup' ? '⏳' : 
                   group.status === 'drafting' ? '🎯' :
                   '✅'}
                </span>
              </div>
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
                      ▶️ Iniciar Draft
                    </Link>
                  )}
                  {isAdmin && members.length <= 1 && (
                    <p className="text-xs text-gray-500 bg-gray-900/50 p-3 rounded-lg">
                      ⚠️ Adicione pelo menos 2 membros para iniciar
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
                      Ir para o Draft
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Card: Rodadas */}
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-lime-400">📊 Rodadas</h2>
                <span className="text-xl">⏱️</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Gerencie rodadas do torneio e calcule pontuações.
              </p>
              {isAdmin && (
                <Link
                  href="/admin/rodadas"
                  className="block w-full py-2 px-4 bg-lime-400 hover:bg-lime-500 text-gray-900 text-center font-semibold rounded-lg transition"
                >
                  📊 Gerenciar Rodadas
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Seção de próximos passos */}
        <div className="bg-gradient-to-r from-gray-800/50 to-gray-800/30 backdrop-blur rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-bold text-lime-400 mb-4 flex items-center gap-2">
            🚀 Próximos Passos
          </h3>
          <ol className="space-y-3 text-gray-300 text-sm">
            <li className={`flex items-start gap-3 ${members.length >= 2 ? 'opacity-50' : ''}`}>
              <span className={`font-bold flex-shrink-0 mt-0.5 ${members.length >= 2 ? 'text-gray-500' : 'text-lime-400'}`}>
                {members.length >= 2 ? '✓' : '1.'}
              </span>
              <span className={members.length >= 2 ? 'line-through text-gray-500' : ''}>
                Adicione membros ao grupo (mínimo 2 para jogar)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold flex-shrink-0 text-lime-400 mt-0.5">2.</span>
              <span>Sincronize os jogadores convocados da API-Football</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold flex-shrink-0 text-lime-400 mt-0.5">3.</span>
              <span>Realize o draft atribuindo jogadores aos membros</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold flex-shrink-0 text-lime-400 mt-0.5">4.</span>
              <span>Configure e gerencie as rodadas do torneio</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold flex-shrink-0 text-lime-400 mt-0.5">5.</span>
              <span>Calcule as pontuações após cada rodada</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
