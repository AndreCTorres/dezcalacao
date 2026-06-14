// app/admin/draft/page.tsx
// Página de draft: admin atribui jogadores aos membros

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DraftInterface } from './draft-interface'
import { ModeSwitcher } from '@/app/components/mode-switcher'
import { LogoutButton } from '@/app/components/logout-button'

export default async function DraftPage() {
  // Validar autenticação
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

  // Se draft já foi fechado, redireciona para a área do participante
  if (group.status !== 'setup') {
    redirect('/app')
  }

  // Buscar membros
  const { data: members } = await admin
    .from('group_members')
    .select('id, display_name, profile_id, status')
    .eq('group_id', group.id)
    .order('display_name', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
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
            {group.name} — Draft
          </h1>
          <p className="text-gray-400">
            Registre os jogadores de cada membro. O draft termina quando todos têm 16 jogadores (11 titulares + 5 reservas).
          </p>
        </div>

        {/* Draft Interface */}
        <DraftInterface groupId={group.id} members={members || []} />
      </div>
    </div>
  )
}
