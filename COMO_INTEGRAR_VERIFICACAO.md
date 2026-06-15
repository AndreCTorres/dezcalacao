# 🔧 Como Integrar a Verificação de Ratings

Guia passo a passo para adicionar o verificador na sua interface.

---

## 📍 Localização: Home do Participante (`/app/page.tsx`)

### Passo 1: Importar o Componente

```tsx
import { MemberRoundChecker, type MemberRoundData } from '@/app/app/member-round-checker'
import { useState } from 'react'
```

### Passo 2: Preparar o Servidor Action para Carregar Dados

Crie um arquivo `app/app/verification-actions.ts`:

```typescript
'use server'

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'

export async function getMemberRoundVerificationData(
  memberId: string,
  roundId: string
) {
  const admin = supabaseAdmin()

  // 1. Buscar membro
  const { data: member } = await admin
    .from('group_members')
    .select('display_name')
    .eq('id', memberId)
    .single()

  // 2. Buscar draft (team_players)
  const { data: teamPlayers } = await admin
    .from('team_players')
    .select(`
      id,
      player_id,
      slot,
      position_slot,
      players(id, name, team_name, position)
    `)
    .eq('group_member_id', memberId)

  // 3. Buscar ratings dessa rodada
  const playerIds = teamPlayers?.map(t => t.player_id) || []
  const { data: ratings } = playerIds.length > 0 
    ? await admin
        .from('player_round_ratings')
        .select('player_id, rating, minutes')
        .eq('round_id', roundId)
        .in('player_id', playerIds)
    : { data: [] }

  const ratingsMap = new Map(ratings?.map(r => [r.player_id, r]) || [])

  // 4. Buscar substituições
  const { data: substitutions } = await admin
    .from('substitutions')
    .select('out_player_id, in_player_id')
    .eq('group_member_id', memberId)
    .eq('round_id', roundId)

  // 5. Montar resposta
  const starters = teamPlayers?.filter(t => t.slot === 'starter').map(t => ({
    id: t.id,
    player_id: t.player_id,
    slot: t.slot,
    position_slot: t.position_slot,
    rating: ratingsMap.get(t.player_id)?.rating,
    minutes: ratingsMap.get(t.player_id)?.minutes,
    players: t.players,
  })) || []

  const bench = teamPlayers?.filter(t => t.slot === 'bench').map(t => ({
    id: t.id,
    player_id: t.player_id,
    slot: t.slot,
    position_slot: t.position_slot,
    rating: ratingsMap.get(t.player_id)?.rating,
    minutes: ratingsMap.get(t.player_id)?.minutes,
    players: t.players,
  })) || []

  // 6. Extrair número da rodada
  const { data: round } = await admin
    .from('rounds')
    .select('name')
    .eq('id', roundId)
    .single()

  const roundNum = parseInt(round?.name.match(/\d+/)?.[0] || '0')

  return {
    memberId,
    memberName: member?.display_name || 'Você',
    round: roundNum,
    starters,
    bench,
    substitutions: substitutions || [],
  } as MemberRoundData
}
```

### Passo 3: Integrar na Home

Atualize `app/app/page.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { PitchView } from './pitch-view'
import { ParticipantStandings } from './participant-standings'
import { MemberRoundChecker, type MemberRoundData } from './member-round-checker'
import { getMemberRoundVerificationData } from './verification-actions'

export default function HomePage() {
  const [showChecker, setShowChecker] = useState(false)
  const [checkerData, setCheckerData] = useState<MemberRoundData | null>(null)
  const [loadingChecker, setLoadingChecker] = useState(false)

  // Assume que você tem group_id, member_id, round_id de alguma forma
  // (props, context, ou fetch anterior)
  const groupId = 'seu-group-id'
  const memberId = 'seu-member-id'
  const roundId = 'sua-round-id'
  const teamData = [] // seu team data

  const handleOpenChecker = async () => {
    setLoadingChecker(true)
    try {
      const data = await getMemberRoundVerificationData(memberId, roundId)
      setCheckerData(data)
      setShowChecker(true)
    } catch (error) {
      console.error('Erro ao carregar verificação:', error)
    }
    setLoadingChecker(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-white">Meu Time</h1>

      {/* Campo de Jogo */}
      <section>
        <PitchView team={teamData} />
      </section>

      {/* Botão de Verificação */}
      <section className="flex gap-2">
        <button
          onClick={handleOpenChecker}
          disabled={loadingChecker}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-500 text-white font-bold rounded-lg transition"
        >
          {loadingChecker ? '⏳ Carregando...' : '🔍 Verificar Ratings'}
        </button>
      </section>

      {/* Modal do Verificador */}
      {showChecker && checkerData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <MemberRoundChecker
                data={checkerData}
                onClose={() => setShowChecker(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Ranking */}
      <section>
        <ParticipantStandings />
      </section>

      {/* Pontuação por Rodada */}
      <section>
        <RoundDetails />
      </section>
    </div>
  )
}
```

