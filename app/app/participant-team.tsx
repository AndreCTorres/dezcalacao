'use client'

// app/app/participant-team.tsx
// Exibe o time do participante (titulares + reservas)

import Link from 'next/link'
import { PlayerPhoto } from './player-photo'

type TeamPlayer = {
  id: string
  player_id: number
  slot: string
  position_slot: string
  players: {
    id: number
    name: string
    team_name: string
    position: string
    photo_url: string | null
    number: number | null
  }
}

type ParticipantTeamProps = {
  team: TeamPlayer[]
}

export function ParticipantTeam({ team }: ParticipantTeamProps) {
  const starters = team.filter(t => t.slot === 'starter')
  const bench = team.filter(t => t.slot === 'bench')

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Seu Time</h2>
        {team.length > 0 && (
          <Link
            href="#trocas-pos-rodada"
            className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-gray-900 font-semibold rounded-lg transition text-sm"
          >
            🔄 Substituições
          </Link>
        )}
      </div>

      {team.length === 0 ? (
        <p className="text-gray-400 text-center py-8">Seu time ainda não foi definido. Aguarde o draft!</p>
      ) : (
        <>
          {/* Titulares */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-lime-400 mb-4">
              Titulares ({starters.length} / 11)
            </h3>
            <div className="space-y-2">
              {starters.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum titular</p>
              ) : (
                starters.map(tp => (
                  <PlayerCard key={tp.id} player={tp.players} number={tp.players.number} />
                ))
              )}
            </div>
          </div>

          {/* Reservas */}
          <div className="pt-8 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-gray-400 mb-4">
              Reservas ({bench.length} / 5)
            </h3>
            <div className="space-y-2">
              {bench.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum reserva</p>
              ) : (
                bench.map(tp => (
                  <PlayerCard key={tp.id} player={tp.players} number={tp.players.number} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PlayerCard({ player, number }: { player: any; number: number | null }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition">
      {player.photo_url ? (
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-600">
          <PlayerPhoto
            src={player.photo_url}
            alt={player.name}
            size={48}
            className="w-full h-full object-cover object-top"
            fallbackClassName="text-xs"
          />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0 text-lg">
          👤
        </div>
      )}

      <div className="flex-1">
        <p className="font-medium text-white">{player.name}</p>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{player.team_name}</span>
          <span>{player.position_slot}</span>
        </div>
      </div>

      {number && <span className="text-sm font-semibold text-gray-400 flex-shrink-0">#{number}</span>}
    </div>
  )
}
