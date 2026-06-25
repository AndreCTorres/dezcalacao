'use client'

// app/app/member-round-checker.tsx
// Verificador simples de ratings por membro
// Pode ser usado como modal/tab para conferÃªncia rÃ¡pida

import { useMemo } from 'react'
import { RoundVerification, type VerificationPlayer } from './round-verification'

export type MemberRoundData = {
  memberId: string
  memberName: string
  round: number
  starters: Array<{
    id: string
    player_id: number
    slot: 'starter' | 'bench'
    position_slot: string
    rating?: number | null
    minutes?: number
    players: {
      id: number
      name: string
      team_name: string
      position: string
    }
  }>
  bench: Array<{
    id: string
    player_id: number
    slot: 'starter' | 'bench'
    position_slot: string
    rating?: number | null
    minutes?: number
    players: {
      id: number
      name: string
      team_name: string
      position: string
    }
  }>
  substitutions?: Array<{
    out_player_id: number
    in_player_id: number
  }>
}

interface MemberRoundCheckerProps {
  data: MemberRoundData
  onClose?: () => void
}

export function MemberRoundChecker({ data, onClose }: MemberRoundCheckerProps) {
  const stats = useMemo(() => {
    const allPlayers = [...data.starters, ...data.bench]
    const withRating = allPlayers.filter(p => p.rating != null)
    const scoringStarters = data.starters.filter(p => p.rating != null)
    const effectiveCount = data.starters.length + (data.substitutions?.length || 0)

    return {
      totalPlayers: allPlayers.length,
      withRating: withRating.length,
      scoreTotal: scoringStarters.reduce((sum, p) => sum + (p.rating ?? 0), 0),
      completionPercent: (withRating.length / effectiveCount) * 100,
    }
  }, [data])

  return (
    <div className="space-y-4">
      {/* CabeÃ§alho com botÃ£o de fechar */}
      {onClose && (
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">
            ðŸ” ConferÃªncia â€” {data.memberName} â€¢ Rodada {data.round}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition text-2xl leading-none"
          >
            âœ•
          </button>
        </div>
      )}

      {/* EstatÃ­sticas rÃ¡pidas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg p-3">
          <p className="text-xs text-lime-400 font-bold uppercase">Cobertura</p>
          <p className="text-2xl font-bold text-lime-400 mt-1">
            {stats.completionPercent.toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.withRating}/{data.starters.length + (data.substitutions?.length || 0)}
          </p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-xs text-yellow-400 font-bold uppercase">Total</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {stats.scoreTotal.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">pts</p>
        </div>
      </div>

      {/* Componente de verificaÃ§Ã£o principal */}
      <RoundVerification
        memberName={data.memberName}
        round={data.round}
        starters={data.starters as VerificationPlayer[]}
        bench={data.bench as VerificationPlayer[]}
        substitutions={data.substitutions}
      />

      {/* Dicas de conferÃªncia */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-2">
        <p className="text-xs font-bold text-blue-400">ðŸ’¡ Dicas de ConferÃªncia</p>
        <ul className="text-xs text-blue-300 space-y-1">
          <li>â€¢ <strong>âœ…</strong> = Tem nota</li>
          <li>â€¢ <strong>â­</strong> = Nota excelente (â‰¥8.0)</li>
          <li>â€¢ <strong>âŒ</strong> = Falta nota</li>
          <li>â€¢ <strong>SAIU</strong> = Foi substituÃ­do nessa rodada</li>
        </ul>
      </div>

      {/* AÃ§Ã£o de exportaÃ§Ã£o/impressÃ£o */}
      <button
        onClick={() => window.print()}
        className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition"
      >
        ðŸ–¨ï¸ Imprimir/Exportar
      </button>
    </div>
  )
}
