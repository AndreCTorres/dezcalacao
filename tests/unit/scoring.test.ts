import { test, expect } from '@playwright/test'
import {
  DEFAULT_CONFIG,
  basePoints,
  effectiveRating,
  selecaoDaRodada,
  type LineupSlot,
  type PlayerRating,
} from '@/lib/scoring'

const describe = test.describe
const it = test

describe('Scoring Logic', () => {
  const config = DEFAULT_CONFIG

  describe('effectiveRating()', () => {
    it('retorna rating quando existe nota', () => {
      const player: PlayerRating = {
        playerId: 1,
        teamId: 1,
        position: 'ATK',
        rating: 8.5,
        minutes: 1,
      }

      expect(effectiveRating(player, config)).toBe(8.5)
    })

    it('retorna neutralRating quando nota e null', () => {
      const player: PlayerRating = {
        playerId: 1,
        teamId: 1,
        position: 'ATK',
        rating: null,
        minutes: 90,
      }

      expect(effectiveRating(player, config)).toBe(config.neutralRating)
    })
  })

  describe('basePoints()', () => {
    it('soma pontos dos titulares com nota, sem filtrar minutos', () => {
      const lineup: LineupSlot[] = [
        { playerId: 1, position: 'GK', slot: 'starter' },
        { playerId: 2, position: 'ATK', slot: 'starter' },
        { playerId: 3, position: 'MEI', slot: 'bench' },
      ]

      const ratings = new Map<number, PlayerRating>([
        [1, { playerId: 1, teamId: 1, position: 'GK', rating: 7.0, minutes: 90 }],
        [2, { playerId: 2, teamId: 1, position: 'ATK', rating: 6.8, minutes: 9 }],
        [3, { playerId: 3, teamId: 1, position: 'MEI', rating: 10.0, minutes: 90 }],
      ])

      expect(basePoints(lineup, ratings, config)).toBe(13.8)
    })

    it('retorna 0 quando nenhum jogador tem rating carregado', () => {
      const lineup: LineupSlot[] = [
        { playerId: 1, position: 'GK', slot: 'starter' },
      ]

      expect(basePoints(lineup, new Map(), config)).toBe(0)
    })
  })

  describe('selecaoDaRodada()', () => {
    it('escolhe os melhores por posicao independentemente dos minutos', () => {
      const players: PlayerRating[] = [
        { playerId: 1, teamId: 1, position: 'GK', rating: 8.0, minutes: 90 },
        { playerId: 2, teamId: 1, position: 'GK', rating: 9.0, minutes: 1 },
        { playerId: 3, teamId: 1, position: 'ZAG', rating: 8.5, minutes: 90 },
        { playerId: 4, teamId: 1, position: 'ZAG', rating: 8.0, minutes: 90 },
        { playerId: 5, teamId: 1, position: 'LAT', rating: 8.2, minutes: 90 },
        { playerId: 6, teamId: 1, position: 'LAT', rating: 7.8, minutes: 90 },
        { playerId: 7, teamId: 1, position: 'MEI', rating: 8.8, minutes: 90 },
        { playerId: 8, teamId: 1, position: 'MEI', rating: 8.3, minutes: 90 },
        { playerId: 9, teamId: 1, position: 'MEI', rating: 7.9, minutes: 90 },
        { playerId: 10, teamId: 1, position: 'ATK', rating: 9.0, minutes: 90 },
        { playerId: 11, teamId: 1, position: 'ATK', rating: 8.5, minutes: 90 },
        { playerId: 12, teamId: 1, position: 'ATK', rating: 8.0, minutes: 90 },
      ]

      const result = selecaoDaRodada(players)

      expect(result.size).toBe(11)
      expect(result.has(2)).toBe(true)
      expect(result.has(1)).toBe(false)
    })

    it('ignora jogadores com rating null', () => {
      const players: PlayerRating[] = [
        { playerId: 1, teamId: 1, position: 'GK', rating: 8.0, minutes: 90 },
        { playerId: 2, teamId: 1, position: 'GK', rating: null, minutes: 90 },
      ]

      const result = selecaoDaRodada(players)
      expect(result.has(1)).toBe(true)
      expect(result.has(2)).toBe(false)
    })
  })
})
