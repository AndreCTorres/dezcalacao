type SupabaseAdmin = ReturnType<typeof import('@/lib/supabase-server').supabaseAdmin>

type RoundRow = {
  id: string
  name: string
  status: string
}

type MemberRow = {
  id: string
  display_name: string
}

type TeamPlayerRow = {
  group_member_id: string
  player_id: number
  slot: 'starter' | 'bench'
}

type SubstitutionRow = {
  group_member_id: string
  round_id: string
  out_player_id: number
  in_player_id: number
}

type RatingRow = {
  round_id: string
  player_id: number
  rating: number | string | null
  minutes: number | null
}

type StoredScoreRow = {
  group_member_id: string
  round_id: string
  total_points: number | string | null
}

export type LiveRoundScore = {
  roundId: string
  roundName: string
  status: string
  scores: Array<{
    memberId: string
    memberName: string
    points: number
  }>
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function key(roundId: string, playerId: number) {
  return `${roundId}:${playerId}`
}

export async function getLiveRoundScores(admin: SupabaseAdmin, groupId: string): Promise<LiveRoundScore[]> {
  const { data: group } = await admin
    .from('groups')
    .select('min_minutos')
    .eq('id', groupId)
    .single()

  const minMinutes = Number((group as any)?.min_minutos ?? 20)

  const { data: rounds } = await admin
    .from('rounds')
    .select('id, name, status')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (!rounds || rounds.length === 0) return []

  const { data: members } = await admin
    .from('group_members')
    .select('id, display_name')
    .eq('group_id', groupId)
    .eq('status', 'joined')

  if (!members || members.length === 0) return []

  const typedRounds = rounds as RoundRow[]
  const typedMembers = members as MemberRow[]
  const roundIds = typedRounds.map((round) => round.id)
  const memberIds = typedMembers.map((member) => member.id)

  const { data: teamPlayers } = await admin
    .from('team_players')
    .select('group_member_id, player_id, slot')
    .in('group_member_id', memberIds)

  const typedTeamPlayers = (teamPlayers ?? []) as TeamPlayerRow[]
  const allPlayerIds = Array.from(new Set(typedTeamPlayers.map((player) => player.player_id)))

  const { data: substitutions } = await admin
    .from('substitutions')
    .select('group_member_id, round_id, out_player_id, in_player_id')
    .in('group_member_id', memberIds)
    .in('round_id', roundIds)

  const { data: postRoundSwaps } = await admin
    .from('post_round_swaps')
    .select('group_member_id, round_id, out_player_id, in_player_id')
    .in('group_member_id', memberIds)
    .in('round_id', roundIds)

  const { data: ratings } = allPlayerIds.length > 0
    ? await admin
        .from('player_round_ratings')
        .select('round_id, player_id, rating, minutes')
        .in('round_id', roundIds)
        .in('player_id', allPlayerIds)
    : { data: [] }

  const { data: storedScores } = await admin
    .from('round_scores')
    .select('group_member_id, round_id, total_points')
    .in('round_id', roundIds)
    .in('group_member_id', memberIds)

  const playersByMember = new Map<string, TeamPlayerRow[]>()
  typedTeamPlayers.forEach((player) => {
    const current = playersByMember.get(player.group_member_id) ?? []
    current.push(player)
    playersByMember.set(player.group_member_id, current)
  })

  const substitutionsByRoundMember = new Map<string, Map<number, number>>()
  ;((substitutions ?? []) as SubstitutionRow[]).forEach((substitution) => {
    const mapKey = `${substitution.round_id}:${substitution.group_member_id}`
    const current = substitutionsByRoundMember.get(mapKey) ?? new Map<number, number>()
    current.set(substitution.out_player_id, substitution.in_player_id)
    substitutionsByRoundMember.set(mapKey, current)
  })

  const postSwapsByRoundMember = new Map<string, Map<number, number>>()
  ;((postRoundSwaps ?? []) as SubstitutionRow[]).forEach((swap) => {
    const mapKey = `${swap.round_id}:${swap.group_member_id}`
    const current = postSwapsByRoundMember.get(mapKey) ?? new Map<number, number>()
    current.set(swap.out_player_id, swap.in_player_id)
    postSwapsByRoundMember.set(mapKey, current)
  })

  const ratingsByRoundPlayer = new Map<string, RatingRow>()
  ;((ratings ?? []) as RatingRow[]).forEach((rating) => {
    ratingsByRoundPlayer.set(key(rating.round_id, rating.player_id), rating)
  })

  const storedScoresByRoundMember = new Map<string, number>()
  ;((storedScores ?? []) as StoredScoreRow[]).forEach((score) => {
    const points = Number(score.total_points)
    if (Number.isFinite(points)) {
      storedScoresByRoundMember.set(`${score.round_id}:${score.group_member_id}`, points)
    }
  })

  return typedRounds.map((round) => {
    const scores = typedMembers
      .map((member) => {
        const starters = (playersByMember.get(member.id) ?? []).filter((player) => player.slot === 'starter')
        const substitutionsForMember = substitutionsByRoundMember.get(`${round.id}:${member.id}`) ?? new Map()
        const postSwapsForMember = postSwapsByRoundMember.get(`${round.id}:${member.id}`) ?? new Map()

        let points = 0
        let hasSourceRating = false

        starters.forEach((starter) => {
          const preSubPlayerId = substitutionsForMember.get(starter.player_id) ?? starter.player_id
          const playerId = postSwapsForMember.get(preSubPlayerId) ?? preSubPlayerId
          const rating = ratingsByRoundPlayer.get(key(round.id, playerId))
          const playerRating = Number(rating?.rating)
          const minutes = Number(rating?.minutes ?? 0)

          if (Number.isFinite(playerRating)) hasSourceRating = true
          if (Number.isFinite(playerRating) && minutes >= minMinutes) {
            points += playerRating
          }
        })

        const fallback = storedScoresByRoundMember.get(`${round.id}:${member.id}`) ?? 0

        return {
          memberId: member.id,
          memberName: member.display_name,
          points: round2(hasSourceRating ? points : fallback),
        }
      })
      .filter((score) => score.points > 0)
      .sort((a, b) => b.points - a.points)

    return {
      roundId: round.id,
      roundName: round.name,
      status: round.status,
      scores,
    }
  })
}
