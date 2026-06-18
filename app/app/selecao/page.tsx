// app/app/selecao/page.tsx
// Seleção da Rodada: o XI 4-3-3 com as maiores notas da rodada (todas as notas
// lançadas, não só as de quem foi draftado) + destaque do craque (maior nota).

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { pickTeamOfRound, type Position } from '@/lib/scoring'
import { TeamOfRoundPitch, type TotrPlayer } from './team-of-round-pitch'

export const dynamic = 'force-dynamic'

export default async function SelecaoDaRodadaPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>
}) {
  const params = await searchParams
  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = supabaseAdmin()

  // 1. Descobrir o grupo do usuário (participante ou admin)
  const { data: memberships } = await admin
    .from('group_members')
    .select('group_id')
    .eq('profile_id', user.id)
    .eq('status', 'joined')
    .limit(1)

  let groupId = memberships?.[0]?.group_id ?? null

  if (!groupId) {
    const { data: ownedGroups } = await admin
      .from('groups')
      .select('id')
      .eq('admin_id', user.id)
      .limit(1)
    groupId = ownedGroups?.[0]?.id ?? null
  }

  if (!groupId) {
    return (
      <Shell>
        <Empty title="Você não está em um grupo ainda" subtitle="Aguarde um convite do admin." />
      </Shell>
    )
  }

  // 2. Buscar config do grupo (minutos mínimos) e rodadas
  const { data: rounds } = await admin
    .from('rounds')
    .select('id, name, status, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })

  const roundList = rounds ?? []

  if (roundList.length === 0) {
    return (
      <Shell>
        <Empty title="Nenhuma rodada criada ainda" subtitle="O admin cria as rodadas em /admin/rodadas." />
      </Shell>
    )
  }

  // Rodada atual automática: a mais recente que JÁ tem notas; se nenhuma tiver,
  // a que está aberta; senão a última criada. (Evita ter que clicar.)
  const roundIds = roundList.map((r) => r.id)
  const { data: ratedRows } = await admin
    .from('player_round_ratings')
    .select('round_id')
    .in('round_id', roundIds)
  const ratedSet = new Set((ratedRows ?? []).map((r) => r.round_id))
  const lastRated = [...roundList].reverse().find((r) => ratedSet.has(r.id))
  const openRound = [...roundList].reverse().find((r) => (r as any).status === 'open')
  const defaultRound = lastRated ?? openRound ?? roundList[roundList.length - 1]

  // Rodada selecionada (default: a rodada atual)
  const selectedRoundId = params.round && roundList.some((r) => r.id === params.round)
    ? params.round
    : defaultRound.id
  const selectedRound = roundList.find((r) => r.id === selectedRoundId)!

  // 3. Buscar notas da rodada + dados dos jogadores (duas queries, junta em memória)
  const { data: ratings } = await admin
    .from('player_round_ratings')
    .select('player_id, rating, minutes')
    .eq('round_id', selectedRoundId)

  const ratingRows = (ratings ?? []).filter((r) => r.rating != null)

  let combined: Array<TotrPlayer & { position: Position }> = []

  if (ratingRows.length > 0) {
    const playerIds = Array.from(new Set(ratingRows.map((r) => r.player_id)))
    const { data: players } = await admin
      .from('players')
      .select('id, name, team_name, position, photo_url, number')
      .in('id', playerIds)

    const playerMap = new Map((players ?? []).map((p) => [p.id, p]))

    combined = ratingRows
      .map((r) => {
        const p = playerMap.get(r.player_id)
        if (!p) return null
        return {
          player_id: r.player_id as number,
          name: p.name as string,
          team_name: (p.team_name as string) ?? '',
          position: (p.position as Position) ?? 'MEI',
          photo_url: (p.photo_url as string) ?? null,
          number: (p.number as number) ?? null,
          rating: r.rating as number,
          minutes: (r.minutes as number) ?? 0,
        }
      })
      .filter((x): x is TotrPlayer & { position: Position } => x !== null)
  }

  // 4. Calcular o XI e o craque (função pura)
  const totr = pickTeamOfRound(combined)
  const hasTeam = totr.starters.length > 0

  return (
    <Shell>
      <div className="max-w-md mx-auto w-full">
        {/* Voltar no topo */}
        <div className="mb-3">
          <Link href="/app" className="text-gray-400 text-sm font-semibold hover:text-lime-400 transition">
            ← Voltar
          </Link>
        </div>

        {/* Cabeçalho */}
        <div className="text-center mb-4">
          <h1
            className="text-2xl font-black uppercase tracking-tight"
            style={{ fontFamily: 'Anton, sans-serif' }}
          >
            <span style={{ color: '#c5f24a' }}>Seleção</span>
            <span className="text-white"> da Rodada</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Os 11 melhores de <strong className="text-white">{selectedRound.name}</strong> · 4-3-3
          </p>
        </div>

        {/* Seletor de rodada */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
          {roundList.map((r) => {
            const active = r.id === selectedRoundId
            return (
              <Link
                key={r.id}
                href={`/app/selecao?round=${r.id}`}
                className={`whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                  active
                    ? 'bg-lime-400 text-gray-900 border-lime-400'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:border-lime-400/40'
                }`}
              >
                {r.name}
              </Link>
            )
          })}
        </div>

        {hasTeam ? (
          <>
            {/* Craque da rodada */}
            {totr.best && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-3">
                <span className="text-2xl">👑</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-yellow-400 font-bold">
                    Craque da Rodada
                  </p>
                  <p className="text-white font-bold truncate">
                    {totr.best.name}{' '}
                    <span className="text-gray-400 font-normal">· {totr.best.team_name}</span>
                  </p>
                </div>
                <span className="font-mono font-black text-yellow-400 text-xl">
                  {totr.best.rating!.toFixed(1)}
                </span>
              </div>
            )}

            {/* Campinho */}
            <TeamOfRoundPitch lines={totr.lines} bestPlayerId={totr.best?.player_id ?? null} />

            {/* Aviso de XI incompleto (faltam notas para alguma posição) */}
            {totr.starters.length < 11 && (
              <p className="text-center text-gray-500 text-xs mt-3">
                XI parcial: faltam notas para preencher todas as posições.
              </p>
            )}
          </>
        ) : (
          <Empty
            title="Sem notas nesta rodada ainda"
            subtitle="Quando o admin lançar as notas, o XI aparece aqui."
          />
        )}

        <div className="text-center mt-6 flex flex-col gap-2">
          <Link
            href={`/app/notas?round=${selectedRoundId}`}
            className="text-lime-300 text-sm font-semibold hover:underline"
          >
            📋 Ver as notas de cada jogo
          </Link>
          <Link href="/app" className="text-gray-400 text-sm font-semibold hover:underline">
            ← Voltar
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-6" style={{ background: '#0a0e0c' }}>
      {children}
    </div>
  )
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <h1 className="text-xl font-bold text-lime-400 mb-2">{title}</h1>
      <p className="text-gray-400">{subtitle}</p>
      <div className="mt-6">
        <Link href="/app" className="text-lime-400 text-sm font-semibold hover:underline">
          ← Voltar
        </Link>
      </div>
    </div>
  )
}
