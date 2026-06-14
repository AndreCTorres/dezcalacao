'use server'

// app/admin/actions.ts
// Server Actions para o painel de administração.
// Usa service role para escrita, sempre filtrando por user.id validado.

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function createGroup(formData: FormData) {
  const name = formData.get('name') as string

  if (!name || name.trim().length === 0) {
    return { error: 'Nome do grupo é obrigatório', success: false }
  }

  // Cliente para autenticação (getUser funciona)
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  console.log('[createGroup] User:', { id: user?.id, email: user?.email })
  
  if (authError || !user) {
    return { error: 'Você precisa estar logado para criar um grupo', success: false }
  }

  if (!user.id) {
    console.error('[createGroup] User ID inválido:', user)
    return { error: 'Erro: user.id não disponível', success: false }
  }

  // Derivar display_name do usuário
  const displayName = user.user_metadata?.display_name 
    || user.email?.split('@')[0] 
    || 'Usuário'

  // Service role para escrita - user.id já validado
  const admin = supabaseAdmin()

  // GARANTIR que o profile existe (pode ter falhado o trigger)
  console.log('[createGroup] Garantindo que profile existe...')
  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        display_name: displayName,
      },
      { onConflict: 'id' }
    )

  if (profileError) {
    console.error('[createGroup] Erro ao garantir profile:', profileError)
    return { error: `Erro ao criar perfil: ${profileError.message}`, success: false }
  }

  console.log('[createGroup] ✓ Profile garantido')

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
    console.error('[createGroup] Erro ao criar grupo:', {
      error: groupError,
      message: groupError?.message,
      code: groupError?.code,
      details: groupError?.details,
    })
    return { error: `Erro ao criar grupo: ${groupError?.message || 'Erro desconhecido'}`, success: false }
  }

  console.log('[createGroup] ✓ Grupo criado:', group.id)

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
    console.error('[createGroup] Erro ao adicionar membro:', {
      error: memberError,
      message: memberError?.message,
      code: memberError?.code,
      details: memberError?.details,
    })
    // Reverter criação do grupo
    await admin.from('groups').delete().eq('id', group.id)
    return { error: `Erro ao configurar grupo: ${memberError?.message || 'Erro desconhecido'}`, success: false }
  }

  console.log('[createGroup] ✓ Membro adicionado')

  // Revalidar a página para mostrar o novo grupo
  revalidatePath('/admin')

  return { success: true, groupId: group.id, message: `✅ Grupo "${name}" criado com sucesso!` }
}

export async function addMember(formData: FormData) {
  const groupId = formData.get('groupId') as string
  const displayName = formData.get('displayName') as string
  const inviteEmail = formData.get('inviteEmail') as string

  // Validações básicas
  if (!groupId || !displayName || displayName.trim().length === 0) {
    return { error: 'Nome do membro é obrigatório', success: false }
  }

  // Validar e-mail (se fornecido)
  if (inviteEmail && inviteEmail.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail.trim())) {
      return { error: 'E-mail inválido', success: false }
    }
  }

  // Cliente para autenticação
  const supabase = await createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { error: 'Você precisa estar logado', success: false }
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
    return { error: 'Grupo não encontrado ou você não tem permissão', success: false }
  }

  // Verificar se já existe membro com esse nome no grupo
  const { data: existingMember } = await admin
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('display_name', displayName.trim())
    .single()

  if (existingMember) {
    return { error: 'Já existe um membro com esse nome no grupo', success: false }
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
    return { error: 'Erro ao adicionar membro. Tente novamente.', success: false }
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
    },
    message: `✅ Membro "${displayName}" adicionado com sucesso!`
  }
}

