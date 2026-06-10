// app/app/time/page.tsx
// Página para gerenciar escalação e fazer substituições

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/app/components/logout-button'
import { SubstitutionInterface } from '../substitution-interface'
import { getActiveRound } from '../substitutions-actions'

export default async function MyTeamPage() {
  const supabase = createActionClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = supabaseAdmin()

  // 1. Buscar membership do usuário
  const { data: membership } = await admin
    .from('group_members')
    .select(
      `
      id,
      group_id,
      display_name,
      groups (
        id,
        name,
        status,
        max_subs_por_rodada
      )
    `
    )
    .eq('profile_id', user.id)
    .eq('status', 'joined')
    .single()

  if (!membership || !membership.groups) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-lime-400 mb-2">Você não está em um grupo ainda</h1>
          <p className="text-gray-400 mb-4">Aguarde um convite do admin</p>
          <LogoutButton />
        </div>
      </div>
    )
  }

  const group = membership.groups as any
  const groupMemberId = membership.id

  // 2. Buscar rodada aberta
  const roundResult = await getActiveRound(group.id)

  if (!roundResult.success || !roundResult.round) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/app" className="text-lime-400 hover:text-lime-300 text-sm mb-4 inline-block">
            ← Voltar
          </Link>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 text-center">
            <h1 className="text-2xl font-bold text-lime-400 mb-2">Nenhuma rodada aberta</h1>
            <p className="text-gray-400">Substituições apenas podem ser feitas enquanto a rodada está aberta.</p>
          </div>
        </div>
      </div>
    )
  }

  const round = roundResult.round

  // 3. Buscar time do participante
  const { data: teamPlayers } = await admin
    .from('team_players')
    .select(
      `
      id,
      player_id,
      slot,
      position_slot,
      players (
        id,
        name,
        team_name,
        position,
        photo_url,
        number
      )
    `
    )
    .eq('group_member_id', groupMemberId)
    .order('position_slot', { ascending: true })
    .order('slot', { ascending: false })

  // 4. Buscar substituições já feitas nesta rodada
  const { data: substitutions } = await admin
    .from('substitutions')
    .select('id, group_member_id, round_id, out_player_id, in_player_id, position_slot, created_at')
    .eq('group_member_id', groupMemberId)
    .eq('round_id', round.id)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <Link href="/app" className="text-lime-400 hover:text-lime-300 text-sm mb-4 inline-block">
              ← Voltar
            </Link>
            <h1 className="text-4xl font-bold text-lime-400 mb-2">Meu Time</h1>
            <p className="text-gray-400">
              Rodada: {round.name} • Status: {round.status}
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Componente de substituições */}
        <SubstitutionInterface
          groupMemberId={groupMemberId}
          roundId={round.id}
          teamPlayers={(teamPlayers as any) || []}
          currentSubstitutions={(substitutions as any) || []}
          maxSubsPerRound={group.max_subs_por_rodada}
        />

        {/* Info */}
        <div className="mt-8 bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-sm text-gray-400">
          <p className="mb-2">
            <strong>Como funciona:</strong> Clique em um titular para escolher um reserva para entrá-lo no lugar.
            Você pode fazer até <strong>{group.max_subs_por_rodada}</strong> substituição{group.max_subs_por_rodada !== 1 ? 'ões' : ''} por rodada.
          </p>
          <p>Todas as substituições devem respeitar a <strong>mesma posição</strong>.</p>
        </div>
      </div>
    </div>
  )
}
