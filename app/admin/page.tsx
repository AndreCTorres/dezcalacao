// app/admin/page.tsx — painel do admin.
// Usa service role para leituras, sempre filtrando por user.id validado.

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { CreateGroupForm } from './create-group-form'
import { GroupPanel } from './group-panel'

export default async function AdminHome() {
  // Cliente para autenticação (getUser funciona)
  const supabase = await createActionClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  console.log('[AdminHome] Usuário:', user.id, user.email)

  // Service role para leitura - filtra por user.id validado
  const admin = supabaseAdmin()

  // Buscar grupo do usuário de duas formas:
  // 1. Como membro (group_members)
  // 2. Como admin (groups.admin_id)
  
  const { data: memberData } = await admin
    .from('group_members')
    .select(`
      id,
      group_id,
      role,
      groups (
        id,
        name,
        status,
        season,
        admin_id
      )
    `)
    .eq('profile_id', user.id)
    .eq('status', 'joined')
    .maybeSingle()

  let group = memberData?.groups as any
  let isAdmin = group?.admin_id === user.id

  // Se não encontrou como membro, busca como admin
  if (!group) {
    const { data: adminGroups } = await admin
      .from('groups')
      .select('id, name, status, season, admin_id')
      .eq('admin_id', user.id)
      .maybeSingle()

    if (adminGroups) {
      group = adminGroups
      isAdmin = true
    }
  }

  console.log('[AdminHome] Group found:', group ? `${group.name} (admin: ${isAdmin})` : 'none')

  // Se não tem grupo, mostra formulário de criação
  if (!group) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <CreateGroupForm />
      </div>
    )
  }

  // Usuário não é admin deste grupo — redirecionar para a área de participante
  if (!isAdmin) {
    redirect('/app')
  }

  const { data: members } = await admin
    .from('group_members')
    .select('id, display_name, role, status')
    .eq('group_id', group.id)  // ← Filtro: grupo que o usuário pertence
    .order('joined_at', { ascending: true })

  return (
    <GroupPanel
      group={group}
      members={members || []}
      isAdmin={isAdmin}
    />
  )
}
