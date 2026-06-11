/**
 * Tipos compartilhados do projeto Dezcalação
 * Espelham o schema do Supabase
 */

// ============================================================================
// Autenticação & Usuários
// ============================================================================

export type Profile = {
  id: string // UUID do auth.users
  display_name: string
  created_at: string
}

// ============================================================================
// Grupos & Membros
// ============================================================================

export type GroupStatus = 'setup' | 'drafting' | 'active' | 'finished'
export type GroupMemberRole = 'player' | 'admin'
export type GroupMemberStatus = 'invited' | 'joined'

export type Group = {
  id: string
  name: string
  admin_id: string
  season: string
  status: GroupStatus
  bonus_selecao_rodada: boolean
  bonus_craque_partida: boolean
  max_subs_por_rodada: number
  min_minutos: number
  created_at: string
}

export type GroupMember = {
  id: string
  group_id: string
  profile_id: string | null // null se convidado sem conta
  display_name: string
  invite_email: string | null
  role: GroupMemberRole
  status: GroupMemberStatus
  joined_at: string | null
}

export type GroupWithMembers = Group & {
  group_members: GroupMember[]
}

// ============================================================================
// Posições & Jogadores
// ============================================================================

export type Position = 'GK' | 'ZAG' | 'LAT' | 'MEI' | 'ATK'

export const POSITION_LABELS: Record<Position, string> = {
  GK: 'Goleiro',
  ZAG: 'Zagueiro',
  LAT: 'Lateral',
  MEI: 'Meio-campo',
  ATK: 'Ataque',
}

export type Player = {
  api_player_id: number // Primary key da API
  name: string
  team_id: number
  team_name: string
  api_position: string // "Goalkeeper", "Defender", "Midfielder", "Attacker"
  position: Position // GK, ZAG, LAT, MEI, ATK
  age?: number
  number?: number
  photo_url?: string
  season: string
  synced_at: string
}

// ============================================================================
// Draft (Team Players)
// ============================================================================

export type PlayerSlot = 'starter' | 'bench'

export type TeamPlayer = {
  id: string
  group_member_id: string
  player_id: number // Referencia Player.api_player_id
  slot: PlayerSlot
  position_slot: Position
  created_at: string
}

export type TeamPlayerWithDetails = TeamPlayer & {
  player: Player
}

// ============================================================================
// Rodadas
// ============================================================================

export type RoundStatus = 'open' | 'locked' | 'scored'

export type Round = {
  id: string
  group_id: string
  name: string
  starts_at?: string
  locked_at?: string
  status: RoundStatus
  created_at: string
}

export type Fixture = {
  id: number // ID da API
  round_id?: string
  home_team: string
  away_team: string
  kickoff?: string
  status: string
}

// ============================================================================
// Ratings & Pontuação
// ============================================================================

export type PlayerRoundRating = {
  id: string
  player_id: number
  round_id: string
  fixture_id?: number
  rating: number | null // Ex: 8.70, null se ainda não saiu
  minutes: number
  source: string
  fetched_at: string
}

export type RoundScore = {
  id: string
  group_member_id: string
  round_id: string
  base_points: number
  bonus_points: number
  total_points: number
  computed_at: string
}

// ============================================================================
// Substituições
// ============================================================================

export type Substitution = {
  id: string
  group_member_id: string
  round_id: string
  out_player_id: number
  in_player_id: number
  position_slot: Position
  created_at: string
}

// ============================================================================
// Configuração de Pontuação (do Grupo)
// ============================================================================

export type ScoringConfig = {
  minMinutes: number // Ex: 20
  neutralRating: number // Ex: 6.0 (quando nota não saiu)
  bonusSelecaoRodada: boolean
  bonusCraquePartida: boolean
  pointsSelecaoRodada: number // Ex: 1.0
  pointsCraquePartida: number // Ex: 1.0
}

// ============================================================================
// Equipes (Cache da API)
// ============================================================================

export type Team = {
  id: number // ID da API
  name: string
  country: string
  api_name: string
  national: boolean
  season: string
  synced_at: string
}

// ============================================================================
// Server Actions Responses
// ============================================================================

export type ActionResponse<T = unknown> = {
  success: boolean
  error?: string
  data?: T
}

export type CreateGroupResponse = ActionResponse<{
  groupId: string
}>

export type AddMemberResponse = ActionResponse<{
  id: string
  display_name: string
  status: GroupMemberStatus
  role: GroupMemberRole
}>

export type SyncPlayersResponse = ActionResponse<{
  teamsResolved: number
  teamsPending: string[]
  playersInserted: number
  errors: string[]
}>

// ============================================================================
// Lineup (Escalação)
// ============================================================================

export type LineupSlot = {
  playerId: number
  position: Position
  slot: PlayerSlot
}

export type Lineup = LineupSlot[]

// ============================================================================
// Classificação (Standings)
// ============================================================================

export type Standing = {
  memberId: string
  memberName: string
  totalPoints: number
  roundsPlayed: number
  lastRoundPoints: number
}
