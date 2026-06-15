'use client'

// app/app/example-round-checker.tsx
// Exemplo de integração do MemberRoundChecker em modal
// Use como referência para adicionar à sua home

import { useState } from 'react'
import { MemberRoundChecker, type MemberRoundData } from './member-round-checker'

export function ExampleRoundChecker() {
  const [showChecker, setShowChecker] = useState(false)

  // Dados de exemplo (substitua com dados reais do seu sistema)
  const exampleData: MemberRoundData = {
    memberId: 'member-123',
    memberName: 'André',
    round: 1,
    starters: [
      {
        id: 's1',
        player_id: 1,
        slot: 'starter',
        position_slot: 'GK',
        rating: 7.5,
        minutes: 90,
        players: { id: 1, name: 'Alisson da Silva', team_name: 'Brasil', position: 'GK' },
      },
      {
        id: 's2',
        player_id: 2,
        slot: 'starter',
        position_slot: 'ZAG',
        rating: 7.2,
        minutes: 90,
        players: { id: 2, name: 'Marquinhos dos Santos', team_name: 'Brasil', position: 'D' },
      },
      {
        id: 's3',
        player_id: 3,
        slot: 'starter',
        position_slot: 'ZAG',
        rating: null, // ⚠️ SEM NOTA
        minutes: 0,
        players: { id: 3, name: 'Gabriel Magalhaes', team_name: 'Arsenal', position: 'D' },
      },
      {
        id: 's4',
        player_id: 4,
        slot: 'starter',
        position_slot: 'LAT',
        rating: 6.8,
        minutes: 45, // ⏱️ < 20 min
        players: { id: 4, name: 'Danilo Junior', team_name: 'Brasil', position: 'D' },
      },
      {
        id: 's5',
        player_id: 5,
        slot: 'starter',
        position_slot: 'LAT',
        rating: 7.0,
        minutes: 90,
        players: { id: 5, name: 'Alex Sandro', team_name: 'Brasil', position: 'D' },
      },
      {
        id: 's6',
        player_id: 6,
        slot: 'starter',
        position_slot: 'MEI',
        rating: 8.1,
        minutes: 90,
        players: { id: 6, name: 'Vinícius Jr', team_name: 'Brasil', position: 'M' },
      },
      {
        id: 's7',
        player_id: 7,
        slot: 'starter',
        position_slot: 'MEI',
        rating: 6.9,
        minutes: 75,
        players: { id: 7, name: 'Casemiro', team_name: 'Brasil', position: 'M' },
      },
      {
        id: 's8',
        player_id: 8,
        slot: 'starter',
        position_slot: 'MEI',
        rating: 7.3,
        minutes: 90,
        players: { id: 8, name: 'Lucas Paquetá', team_name: 'Brasil', position: 'M' },
      },
      {
        id: 's9',
        player_id: 9,
        slot: 'starter',
        position_slot: 'ATK',
        rating: 8.5,
        minutes: 90,
        players: { id: 9, name: 'Neymar Jr', team_name: 'Brasil', position: 'F' },
      },
      {
        id: 's10',
        player_id: 10,
        slot: 'starter',
        position_slot: 'ATK',
        rating: 7.6,
        minutes: 60,
        players: { id: 10, name: 'Richarlison', team_name: 'Brasil', position: 'F' },
      },
      {
        id: 's11',
        player_id: 11,
        slot: 'starter',
        position_slot: 'ATK',
        rating: 6.5,
        minutes: 30,
        players: { id: 11, name: 'Rodrygo Goes', team_name: 'Brasil', position: 'F' },
      },
    ],
    bench: [
      {
        id: 'b1',
        player_id: 20,
        slot: 'bench',
        position_slot: 'GK',
        rating: null,
        minutes: 0,
        players: { id: 20, name: 'Ederson Silva', team_name: 'Brasil', position: 'GK' },
      },
      {
        id: 'b2',
        player_id: 21,
        slot: 'bench',
        position_slot: 'ZAG',
        rating: 7.1,
        minutes: 45,
        players: { id: 21, name: 'Gabriel Paulista', team_name: 'Brasil', position: 'D' },
      },
      {
        id: 'b3',
        player_id: 22,
        slot: 'bench',
        position_slot: 'LAT',
        rating: null,
        minutes: 0,
        players: { id: 22, name: 'Guilherme Arana', team_name: 'Brasil', position: 'D' },
      },
      {
        id: 'b4',
        player_id: 23,
        slot: 'bench',
        position_slot: 'MEI',
        rating: null,
        minutes: 0,
        players: { id: 23, name: 'Philippe Coutinho', team_name: 'Brasil', position: 'M' },
      },
      {
        id: 'b5',
        player_id: 24,
        slot: 'bench',
        position_slot: 'ATK',
        rating: null,
        minutes: 0,
        players: { id: 24, name: 'Gabriel Martinelli', team_name: 'Brasil', position: 'F' },
      },
    ],
    substitutions: [
      {
        out_player_id: 3, // Gabriel Magalhaes saiu
        in_player_id: 21, // Gabriel Paulista entrou
      },
    ],
  }

  return (
    <div className="space-y-4">
      {/* Botão para abrir checker */}
      <button
        onClick={() => setShowChecker(!showChecker)}
        className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
      >
        🔍 {showChecker ? 'Fechar Conferência' : 'Conferir Ratings - Rodada 1'}
      </button>

      {/* Modal com o checker */}
      {showChecker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-xl border border-white/20 max-w-2xl w-full my-8">
            {/* Conteúdo do modal */}
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <MemberRoundChecker data={exampleData} onClose={() => setShowChecker(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Info cards mostrando o que o checker faz */}
      {!showChecker && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2">
            <p className="text-xs font-bold text-green-400 uppercase">✅ Com Notas</p>
            <p className="text-xl font-bold text-green-400">9/11</p>
            <p className="text-xs text-green-300">titulares com ratings</p>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 space-y-2">
            <p className="text-xs font-bold text-orange-400 uppercase">⚠️ Alertas</p>
            <p className="text-xl font-bold text-orange-400">2</p>
            <p className="text-xs text-orange-300">faltam notas • 4 subs não usadas</p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-2">
            <p className="text-xs font-bold text-blue-400 uppercase">📊 Média</p>
            <p className="text-xl font-bold text-blue-400">7.45</p>
            <p className="text-xs text-blue-300">pts (82% cobertura)</p>
          </div>
        </div>
      )}
    </div>
  )
}
