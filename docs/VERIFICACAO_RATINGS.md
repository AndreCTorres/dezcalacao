# 🔍 Guia de Conferência de Ratings

Componentes para verificar quais jogadores têm notas e identificar faltantes rapidamente.

---

## 📋 Componentes Criados

### 1. `RoundVerification` (round-verification.tsx)
**O que é:** Componente de conferência completo com indicadores visuais

**Características:**
- ✅ Lista 11 titulares com status de rating
- 🔄 Mostra reservas que entraram (substituições)
- ⚠️ Alertas visuais:
  - Faltam notas (❌ em vermelho)
  - Subs não usadas (⚠️ em laranja)
- 📊 Indicador de progresso (barra de progresso)
- 🎯 Agrupa por posição (GK, ZAG, LAT, MEI, ATK)

**Uso:**
```tsx
import { RoundVerification } from '@/app/app/round-verification'

<RoundVerification
  memberName="André"
  round={1}
  starters={startersArray}
  bench={benchArray}
  substitutions={substitutionsArray}
/>
```

**Ícones de Status:**
- ✅ Tem nota e jogou ≥20 min (Verde)
- ⭐ Nota excelente ≥8.0 (Amarelo)
- ⏱️ Tem nota mas <20 min (Laranja)
- ❌ Falta nota (Vermelho)

---

### 2. `MemberRoundChecker` (member-round-checker.tsx)
**O que é:** Wrapper com estatísticas rápidas para modal/tab

**Características:**
- 📊 Cobertura percentual (80%, 90%, etc)
- 📈 Média de pontos
- 💡 Dicas de conferência
- 🖨️ Botão de print/exportar
- ✕ Botão de fechar

**Uso:**
```tsx
import { MemberRoundChecker } from '@/app/app/member-round-checker'

const [showChecker, setShowChecker] = useState(false)

{showChecker && (
  <dialog className="...">
    <MemberRoundChecker
      data={memberRoundData}
      onClose={() => setShowChecker(false)}
    />
  </dialog>
)}
```

**Tipo de Dados:**
```tsx
type MemberRoundData = {
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
    players: { id: number; name: string; team_name: string; position: string }
  }>
  bench: Array<...same as starters...>
  substitutions?: Array<{ out_player_id: number; in_player_id: number }>
}
```

---

### 3. `RoundDetailsExpanded` (round-details-expanded.tsx)
**O que é:** Versão avançada do round-details com verificação integrada

**Características:**
- 📊 Lista todas as rodadas
- 🔼 Expandível por rodada
- ✅ Mostra verificação do seu time
- 🏆 Ranking completo da rodada
- Carregamento lazy dos dados

**Uso:**
```tsx
import { RoundDetailsExpanded } from '@/app/app/round-details-expanded'

<RoundDetailsExpanded
  groupId={groupId}
  memberId={memberId}
  memberTeamId={memberTeamId}
  currentMemberId={currentMemberId}
/>
```

---

## 🎯 Casos de Uso

### Caso 1: Conferência Rápida (Admin)
Você coletou ratings e quer conferir antes de recalcular pontuação.

**Workflow:**
1. Abra `/admin/rodadas/[roundId]`
2. Clique em um membro
3. Sistema mostra verificação:
   - 11 titulares com ✅/❌
   - Quantos têm nota
   - Alertas de faltantes

### Caso 2: Validação Antes de Publicar
Antes de divulgar scores, você quer ter certeza que todos têm notas.

**Workflow:**
1. Para cada membro, abra MemberRoundChecker
2. Veja a cobertura (%) — se < 100%, faltam notas
3. Identifique quem falta rating
4. Corrija manualmente no banco se necessário
5. Recalcule pontuação

### Caso 3: Debugging de Não Casamento
Alguns times não tiveram score calculado. Quais jogadores faltam?

**Workflow:**
1. Clique na rodada em RoundDetailsExpanded
2. Expande e mostra a verificação
3. Vê exatamente quem não tem nota
4. Procura na imagem do jogo e insere manualmente

---

## 🎨 Indicadores Visuais

### Cores por Status
```
✅ Verde (7.0-7.9)    = Bom
⭐ Amarelo (≥8.0)    = Excelente
⏱️  Laranja (<20min)   = Substituição incompleta
❌ Vermelho (sem nota) = Crítico — CONFERIR
```

