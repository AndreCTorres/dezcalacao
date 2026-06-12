'use server'

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'

export async function updateMemberProfile(
  memberId: string,
  displayName: string,
  teamName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validar entrada
    if (!displayName?.trim()) {
      return { success: false, error: 'Nome de usuário é obrigatório' }
    }

    if (displayName.trim().length > 100) {
      return { success: false, error: 'Nome de usuário muito longo (máximo 100 caracteres)' }
    }

    if (teamName && teamName.trim().length > 100) {
      return { success: false, error: 'Nome do time muito longo (máximo 100 caracteres)' }
    }

    // Verificar autenticação
    const supabase = createActionClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Não autenticado' }
    }

    const admin = supabaseAdmin()

    // Buscar o membro para validar ownership
    const { data: member, error: fetchError } = await admin
      .from('group_members')
      .select('id, profile_id')
      .eq('id', memberId)
      .single()

    if (fetchError || !member) {
      return { success: false, error: 'Membro não encontrado' }
    }

    // Validar que o usuário é o dono deste membro
    if (member.profile_id !== user.id) {
      return { success: false, error: 'Acesso negado' }
    }

    // Atualizar
    const { error: updateError } = await admin
      .from('group_members')
      .update({
        display_name: displayName.trim(),
        team_name: teamName?.trim() || null,
      })
      .eq('id', memberId)

    if (updateError) {
      console.error('[ProfileActions] Erro ao atualizar:', updateError)
      return { success: false, error: 'Erro ao salvar perfil' }
    }

    return { success: true }
  } catch (error) {
    console.error('[ProfileActions] Erro inesperado:', error)
    return { success: false, error: 'Erro interno do servidor' }
  }
}
