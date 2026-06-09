/**
 * Group Service
 * Lógica de negócio relacionada a grupos
 */

import { supabaseAdmin } from '@/lib/supabase-server'
import type { Group, GroupMember, GroupWithMembers } from '@/lib/types'

/**
 * Buscar grupo com todos os membros
 */
export async function getGroupWithMembers(
  groupId: string,
  userId: string
): Promise<GroupWithMembers | null> {
  const admin = supabaseAdmin()

  // Validar que o usuário é membro do grupo
  const { data: membership } = await admin
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('profile_id', userId)
    .single()

  if (!membership) return null

  const { data: group } = await admin
    .from('groups')
    .select(
      `
      id,
      name,
      admin_id,
      season,
      status,
      bonus_selecao_rodada,
      bonus_craque_partida,
      max_subs_por_rodada,
      min_minutos,
      created_at,
      group_members (
        id,
        group_id,
        profile_id,
        display_name,
        invite_email,
        role,
        status,
        joined_at
      )
    `
    )
    .eq('id', groupId)
    .single()

  return group as GroupWithMembers | null
}

/**
 * Contar membros de um grupo por status
 */
export async function getGroupMemberStats(groupId: string): Promise<{
  total: number
  joined: number
  invited: number
}> {
  const admin = supabaseAdmin()

  const { data, error } = await admin
    .from('group_members')
    .select('status', { count: 'exact' })
    .eq('group_id', groupId)

  if (error || !data) return { total: 0, joined: 0, invited: 0 }

  return {
    total: data.length,
    joined: data.filter((m) => m.status === 'joined').length,
    invited: data.filter((m) => m.status === 'invited').length,
  }
}

/**
 * Validar que usuário é admin do grupo
 */
export async function isGroupAdmin(
  groupId: string,
  userId: string
): Promise<boolean> {
  const admin = supabaseAdmin()

  const { data } = await admin
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .eq('admin_id', userId)
    .single()

  return !!data
}

/**
 * Validar que usuário é membro do grupo
 */
export async function isGroupMember(
  groupId: string,
  userId: string
): Promise<boolean> {
  const admin = supabaseAdmin()

  const { data } = await admin
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('profile_id', userId)
    .single()

  return !!data
}
