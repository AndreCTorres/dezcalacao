import { describe, it, expect } from '@playwright/test'
import {
  effectiveRating,
  basePoints,
  selecaoDaRodada,
  DEFAULT_CONFIG,
  type PlayerRating,
  type LineupSlot,
} from '@/lib/scoring'

/**
 * Testes Unitários: Lógica Pura de Pontuação
 * 
 * Verifica funções de cálculo sem dependência de banco
 */

describe('Scoring Logic', () => {
  const config = DEFAULT_CONFIG // minMinutos: 20, neutralRating: 6.0

  describe('effectiveRating()', () => {
    it('retorna rating quando jogador jogou >= minMinutos', () => {
      const player: PlayerRating = {
        playerId: 1,
        teamId: 1,
        position: 'ATK',
        rating: 8.5,
        minutes: 90,
      }

      const result = effectiveRating(player, config)
      expect(result).toBe(8.5)
    })

    it('retorna 0 quando jogador jogou < minMinutos', () => {
      const player: PlayerRating = {
        playerId: 1,
        teamId: 1,
        position: 'ATK',
        rating: 7.0,
        minutes: 15, // < 20
      }

      const result = effectiveRating(player, config)
      expect(result).toBe(0)
    })

    it('retorna neutralRating quando nota é null', () => {
      const player: PlayerRating = {
        playerId: 1,
        teamId: 1,
        position: 'ATK',
        rating: null,
        minutes: 90,
      }

      const result = effectiveRating(player, config)
      expect(result).toBe(config.neutralRating) // 6.0
    })

    it('retorna 0 quando jogador não jogou (minutes = 0)', () => {
      const player: PlayerRating = {
        playerId: 1,
        teamId: 1,
        position: 'ATK',
        rating: 8.0,
        minutes: 0,
      }

      const result = effectiveRating(player, config)
      expect(result).toBe(0)
    })
  })

  describe('basePoints()', () => {
    it('soma pontos de 11 titulares', () => {
      const lineup: LineupSlot[] = [
        { playerId: 1, position: 'GK', slot: 'starter' },
        { playerId: 2, position: 'ZAG', slot: 'starter' },
        { playerId: 3, position: 'ZAG', slot: 'starter' },
        { playerId: 4, position: 'LAT', slot: 'starter' },
        { playerId: 5, position: 'LAT', slot: 'starter' },
        { playerId: 6, position: 'MEI', slot: 'starter' },
        { playerId: 7, position: 'MEI', slot: 'starter' },
        { playerId: 8, position: 'MEI', slot: 'starter' },
        { playerId: 9, position: 'ATK', slot: 'starter' },
        { playerId: 10, position: 'ATK', slot: 'starter' },
        { playerId: 11, position: 'ATK', slot: 'starter' },
      ]

      const ratings = new Map<number, PlayerRating>([
        [1, { playerId: 1, teamId: 1, position: 'GK', rating: 7.0, minutes: 90 }],
        [2, { playerId: 2, teamId: 1, position: 'ZAG', rating: 6.5, minutes: 90 }],
        [3, { playerId: 3, teamId: 1, position: 'ZAG', rating: 6.0, minutes: 90 }],
        [4, { playerId: 4, teamId: 1, position: 'LAT', rating: 7.5, minutes: 90 }],
        [5, { playerId: 5, teamId: 1, position: 'LAT', rating: 6.0, minutes: 90 }],
        [6, { playerId: 6, teamId: 1, position: 'MEI', rating: 8.0, minutes: 90 }],
        [7, { playerId: 7, teamId: 1, position: 'MEI', rating: 7.0, minutes: 90 }],
        [8, { playerId: 8, teamId: 1, position: 'MEI', rating: 6.5, minutes: 90 }],
        [9, { playerId: 9, teamId: 1, position: 'ATK', rating: 8.5, minutes: 90 }],
        [10, { playerId: 10, teamId: 1, position: 'ATK', rating: 7.5, minutes: 90 }],
        [11, { playerId: 11, teamId: 1, position: 'ATK', rating: 6.0, minutes: 90 }],
      ])

      const result = basePoints(lineup, ratings, config)

      // 7.0 + 6.5 + 6.0 + 7.5 + 6.0 + 8.0 + 7.0 + 6.5 + 8.5 + 7.5 + 6.0 = 76.5
      expect(result).toBe(76.5)
    })

    it('ignora reservas (bench)', () => {
      const lineup: LineupSlot[] = [
        { playerId: 1, position: 'GK', slot: 'starter' },
        { playerId: 2, position: 'ZAG', slot: 'bench' }, // ignorado
      ]

      const ratings = new Map<number, PlayerRating>([
        [1, { playerId: 1, teamId: 1, position: 'GK', rating: 8.0, minutes: 90 }],
        [2, { playerId: 2, teamId: 1, position: 'ZAG', rating: 10.0, minutes: 90 }],
      ])

      const result = basePoints(lineup, ratings, config)
      expect(result).toBe(8.0) // Apenas o GK
    })

    it('retorna 0 quando nenhum jogador tem rating', () => {
      const lineup: LineupSlot[] = [
        { playerId: 1, position: 'GK', slot: 'starter' },
      ]

      const ratings = new Map<number, PlayerRating>() // vazio

      const result = basePoints(lineup, ratings, config)
      expect(result).toBe(0)
    })
  })

  describe('selecaoDaRodada()', () => {
    it('retorna XI com 1 GK, 2 ZAG, 2 LAT, 3 MEI, 3 ATK', () => {
      const players: PlayerRating[] = [
        // GK: 2 candidatos
        { playerId: 1, teamId: 1, position: 'GK', rating: 8.0, minutes: 90 },
        { playerId: 2, teamId: 1, position: 'GK', rating: 7.5, minutes: 90 },
        // ZAG: 3 candidatos
        { playerId: 3, teamId: 1, position: 'ZAG', rating: 8.5, minutes: 90 },
        { playerId: 4, teamId: 1, position: 'ZAG', rating: 8.0, minutes: 90 },
        { playerId: 5, teamId: 1, position: 'ZAG', rating: 7.0, minutes: 90 },
        // LAT: 2 candidatos
        { playerId: 6, teamId: 1, position: 'LAT', rating: 8.2, minutes: 90 },
        { playerId: 7, teamId: 1, position: 'LAT', rating: 7.8, minutes: 90 },
        // MEI: 4 candidatos
        { playerId: 8, teamId: 1, position: 'MEI', rating: 8.8, minutes: 90 },
        { playerId: 9, teamId: 1, position: 'MEI', rating: 8.3, minutes: 90 },
        { playerId: 10, teamId: 1, position: 'MEI', rating: 7.9, minutes: 90 },
        { playerId: 11, teamId: 1, position: 'MEI', rating: 7.0, minutes: 90 },
        // ATK: 3 candidatos
        { playerId: 12, teamId: 1, position: 'ATK', rating: 9.0, minutes: 90 },
        { playerId: 13, teamId: 1, position: 'ATK', rating: 8.5, minutes: 90 },
        { playerId: 14, teamId: 1, position: 'ATK', rating: 8.0, minutes: 90 },
      ]

      const result = selecaoDaRodada(players)

      // Esperado: 1 GK (id 1), 2 ZAG (3, 4), 2 LAT (6, 7), 3 MEI (8, 9, 10), 3 ATK (12, 13, 14)
      expect(result.size).toBe(11)
      expect(result.has(1)).toBe(true) // GK com maior nota
      expect(result.has(3)).toBe(true) // ZAG 1
      expect(result.has(4)).toBe(true) // ZAG 2
      expect(result.has(6)).toBe(true) // LAT 1
      expect(result.has(7)).toBe(true) // LAT 2
      expect(result.has(8)).toBe(true) // MEI 1 (maior)
      expect(result.has(9)).toBe(true) // MEI 2
      expect(result.has(10)).toBe(true) // MEI 3
      expect(result.has(12)).toBe(true) // ATK 1 (maior)
      expect(result.has(13)).toBe(true) // ATK 2
      expect(result.has(14)).toBe(true) // ATK 3
    })

    it('ignora jogadores com menos de 20 minutos', () => {
      const players: PlayerRating[] = [
        { playerId: 1, teamId: 1, position: 'GK', rating: 9.0, minutes: 90 }, // valido
        { playerId: 2, teamId: 1, position: 'GK', rating: 8.5, minutes: 10 }, // invalido (<20)
      ]

      const result = selecaoDaRodada(players)
      expect(result.has(1)).toBe(true)
      expect(result.has(2)).toBe(false)
    })

    it('ignora jogadores com rating null', () => {
      const players: PlayerRating[] = [
        { playerId: 1, teamId: 1, position: 'GK', rating: 8.0, minutes: 90 }, // valido
        { playerId: 2, teamId: 1, position: 'GK', rating: null, minutes: 90 }, // invalido (null)
      ]

      const result = selecaoDaRodada(players)
      expect(result.has(1)).toBe(true)
      expect(result.has(2)).toBe(false)
    })
  })
})
