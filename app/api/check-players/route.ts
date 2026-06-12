// app/api/check-players/route.ts
// Diagnóstico: verifica se nomes da lista do draft batem com o banco
// GET /api/check-players?names=Vini,Saliba,Wirtz,...

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const namesParam = searchParams.get('names') || ''
  const names = namesParam.split(',').map(n => n.trim()).filter(Boolean)

  if (names.length === 0) {
    return NextResponse.json({ error: 'Passe ?names=Nome1,Nome2,...' }, { status: 400 })
  }

  const admin = supabaseAdmin()

  // Uma única query trazendo todos os jogadores — filtra em memória
  const { data: allPlayers } = await admin
    .from('players')
    .select('id, name, team_name, position')
    .eq('season', 'WC2026')

  const players = allPlayers || []

  const results = names.map(name => {
    const nameClean = removeAccents(name)
    const match = players.find(p => removeAccents(p.name).includes(nameClean))
    return {
      query: name,
      found: match ? `${match.name} (${match.team_name}, ${match.position}, id:${match.id})` : null,
      id: match?.id ?? null,
    }
  })

  const notFound = results.filter(r => !r.found)
  const found = results.filter(r => r.found)

  return NextResponse.json({
    total: results.length,
    foundCount: found.length,
    notFoundCount: notFound.length,
    notFound: notFound.map(r => r.query),
    found: found.map(r => `${r.query} → ${r.found}`),
  })
}
