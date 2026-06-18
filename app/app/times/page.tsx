import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TimesClient, type TimesMember } from './times-client'

export const dynamic = 'force-dynamic'

export default async function TimesPage() {
  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = supabaseAdmin()

  const { data: memberships } = await admin
    .from('group_members')
    .select('id, group_id')
    .eq('profile_id', user.id)
    .eq('status', 'joined')
    .limit(1)

  const membership = memberships?.[0] ?? null

  if (!membership) {
    return (
      <EmptyState
        title="Você não está em nenhum grupo"
        subtitle="Peça ao admin para adicioná-lo a um grupo para ver os times dos participantes."
      />
    )
  }

  const { data: members } = await admin
    .from('group_members')
    .select('id, display_name, status, profile_id')
    .eq('group_id', membership.group_id)
    .order('display_name', { ascending: true })

  const memberList = (members ?? []) as TimesMember[]

  if (memberList.length === 0) {
    return (
      <EmptyState
        title="Nenhum participante encontrado"
        subtitle="Quando o grupo tiver participantes, os times aparecem aqui."
      />
    )
  }

  return (
    <TimesClient
      groupId={membership.group_id}
      currentMemberId={membership.id}
      members={memberList}
    />
  )
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="min-h-screen px-4 py-6" style={{ background: '#0a0e0c' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start gap-4 mb-8">
          <h1
            className="text-3xl sm:text-4xl font-black tracking-tight mb-2"
            style={{ fontFamily: 'Anton, sans-serif', textTransform: 'uppercase', color: '#c5f24a' }}
          >
            Times dos Participantes
          </h1>
          <Link
            href="/app"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition"
            style={{ background: 'rgba(197,242,74,.1)', color: '#c5f24a', border: '1px solid rgba(197,242,74,.3)' }}
          >
            ← Voltar
          </Link>
        </div>
        <div className="rounded-xl p-12 text-center border border-white/10 bg-white/[0.03]">
          <p className="text-gray-400 text-lg font-medium mb-2">{title}</p>
          <p className="text-gray-500 text-sm">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}
