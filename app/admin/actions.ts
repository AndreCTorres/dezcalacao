'use server'

// app/admin/actions.ts
// Server Actions para o painel de administração.
// Usa service role para escrita, sempre filtrando por user.id validado.

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function createGroup(formData: FormData) {
  const name = formData.get('name') as string

  if (!name || name.trim().length === 0) {
    return { error: 'Nome do grupo é obrigatório' }
  }

  // Cliente para autenticação (getUser funciona)
  const supabase = createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Você precisa estar logado para criar um grupo' }
  }

  // Derivar display_name do usuário
  const displayName = user.user_metadata?.display_name 
    || user.email?.split('@')[0] 
    || 'Usuário'

  // Service role para escrita - user.id já validado
  const admin = supabaseAdmin()

  // Criar o grupo
  const { data: group, error: groupError } = await admin
    .from('groups')
    .insert({
      name: name.trim(),
      admin_id: user.id,  // ← user.id validado (não vem do cliente)
      status: 'setup',
    })
    .select()
    .single()

  if (groupError || !group) {
    console.error('[createGroup] Erro ao criar grupo:', groupError)
    return { error: 'Erro ao criar grupo. Tente novamente.' }
  }

  // Adicionar o próprio admin como membro do grupo
  const { data: member, error: memberError } = await admin
    .from('group_members')
    .insert({
      group_id: group.id,
      profile_id: user.id,  // ← user.id validado
      display_name: displayName,
      role: 'admin',
      status: 'joined',
      joined_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (memberError || !member) {
    console.error('[createGroup] Erro ao adicionar membro:', memberError)
    // Reverter criação do grupo
    await admin.from('groups').delete().eq('id', group.id)
    return { error: 'Erro ao configurar grupo. Tente novamente.' }
  }

  // Revalidar a página para mostrar o novo grupo
  revalidatePath('/admin')

  return { success: true, groupId: group.id }
}

export async function addMember(formData: FormData) {
  const groupId = formData.get('groupId') as string
  const displayName = formData.get('displayName') as string
  const inviteEmail = formData.get('inviteEmail') as string

  // Validações básicas
  if (!groupId || !displayName || displayName.trim().length === 0) {
    return { error: 'Nome do membro é obrigatório' }
  }

  // Validar e-mail (se fornecido)
  if (inviteEmail && inviteEmail.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail.trim())) {
      return { error: 'E-mail inválido' }
    }
  }

  // Cliente para autenticação
  const supabase = createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Você precisa estar logado' }
  }

  // Service role para verificação e escrita
  const admin = supabaseAdmin()

  // SEGURANÇA: Verificar que o usuário é admin do grupo
  const { data: group, error: groupError } = await admin
    .from('groups')
    .select('id, name')
    .eq('id', groupId)
    .eq('admin_id', user.id)  // ← FILTRO: só admin do grupo pode adicionar
    .single()

  if (groupError || !group) {
    console.error('[addMember] Grupo não encontrado ou sem permissão:', groupError)
    return { error: 'Grupo não encontrado ou você não tem permissão' }
  }

  // Verificar se já existe membro com esse nome no grupo
  const { data: existingMember } = await admin
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('display_name', displayName.trim())
    .single()

  if (existingMember) {
    return { error: 'Já existe um membro com esse nome no grupo' }
  }

  // Adicionar membro
  const { data: member, error: memberError } = await admin
    .from('group_members')
    .insert({
      group_id: groupId,
      profile_id: null,  // Convidado sem conta ainda
      display_name: displayName.trim(),
      invite_email: inviteEmail?.trim() || null,
      role: 'player',
      status: 'invited',
    })
    .select()
    .single()

  if (memberError || !member) {
    console.error('[addMember] Erro ao adicionar membro:', memberError)
    return { error: 'Erro ao adicionar membro. Tente novamente.' }
  }

  // Revalidar para atualizar a lista
  revalidatePath('/admin')

  return { 
    success: true, 
    member: {
      id: member.id,
      display_name: member.display_name,
      status: member.status,
      role: member.role,
    }
  }
}

// ========================================
// SYNC API-FOOTBALL
// ========================================

const API_BASE = 'https://v3.football.api-sports.io'
const WORLD_CUP_LEAGUE_ID = 1
const SEASON = '2026'
const THROTTLE_DELAY_MS = 350 // ~3 req/sec, seguro para evitar rate limit