### Alertas
```
⚠️ FALTAM NOTAS        = X jogadores sem rating
⚠️ SUBS NÃO USADAS     = Banco não totalmente acionado
```

---

## 🔧 Exemplo Prático

Vamos dizer que você tem dados assim:

```tsx
const memberData: MemberRoundData = {
  memberId: 'abc123',
  memberName: 'André',
  round: 1,
  starters: [
    {
      id: 's1',
      player_id: 123,
      slot: 'starter',
      position_slot: 'GK',
      rating: 7.5,
      minutes: 90,
      players: { id: 123, name: 'Alisson', team_name: 'Brazil', position: 'GK' }
    },
    // ... mais 10 titulares
  ],
  bench: [
    {
      id: 'b1',
      player_id: 456,
      slot: 'bench',
      position_slot: 'ZAG',
      rating: null, // ⚠️ SEM NOTA
      minutes: 0,
      players: { id: 456, name: 'Player X', team_name: 'Brazil', position: 'D' }
    },
    // ... mais 4 reservas
  ],
  substitutions: [
    { out_player_id: 789, in_player_id: 456 } // Reserva entrou
  ]
}
```

**O componente mostrará:**
```
👥 11 Titulares
  • 10/11 com notas ⚠️ FALTAM NOTAS

🔄 Substituições (1)
  • Player X entrou no lugar de Player Y
    ❌ SEM NOTA

⚠️ ALERTAS
  • Falta 1 nota crítica
  • 4 subs não foram usadas
```

---

## 💡 Dicas de Uso

### Para Admin (Conferência)
1. **Antes de recalcular:** Rode a verificação para cada membro
2. **Se tiver <100% cobertura:** Identifique faltantes manualmente
3. **Se tem alertas de subs:** Confira se o jogo realmente não usou substituições

### Para Criador de Ratings
1. **Ao inserir dados:** Use o verificador para confirmar

### Para Debug
1. **Query SQL** para contar ratings faltantes:
```sql
SELECT
  gm.display_name,
  COUNT(DISTINCT tp.player_id) as total_drafted,
  COUNT(DISTINCT CASE WHEN prr.rating IS NOT NULL THEN tp.player_id END) as com_rating
FROM group_members gm
JOIN team_players tp ON tp.group_member_id = gm.id
LEFT JOIN player_round_ratings prr ON prr.player_id = tp.player_id AND prr.round_id = ?
WHERE gm.group_id = ?
GROUP BY gm.id;
```

---

## 🚀 Integração Sugerida

### Na Home (`/app/page.tsx`)
Adicione um botão "🔍 Conferir Rodada" que abre um modal com o verificador.

### Na Admin (`/admin/rodadas/[roundId]/page.tsx`)
Adicione uma aba "Conferência" com verificação para cada membro.

### Em Round Details
Substitua `RoundDetails` por `RoundDetailsExpanded` para ter verificação integrada.

---

## 📦 Estrutura de Tipos

```typescript
// Player com rating
type VerificationPlayer = {
  id: string                    // UUID local
  player_id: number             // ID da API
  slot: 'starter' | 'bench'     // Titular ou reserva
  position_slot: string         // GK, ZAG, LAT, MEI, ATK
  rating?: number | null        // Nota de 0-10
  minutes?: number              // Minutos jogados
  status?: 'in_rotation' | 'substituted_out' | 'substituted_in'
  players: {
    id: number
    name: string
    team_name: string
    position: string
  }
}

// Dados de um membro em uma rodada
type MemberRoundData = {
  memberId: string
  memberName: string
  round: number
  starters: VerificationPlayer[]
  bench: VerificationPlayer[]
  substitutions?: Array<{
    out_player_id: number
    in_player_id: number
  }>
}
```

---

## 🎯 Próximos Passos

1. **Integrar em Admin UI** - Adicione botão "Conferência" em `/admin/rodadas/[roundId]`
2. **Modal Reutilizável** - Crie `CheckerModal` que wrappa `MemberRoundChecker`
3. **API de Dados** - Crie `/api/members/[memberId]/round/[roundId]/verification` que retorna `MemberRoundData`
4. **Teste E2E** - Valide a conferência em Playwright

---

**Última atualização:** Junho 2026
