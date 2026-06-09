// app/admin/page.tsx — painel do admin.
// Usa service role para leituras, sempre filtrando por user.id validado.

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { CreateGroupForm } from './create-group-form'
import { GroupPanel } from './group-panel'

export default async function AdminHome() {
  // Cliente para autenticação (getUser funciona)
  const supabase = createActionClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Service role para leitura - filtra por user.id validado
  const admin = supabaseAdmin()

  // Buscar grupo do usuário (via group_members)
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
    .eq('profile_id', user.id)  // ← Filtro obrigatório: user.id validado
    .eq('status', 'joined')
    .single()

  // Se não tem grupo, mostra formulário de criação
  if (!memberData || !memberData.groups) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <CreateGroupForm />
      </div>
    )
  }

  // Usuário tem grupo - buscar membros
  const group = memberData.groups as any
  const isAdmin = group.admin_id === user.id

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