// Lista oficial das 48 seleções da Copa 2026
const WORLD_CUP_2026_COUNTRIES = [
  'Germany', 'England', 'Austria', 'Belgium', 'Bosnia & Herzegovina', 'Croatia',
  'Scotland', 'Spain', 'France', 'Norway', 'Netherlands', 'Portugal', 'Sweden',
  'Switzerland', 'Czechia', 'Turkey', 'Argentina', 'Brazil', 'Colombia', 'Ecuador',
  'Paraguay', 'Uruguay', 'Canada', 'USA', 'Mexico', 'Curaçao', 'Haiti', 'Panama',
  'South Africa', 'Algeria', 'Cape Verde', 'Ivory Coast', 'Egypt', 'Ghana',
  'Morocco', 'DR Congo', 'Senegal', 'Tunisia', 'Saudi Arabia', 'Australia', 'Iraq',
  'Japan', 'Jordan', 'Uzbekistan', 'Qatar', 'South Korea', 'Iran', 'New Zealand',
]

// Mapeamento de nomes conhecidos da API que diferem da nossa lista
const COUNTRY_NAME_MAPPING: Record<string, string> = {
  'South Korea': 'Korea Republic',
  'DR Congo': 'Congo DR',
  'Czechia': 'Czech Republic',
  'Turkey': 'Türkiye',
  'Ivory Coast': 'Cote D\'Ivoire',
  'Cape Verde': 'Cape Verde',
}