export async function linkMemberToEmail(formData: FormData) {
  const memberId = formData.get('memberId') as string
  const email = formData.get('email') as string

  if (!memberId || !email || email.trim().length === 0) {
    return { error: 'ID do membro e e-mail são obrigatórios', success: false }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return { error: 'E-mail inválido', success: false }
  }

  const supabase = createActionClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Você precisa estar logado', success: false }
  }

  const admin = supabaseAdmin()

  // Buscar o membro e verificar que o usuário logado é admin do grupo
  const { data: member } = await admin
    .from('group_members')
    .select('id, group_id, display_name, status, profile_id, groups!inner(admin_id)')
    .eq('id', memberId)
    .single()

  if (!member) {
    return { error: 'Membro não encontrado', success: false }
  }

  const groupAdminId = (member.groups as any)?.admin_id
  if (groupAdminId !== user.id) {
    return { error: 'Apenas o admin do grupo pode fazer isso', success: false }
  }

  if (member.profile_id) {
    return { error: 'Este membro já está vinculado a uma conta', success: false }
  }

  // Buscar o usuário pelo e-mail no Auth
  const { data: userList } = await admin.auth.admin.listUsers()
  const targetUser = userList?.users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())

  if (!targetUser) {
    return { error: `Nenhuma conta encontrada com o e-mail "${email.trim()}". O usuário precisa ter feito login pelo menos uma vez.`, success: false }
  }

  // Garantir que o profile existe
  const displayNameFallback = targetUser.user_metadata?.display_name || email.split('@')[0]
  await admin.from('profiles').upsert({ id: targetUser.id, display_name: displayNameFallback }, { onConflict: 'id' })

  // Vincular profile_id e ativar o membro
  const { error: updateError } = await admin
    .from('group_members')
    .update({
      profile_id: targetUser.id,
      invite_email: email.trim(),
      status: 'joined',
      joined_at: new Date().toISOString(),
    })
    .eq('id', memberId)

  if (updateError) {
    console.error('[linkMember] Erro ao vincular:', updateError)
    return { error: `Erro ao vincular: ${updateError.message}`, success: false }
  }

  console.log(`[linkMember] ✓ Membro "${member.display_name}" vinculado a ${email}`)
  revalidatePath('/admin')

  return { success: true, message: `✅ ${member.display_name} vinculado a ${email.trim()} com sucesso!` }
}

// ========================================
// SYNC API-FOOTBALL
// ========================================

const API_BASE = 'https://v3.football.api-sports.io'
const WORLD_CUP_LEAGUE_ID = 1
const SEASON = 'WC2026'
// Throttle para respeitar rate limit do API-Football
// Free Plan: 10 req/min = 1 req a cada 6 segundos
// Usando 6500ms para estar seguro (10 req em ~65s)
const THROTTLE_DELAY_MS = 6500

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

// IDs fictícios inseridos pelo sync-offline (não são IDs reais da API-Football)
// Precisam ser ignorados no cache para forçar uma busca real
const FAKE_IDS_FROM_OFFLINE_SYNC = new Set([2500, 2501, 2502, 2503])

// IDs errados que podem ter sido salvos por busca com match incorreto
// Ex: 657 = Beitar Jerusalem (Israel), não é a seleção dos EUA
const WRONG_IDS_TO_IGNORE = new Set([657])

// Mapeamento de nomes conhecidos da API que diferem da nossa lista
const COUNTRY_NAME_MAPPING: Record<string, string> = {
  'South Korea': 'Korea Republic',
  'DR Congo': 'Congo DR',
  'Czechia': 'Czech Republic',
  'Turkey': 'Türkiye',
  'Ivory Coast': "Cote D'Ivoire",
  'Cape Verde': 'Cape Verde Islands',
  'Bosnia & Herzegovina': 'Bosnia',
  'Curaçao': 'Curacao',
  'New Zealand': 'New Zealand',
  'USA': 'United States',
}

