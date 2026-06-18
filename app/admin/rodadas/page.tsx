// app/admin/rodadas/page.tsx
// Gerenciar rodadas do torneio

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RoundForm } from './round-form'
import { RoundList } from './round-list'
import { ResetDraftButton } from './reset-draft-button'
import { ModeSwitcher } from '@/app/components/mode-switcher'
import { LogoutButton } from '@/app/components/logout-button'

export default async function RoundsPage() {
  const supabase = await createActionClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar grupo do admin
  const admin = supabaseAdmin()
  const { data: group } = await admin
    .from('groups')
    .select('id, name, status')
    .eq('admin_id', user.id)
    .single()

  if (!group) {
    redirect('/admin')
  }

  // Buscar rodadas. Se a base local ainda nao recebeu a migracao do finalized_at,
  // faz fallback sem a coluna para nao esconder o historico de jogos/rodadas.
  let { data: rounds, error: roundsError } = await admin
    .from('rounds')
    .select('id, name, status, starts_at, locked_at, finalized_at, ends_at, fixtures_done, fixtures_total, auto_close, created_at')
    .eq('group_id', group.id)
    .order('created_at', { ascending: false })

  if (roundsError) {
    const fallback = await admin
      .from('rounds')
      .select('id, name, status, starts_at, locked_at, ends_at, fixtures_done, fixtures_total, auto_close, created_at')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })

    rounds = (fallback.data ?? []).map((round: any) => ({ ...round, finalized_at: null }))
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <Link href="/admin" className="text-lime-400 hover:text-lime-300 text-sm inline-block">
              ← Voltar para admin
            </Link>
            <div className="flex gap-3 items-center">
              <ModeSwitcher isAdmin={true} />
              <LogoutButton />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-lime-400 mb-2">
            {group.name} — Rodadas
          </h1>
          <p className="text-gray-400">
            Crie rodadas e feche-as quando os jogos terminarem
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Criar rodada */}
          <div className="lg:col-span-1 space-y-6">
            <RoundForm groupId={group.id} />
            <ResetDraftButton groupId={group.id} />
          </div>

          {/* Lista de rodadas */}
          <div className="lg:col-span-2">
            <RoundList groupId={group.id} rounds={rounds || []} />
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700 text-sm text-gray-400">
          <p className="mb-2">
            <span className="font-semibold text-white">Como funciona:</span>
          </p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Crie uma rodada (ex: "Rodada 1", "Oitavas", etc)</li>
            <li>Quando os jogos terminarem, clique "Fechar Rodada"</li>
            <li>O sistema busca as notas dos jogadores e calcula pontos</li>
            <li>Participantes veem a pontuação em seu painel</li>
            <li>Após os 16avos, use "Resetar Draft" para a nova fase</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