---

## 📍 Localização 2: Admin (`/admin/rodadas/[roundId]/page.tsx`)

### Integrar Verificação por Membro

```tsx
'use client'

import { useState } from 'react'
import { MemberRoundChecker, type MemberRoundData } from '@/app/app/member-round-checker'
import { getMemberRoundVerificationData } from '@/app/app/verification-actions'

export default function RoundAdminPage({ params }: { params: { roundId: string } }) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [checkerData, setCheckerData] = useState<MemberRoundData | null>(null)
  const [members] = useState([]) // seu array de membros

  const handleSelectMember = async (memberId: string) => {
    const data = await getMemberRoundVerificationData(memberId, params.roundId)
    setCheckerData(data)
    setSelectedMember(memberId)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Conferência de Ratings</h1>

      {/* Lista de membros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {members.map(member => (
          <button
            key={member.id}
            onClick={() => handleSelectMember(member.id)}
            className={`p-3 rounded-lg border transition text-left ${
              selectedMember === member.id
                ? 'bg-lime-500/20 border-lime-500 text-white'
                : 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-300'
            }`}
          >
            🔍 {member.display_name}
          </button>
        ))}
      </div>

      {/* Modal com verificação */}
      {checkerData && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
          <MemberRoundChecker
            data={checkerData}
            onClose={() => setSelectedMember(null)}
          />
        </div>
      )}
    </div>
  )
}
```

---

## 🎯 Dados Necessários

O componente precisa de um objeto `MemberRoundData`:

```typescript
type MemberRoundData = {
  memberId: string           // "abc123"
  memberName: string         // "André"
  round: number             // 1
  starters: Array<{
    id: string              // UUID local
    player_id: number       // ID da API
    slot: 'starter'
    position_slot: string   // 'GK', 'ZAG', etc
    rating?: number | null  // 7.5 ou null
    minutes?: number        // 90 ou null
    players: {
      id: number
      name: string          // "Alisson da Silva"
      team_name: string     // "Brasil"
      position: string      // "GK"
    }
  }>
  bench: Array<...same as starters...>
  substitutions?: Array<{
    out_player_id: number
    in_player_id: number
  }>
}
```

---

## 🚀 Teste Rápido (Sem Backend)

Se quiser testar sem integração completa:

```tsx
import { ExampleRoundChecker } from '@/app/app/example-round-checker'

export default function TestPage() {
  return <ExampleRoundChecker />
}
```

Acesse `/test` e veja o componente funcional com dados fake.

---

## 🔗 Fluxo de Dados Completo

```
Home (/app/page.tsx)
  ↓
  [Clica "🔍 Verificar Ratings"]
  ↓
  getMemberRoundVerificationData() [Server Action]
    ├─ Busca group_members
    ├─ Busca team_players (draft)
    ├─ Busca player_round_ratings (notas)
    ├─ Busca substitutions
    └─ Monta MemberRoundData
  ↓
  MemberRoundChecker [Client]
    ├─ RoundVerification
    ├─ Stats (cobertura, média)
    └─ Dicas

```

---

## 🎨 Alternativas de Layout