// IDs conhecidos hardcoded para países que a busca por nome falha
// Evita gastar requisições e erros de matching
const KNOWN_TEAM_IDS: Record<string, { id: number; apiName: string }> = {
  'South Korea': { id: 17, apiName: 'South Korea' },
  'USA': { id: 2384, apiName: 'USA' }, // Confirmado via Copa 2022 (league=1&season=2022)
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

  // Verificar rate limit
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || '60'
    throw new Error(`Rate limit atingido. Aguarde ${retryAfter}s antes de tentar novamente.`)
  }

  if (!response.ok) {
    throw new Error(`API-Football erro ${response.status}: ${response.statusText}`)
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
  const supabase = await createActionClient()
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
    console.log('[Sync] Passo 1: Resolvendo IDs das seleções de 2026...')

    // Cache em memória dos IDs resolvidos
    const teamIdMap = new Map<string, { id: number; apiName: string }>()

    // Verificar times já sincronizados no banco
    console.log('[Sync] Verificando times já sincronizados...')
    const { data: existingTeams } = await admin
      .from('teams')
      .select('country, id, api_name, synced_at')
      .eq('season', SEASON)
      .eq('national', true)

    const existingCountries = new Set<string>()
    if (existingTeams) {
      for (const team of existingTeams) {
        // Ignorar IDs fictícios inseridos pelo sync-offline (2500–2503)
        // Esses IDs não existem na API-Football e retornariam squad vazio
        if (FAKE_IDS_FROM_OFFLINE_SYNC.has(team.id)) {
          console.log(`[Sync] ⚠️ ${team.country} tem ID fictício (${team.id}), vai rebuscar`)
          continue
        }
        // Ignorar IDs errados (ex: 657 = Beitar Jerusalem, não é a seleção dos EUA)
        if (WRONG_IDS_TO_IGNORE.has(team.id)) {
          console.log(`[Sync] ⚠️ ${team.country} tem ID errado (${team.id}), vai rebuscar`)
          continue
        }
        const country = team.country
        teamIdMap.set(country, { id: team.id, apiName: team.api_name })
        existingCountries.add(country)
        console.log(`[Sync] ✓ ${country} (já sincronizado, ID: ${team.id})`)
      }
    }

    // Buscar apenas países pendentes
    const pendingCountries = WORLD_CUP_2026_COUNTRIES.filter(
      (c) => !existingCountries.has(c)
    )
    console.log(`[Sync] Pendentes: ${pendingCountries.length} de 48`)

    // Buscar cada seleção da lista pendente
    for (const country of pendingCountries) {
      // Primeiro verificar se temos o ID hardcoded (evita busca e erro de matching)
      if (KNOWN_TEAM_IDS[country]) {
        const { id: teamId, apiName: teamName } = KNOWN_TEAM_IDS[country]
        teamIdMap.set(country, { id: teamId, apiName: teamName })
        console.log(`[Sync] ✓ ${country} → ID ${teamId} (${teamName}) [hardcoded]`)
        continue
      }

      const searchName = COUNTRY_NAME_MAPPING[country] || country
      console.log(`[Sync] Buscando "${searchName}"...`)

      try {
        await sleep(THROTTLE_DELAY_MS)
        const searchResults = await apiFootballGet('/teams', { search: searchName })

        // Filtrar por seleção nacional, excluindo times femininos e sub-categorias
        const nationalTeam = searchResults.find((item: any) => {
          const isNational = item.team?.national === true
          const teamName: string = item.team?.name || ''
          const isSub = / [WU]\d*$/.test(teamName) ||
            teamName.includes(' U20') || teamName.includes(' U17') ||
            teamName.includes(' U23') || teamName.includes(' Women')
          return isNational && !isSub
        })

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

    console.log(`[Sync] Times encontrados: ${results.teamsResolved} / 48`)
    console.log(`[Sync] Salvando cache de times...`)
    for (const [country, { id, apiName }] of Array.from(teamIdMap.entries())) {
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

    // Verificar times que já têm jogadores sincronizados
    const { data: allPlayers } = await admin
      .from('players')
      .select('team_id')
      .eq('season', SEASON)

    const teamsAlreadySynced = new Set<number>()
    if (allPlayers) {
      for (const { team_id } of allPlayers) {
        teamsAlreadySynced.add(team_id)
      }
    }

    const teamsToSync = Array.from(teamIdMap.entries()).filter(
      ([_, { id: teamId }]) => !teamsAlreadySynced.has(teamId)
    )

    console.log(`[Sync] ${teamsToSync.length} times precisam sincronizar elencos`)
    if (teamsToSync.length < teamIdMap.size) {
      console.log(`[Sync] ${teamsAlreadySynced.size} times já têm jogadores (pulando)`)
    }

    let totalPlayersInserted = 0

    for (const [country, { id: teamId, apiName: teamName }] of teamsToSync) {
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

        // Inserir jogadores (upsert por id da API)
        for (const player of players) {
          const playerData = {
            id: player.id, // player_id da API, é a primary key
            name: player.name,
            team_id: teamId,
            team_name: teamName,
            position: mapPosition(player.position), // GK/ZAG/LAT/MEI/ATK
            api_position: player.position, // Goalkeeper/Defender/Midfielder/Attacker (original)
            age: player.age || null,
            number: player.number || null,
            photo_url: player.photo || null,
            api_player_id: player.id, // Redundante com id, mas usamos se necessário depois
            season: SEASON,
            synced_at: new Date().toISOString(),
          }

          // Upsert pela primary key (id)
          const { error } = await admin
            .from('players')
            .upsert(playerData, { onConflict: 'id' })

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

    // Preparar mensagem de sucesso
    const successMsg = `✅ Sincronização concluída! ${results.teamsResolved} seleções, ${results.playersInserted} jogadores.${results.teamsPending.length > 0 ? ` (${results.teamsPending.length} seleções pendentes)` : ''}`

    return {
      success: true,
      message: successMsg,
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
