// app/api/seed-team/route.ts
// Seed de time completo pra testar a UI sem fazer draft manual
// Monta 11 titulares + 5 reservas com jogadores do Brasil e Argentina

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { memberId, groupId } = await request.json()

    if (!memberId || !groupId) {
      return NextResponse.json(
        { success: false, error: 'Informe memberId e groupId no body' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) throw new Error('Faltam variáveis do Supabase')

    const admin = createClient(supabaseUrl, supabaseKey)

    // Buscar jogadores disponíveis por posição (Brasil + Argentina)
    const { data: players, error: playersError } = await admin
      .from('players')
      .select('id, name, position, team_name, photo_url, number')
      .in('team_name', ['Brazil', 'Argentina'])
      .order('position')

    if (playersError) throw new Error(playersError.message)
    if (!players || players.length === 0) throw new Error('Nenhum jogador no banco. Rode /api/sync-sample primeiro.')

    // Agrupar por posição
    const byPosition: Record<string, typeof players> = {}
    for (const p of players) {
      if (!byPosition[p.position]) byPosition[p.position] = []
      byPosition[p.position].push(p)
    }

    console.log('[Seed] Jogadores disponíveis por posição:')
    Object.entries(byPosition).forEach(([pos, ps]) => {
      console.log(`  ${pos}: ${ps.length}`)
    })

    // Montar time: formação 1-3-4-3 (1 GK, 3 ZAG, 4 MEI, 3 ATK) + 5 reservas
    // Titulares (11)
    const starters: { player: typeof players[0]; position_slot: string }[] = []

    const pick = (position: string, count: number) => {
      const pool = byPosition[position] || []
      // Evitar repetir jogadores já escolhidos
      const used = new Set(starters.map(s => s.player.id))
      const available = pool.filter(p => !used.has(p.id))
      return available.slice(0, count)
    }

    // GK
    pick('GK', 1).forEach(p => starters.push({ player: p, position_slot: 'GK' }))
    // ZAG
    pick('ZAG', 3).forEach(p => starters.push({ player: p, position_slot: 'ZAG' }))
    // LAT (se não tiver LAT suficiente, usar ZAG)
    const lats = pick('LAT', 2)
    if (lats.length >= 2) {
      lats.forEach(p => starters.push({ player: p, position_slot: 'LAT' }))
    } else {
      pick('ZAG', 2).forEach(p => starters.push({ player: p, position_slot: 'ZAG' }))
    }
    // MEI
    pick('MEI', 3).forEach(p => starters.push({ player: p, position_slot: 'MEI' }))
    // ATK
    pick('ATK', 3).forEach(p => starters.push({ player: p, position_slot: 'ATK' }))

    // Preencher até 11 se alguma posição ficou curta
    if (starters.length < 11) {
      const usedIds = new Set(starters.map(s => s.player.id))
      const remaining = players.filter(p => !usedIds.has(p.id))
      const missing = 11 - starters.length
      remaining.slice(0, missing).forEach(p => starters.push({ player: p, position_slot: p.position }))
    }

    // Reservas (5): próximos disponíveis
    const usedIds = new Set(starters.map(s => s.player.id))
    const bench = players
      .filter(p => !usedIds.has(p.id))
      .slice(0, 5)
      .map(p => ({ player: p, position_slot: p.position }))

    console.log(`[Seed] Titulares: ${starters.length}, Reservas: ${bench.length}`)

    // Limpar time anterior do membro (pra poder rodar várias vezes)
    await admin.from('team_players').delete().eq('group_member_id', memberId)

    // Inserir titulares
    let inserted = 0
    const errors: string[] = []

    for (const { player, position_slot } of starters) {
      const { error } = await admin.from('team_players').insert({
        group_member_id: memberId,
        player_id: player.id,
        slot: 'starter',
        position_slot,
      })
      if (error) {
        errors.push(`${player.name}: ${error.message}`)
      } else {
        inserted++
        console.log(`[Seed] ✓ Titular: ${player.name} (${position_slot}) - ${player.team_name}`)
      }
    }

    // Inserir reservas
    for (const { player, position_slot } of bench) {
      const { error } = await admin.from('team_players').insert({
        group_member_id: memberId,
        player_id: player.id,
        slot: 'bench',
        position_slot,
      })
      if (error) {
        errors.push(`${player.name}: ${error.message}`)
      } else {
        inserted++
        console.log(`[Seed] ✓ Reserva: ${player.name} (${position_slot}) - ${player.team_name}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Time montado! ${inserted} jogadores inseridos (${starters.length} titulares + ${bench.length} reservas).`,
      inserted,
      errors,
      starters: starters.map(s => `${s.player.name} (${s.position_slot})`),
      bench: bench.map(b => `${b.player.name} (${b.position_slot})`),
      nextStep: 'Acesse /app pra ver o time com fotos',
    })
  } catch (error: any) {
    console.error('[Seed] ❌', error.message)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
