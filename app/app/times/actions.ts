'use server'

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'
import type { PitchPlayer } from '@/app/app/pitch-view'

function normalizeRatingKey(name?: string | null, teamName?: string | null) {
  return `${name ?? ''}|${teamName ?? ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function getParticipantTeam(groupId: string, selectedMemberId: string) {
  const supabase = await createActionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Nao autenticado', team: [] as PitchPlayer[] }

  const admin = supabaseAdmin()

  const { data: ownMembership } = await admin
    .from('group_members')
    .select('id')
    .eq('profile_id', user.id)
    .eq('group_id', groupId)
    .eq('status', 'joined')
    .limit(1)
    .maybeSingle()

  if (!ownMembership) {
    return { success: false, error: 'Sem permissao para ver este grupo', team: [] as PitchPlayer[] }
  }

  const { data: selectedMember } = await admin
    .from('group_members')
    .select('id')
    .eq('id', selectedMemberId)
    .eq('group_id', groupId)
    .limit(1)
    .maybeSingle()

  if (!selectedMember) {
    return { success: false, error: 'Participante nao encontrado', team: [] as PitchPlayer[] }
  }

  const { data: team } = await admin
    .from('team_players')
    .select(`
      id,
      player_id,
      slot,
      position_slot,
      players (
        id,
        name,
        team_name,
        position,
        photo_url,
        number
      )
    `)
    .eq('group_member_id', selectedMemberId)
    .order('slot', { ascending: false })

  const { data: latestRound } = await admin
    .from('rounds')
    .select('id, name, status, created_at')
    .eq('group_id', groupId)
    .eq('status', 'scored')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ratingsMap: Record<number, { rating: number | null; minutes: number | null }> = {}
  const ratingsByPlayerKey: Record<string, { rating: number | null; minutes: number | null }> = {}

  if (latestRound && team && team.length > 0) {
    const { data: ratings } = await admin
      .from('player_round_ratings')
      .select('player_id, rating, minutes, players ( name, team_name )')
      .eq('round_id', latestRound.id)

    for (const rating of ratings ?? []) {
      if (rating.rating != null) ratingsMap[rating.player_id] = { rating: rating.rating, minutes: rating.minutes }
      const player = Array.isArray(rating.players) ? rating.players[0] : rating.players
      const key = normalizeRatingKey(player?.name, player?.team_name)
      if (key && rating.rating != null) ratingsByPlayerKey[key] = { rating: rating.rating, minutes: rating.minutes }
    }
  }

  let teamForDisplay = team ?? []
  if (latestRound && teamForDisplay.length > 0) {
    const { data: postRoundSwaps } = await admin
      .from('post_round_swaps')
      .select('out_player_id, in_player_id')
      .eq('group_member_id', selectedMemberId)
      .eq('round_id', latestRound.id)

    if (postRoundSwaps && postRoundSwaps.length > 0) {
      const swapsMap = new Map(postRoundSwaps.map((swap) => [swap.out_player_id, swap.in_player_id]))
      teamForDisplay = teamForDisplay.map((tp: any) => {
        const replacementId = swapsMap.get(tp.player_id)
        if (!replacementId || tp.slot !== 'starter') return tp

        const replacement = teamForDisplay.find((candidate: any) => candidate.player_id === replacementId)
        if (!replacement) return tp

        return {
          ...tp,
          player_id: replacement.player_id,
          players: replacement.players,
        }
      })
    }
  }

  return {
    success: true,
    team: teamForDisplay.map((tp: any) => {
      const ratingData =
        ratingsMap[tp.player_id] ??
        ratingsByPlayerKey[normalizeRatingKey(tp.players?.name, tp.players?.team_name)] ??
        null
      return {
        ...tp,
        rating: ratingData?.rating ?? null,
        minutes: ratingData?.minutes ?? null,
      }
    }) as PitchPlayer[],
  }
}