async function apiFootballGet(endpoint: string, params: Record<string, string | number> = {}) {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) throw new Error('API_FOOTBALL_KEY não configurada')

  const url = new URL(`${API_BASE}${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })

  const response = await fetch(url.toString(), {
    headers: { 'x-apisports-key': apiKey },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`API-Football erro ${response.status}`)
  }

  const json = await response.json()
  return json.response || []
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function mapPosition(apiPosition: string): string {
  switch ((apiPosition || '').toLowerCase()) {
    case 'goalkeeper':
      return 'GK'
    case 'defender':
      return 'ZAG' // Ajuste manual LAT depois
    case 'midfielder':
      return 'MEI'
    case 'attacker':
      return 'ATK'
    default:
      return 'MEI'
  }
}

export async function syncPlayers() {
  const supabase = createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Não autenticado' }
  }

  // Verificar se o usuário é admin de algum grupo
  const admin = supabaseAdmin()
  const { data: adminGroups } = await admin
    .from('groups')
    .select('id')
    .eq('admin_id', user.id)
    .limit(1)

  if (!adminGroups || adminGroups.length === 0) {
    return { success: false, error: 'Apenas admins podem sincronizar jogadores' }
  }

  console.log('[Sync] Iniciando sincronização de jogadores da Copa 2026...')

  try {
    const results = {
      teamsResolved: 0,
      teamsPending: [] as string[],
      playersInserted: 0,
      errors: [] as string[],
    }

    // ========================================
    // PASSO 1: Resolver IDs das 48 seleções
    // ========================================
    console.log('[Sync] Passo 1: Resolvendo IDs das seleções...')

    // Cache em memória dos IDs resolvidos
    const teamIdMap = new Map<string, { id: number; apiName: string }>()

    // Buscar times da Copa 2022 (muitos IDs já estarão aqui)
    console.log('[Sync] Buscando times da Copa 2022 para cache inicial...')
    await sleep(THROTTLE_DELAY_MS)
    const teams2022 = await apiFootballGet('/teams', {
      league: WORLD_CUP_LEAGUE_ID,
      season: 2022,
    })

    console.log(`[Sync] Encontrados ${teams2022.length} times na Copa 2022`)

    // Mapear times conhecidos
    for (const item of teams2022) {
      const teamName = item.team?.name
      const teamId = item.team?.id
      const country = item.team?.country

      if (!teamName || !teamId) continue

      // Verificar se esse time está na nossa lista (comparar por país)
      const matchingCountry = WORLD_CUP_2026_COUNTRIES.find(c => {
        const apiName = COUNTRY_NAME_MAPPING[c] || c
        return teamName === apiName || country === c
      })

      if (matchingCountry) {
        teamIdMap.set(matchingCountry, { id: teamId, apiName: teamName })
        console.log(`[Sync] ✓ ${matchingCountry} → ID ${teamId} (${teamName})`)
      }
    }

    // Resolver países que faltaram
    const pendingCountries = WORLD_CUP_2026_COUNTRIES.filter(c => !teamIdMap.has(c))
    console.log(`[Sync] Países pendentes: ${pendingCountries.length}`)

    for (const country of pendingCountries) {
      const searchName = COUNTRY_NAME_MAPPING[country] || country
      console.log(`[Sync] Buscando "${searchName}"...`)

      try {
        await sleep(THROTTLE_DELAY_MS)
        const searchResults = await apiFootballGet('/teams', { search: searchName })

        // Filtrar por seleção nacional
        const nationalTeam = searchResults.find((item: any) => item.team?.national === true)

        if (nationalTeam) {
          const teamId = nationalTeam.team.id
          const teamName = nationalTeam.team.name
          teamIdMap.set(country, { id: teamId, apiName: teamName })
          console.log(`[Sync] ✓ ${country} → ID ${teamId} (${teamName})`)
        } else {
          console.log(`[Sync] ✗ ${country} NÃO RESOLVIDO`)
          results.teamsPending.push(country)
        }
      } catch (error: any) {
        console.error(`[Sync] Erro ao buscar ${country}:`, error.message)
        results.teamsPending.push(country)
      }
    }

    results.teamsResolved = teamIdMap.size

    // Salvar IDs no cache (tabela teams)
    console.log('[Sync] Salvando cache de times...')
    for (const [country, { id, apiName }] of teamIdMap.entries()) {
      await admin
        .from('teams')
        .upsert({
          id,
          name: apiName,
          country,
          api_name: apiName,
          national: true,
          season: SEASON,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'id' })
    }

    // ========================================
    // PASSO 2: Sincronizar elencos
    // ========================================
    console.log(`[Sync] Passo 2: Sincronizando elencos de ${teamIdMap.size} seleções...`)

    let totalPlayersInserted = 0

    for (const [country, { id: teamId, apiName: teamName }] of teamIdMap.entries()) {
      console.log(`[Sync] Sincronizando ${country} (${teamName}, ID: ${teamId})...`)

      try {
        await sleep(THROTTLE_DELAY_MS)
        const squadData = await apiFootballGet('/players/squads', { team: teamId })

        if (squadData.length === 0) {
          console.log(`[Sync] ⚠️ Nenhum squad retornado para ${country}`)
          continue
        }

        const squad = squadData[0]
        const players = squad.players || []

        console.log(`[Sync] ${country}: ${players.length} jogadores`)

        // Inserir jogadores (upsert por api_player_id)
        for (const player of players) {
          const playerData = {
            api_player_id: player.id,
            name: player.name,
            team_id: teamId,
            team_name: teamName,
            api_position: player.position, // Goalkeeper/Defender/Midfielder/Attacker
            position: mapPosition(player.position), // GK/ZAG/LAT/MEI/ATK
            age: player.age,
            number: player.number,
            photo_url: player.photo || null,
            season: SEASON,
            synced_at: new Date().toISOString(),
          }

          // Upsert pelo api_player_id
          const { error } = await admin
            .from('players')
            .upsert(playerData, { onConflict: 'api_player_id' })

          if (error) {
            console.error(`[Sync] Erro ao inserir ${player.name}:`, error.message)
            results.errors.push(`${player.name}: ${error.message}`)
          } else {
            totalPlayersInserted++
          }
        }
      } catch (error: any) {
        console.error(`[Sync] Erro ao sincronizar ${country}:`, error.message)
        results.errors.push(`${country}: ${error.message}`)
      }
    }

    results.playersInserted = totalPlayersInserted

    // ========================================
    // RESUMO
    // ========================================
    console.log('\n[Sync] ========================================')
    console.log('[Sync] SINCRONIZAÇÃO CONCLUÍDA')
    console.log('[Sync] ========================================')
    console.log(`[Sync] Seleções resolvidas: ${results.teamsResolved} / 48`)
    console.log(`[Sync] Seleções pendentes: ${results.teamsPending.length}`)
    if (results.teamsPending.length > 0) {
      console.log(`[Sync] Pendentes: ${results.teamsPending.join(', ')}`)
    }
    console.log(`[Sync] Jogadores inseridos/atualizados: ${results.playersInserted}`)
    if (results.errors.length > 0) {
      console.log(`[Sync] Erros: ${results.errors.length}`)
    }
    console.log('[Sync] ========================================\n')

    revalidatePath('/admin')

    return {
      success: true,
      ...results,
    }
  } catch (error: any) {
    console.error('[Sync] Erro geral:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}