### Opção A: Modal Flutuante (Recomendado)
```tsx
{showChecker && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
    <div className="bg-gray-900 rounded-lg p-6 max-w-2xl">
      <MemberRoundChecker ... />
    </div>
  </div>
)}
```

### Opção B: Accordion/Expandível
```tsx
{expandedMemberId === memberId && (
  <div className="border-t border-gray-700 p-4">
    <MemberRoundChecker ... />
  </div>
)}
```

### Opção C: Tab/Painel Lateral
```tsx
<div className="grid grid-cols-3 gap-4">
  <div>Lista de membros</div>
  <div className="col-span-2">
    {selectedMember && <MemberRoundChecker ... />}
  </div>
</div>
```

---

## ⚙️ Server Action Completa (Melhorada)

```typescript
'use server'

import { createActionClient, supabaseAdmin } from '@/lib/supabase-server'

export async function getMemberRoundVerificationData(
  memberId: string,
  roundId: string
) {
  const admin = supabaseAdmin()

  try {
    // Validar memberId
    const { data: member, error: memberError } = await admin
      .from('group_members')
      .select('id, display_name, group_id')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      throw new Error('Membro não encontrado')
    }

    // Buscar draft
    const { data: teamPlayers, error: tpError } = await admin
      .from('team_players')
      .select(`
        id,
        player_id,
        slot,
        position_slot,
        players!inner(id, name, team_name, position)
      `)
      .eq('group_member_id', memberId)

    if (tpError) throw new Error('Erro ao buscar draft')

    if (!teamPlayers || teamPlayers.length === 0) {
      throw new Error('Nenhum jogador no draft')
    }

    // Buscar ratings
    const playerIds = teamPlayers.map(t => t.player_id)
    const { data: ratings } = await admin
      .from('player_round_ratings')
      .select('player_id, rating, minutes')
      .eq('round_id', roundId)
      .in('player_id', playerIds)

    const ratingsMap = new Map(ratings?.map(r => [r.player_id, r]) || [])

    // Buscar substituições
    const { data: substitutions } = await admin
      .from('substitutions')
      .select('out_player_id, in_player_id')
      .eq('group_member_id', memberId)
      .eq('round_id', roundId)

    // Buscar nome da rodada
    const { data: round } = await admin
      .from('rounds')
      .select('name')
      .eq('id', roundId)
      .single()

    const roundNum = parseInt(round?.name?.match(/\d+/)?.[0] || '0')

    // Separar starters e bench
    const enriched = teamPlayers.map(t => ({
      id: t.id,
      player_id: t.player_id,
      slot: t.slot,
      position_slot: t.position_slot,
      rating: ratingsMap.get(t.player_id)?.rating,
      minutes: ratingsMap.get(t.player_id)?.minutes,
      players: t.players,
    }))

    return {
      memberId,
      memberName: member.display_name,
      round: roundNum,
      starters: enriched.filter(e => e.slot === 'starter'),
      bench: enriched.filter(e => e.slot === 'bench'),
      substitutions: substitutions || [],
    }
  } catch (error) {
    console.error('[getMemberRoundVerificationData]', error)
    throw error
  }
}
```

---

## ✅ Checklist de Integração

- [ ] Copiou `round-verification.tsx`
- [ ] Copiou `member-round-checker.tsx`
- [ ] Criou `verification-actions.ts` com Server Action
- [ ] Importou em `app/app/page.tsx`
- [ ] Adicionou botão "🔍 Verificar Ratings"
- [ ] Testou o fluxo
- [ ] Modal abre/fecha corretamente
- [ ] Dados carregam via Server Action
- [ ] Indicadores visuais aparecem
- [ ] Alertas funcionam (faltam notas, subs não usadas)

---

## 🐛 Troubleshooting

### Modal não abre
```tsx
// Verifique se showChecker state está mudando
console.log('showChecker:', showChecker)
```

### Dados não carregam
```tsx
// Verifique se Server Action está retornando
console.log('checkerData:', checkerData)
```

### Estilos errados
```tsx
// Certifique-se que Tailwind está compilando
// Rode: npm run dev
```

---

**Próximo:** Após integrar, acesse `/app` e clique em "🔍 Verificar Ratings" para testar!
