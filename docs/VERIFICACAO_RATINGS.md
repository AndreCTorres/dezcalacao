# ðŸ” Guia de ConferÃªncia de Ratings

Componentes para verificar quais jogadores tÃªm notas e identificar faltantes rapidamente.

---

## ðŸ“‹ Componentes Criados

### 1. `RoundVerification` (round-verification.tsx)
**O que Ã©:** Componente de conferÃªncia completo com indicadores visuais

**CaracterÃ­sticas:**
- âœ… Lista 11 titulares com status de rating
- ðŸ”„ Mostra reservas que entraram (substituiÃ§Ãµes)
- âš ï¸ Alertas visuais:
  - Faltam notas (âŒ em vermelho)
  - Subs nÃ£o usadas (âš ï¸ em laranja)
- ðŸ“Š Indicador de progresso (barra de progresso)
- ðŸŽ¯ Agrupa por posiÃ§Ã£o (GK, ZAG, LAT, MEI, ATK)

**Uso:**
```tsx
import { RoundVerification } from '@/app/app/round-verification'

<RoundVerification
  memberName="AndrÃ©"
  round={1}
  starters={startersArray}
  bench={benchArray}
  substitutions={substitutionsArray}
/>
```

**Ãcones de Status:**
- âœ… Tem nota (Verde)
- â­ Nota excelente â‰¥8.0 (Amarelo)
- âŒ Falta nota (Vermelho)

---

### 2. `MemberRoundChecker` (member-round-checker.tsx)
**O que Ã©:** Wrapper com estatÃ­sticas rÃ¡pidas para modal/tab

**CaracterÃ­sticas:**
- ðŸ“Š Cobertura percentual (80%, 90%, etc)
- ðŸ“ˆ Total de pontos
- ðŸ’¡ Dicas de conferÃªncia
- ðŸ–¨ï¸ BotÃ£o de print/exportar
- âœ• BotÃ£o de fechar

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
**O que Ã©:** VersÃ£o avanÃ§ada do round-details com verificaÃ§Ã£o integrada

**CaracterÃ­sticas:**
- ðŸ“Š Lista todas as rodadas
- ðŸ”¼ ExpandÃ­vel por rodada
- âœ… Mostra verificaÃ§Ã£o do seu time
- ðŸ† Ranking completo da rodada
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

## ðŸŽ¯ Casos de Uso

### Caso 1: ConferÃªncia RÃ¡pida (Admin)
VocÃª coletou ratings e quer conferir antes de recalcular pontuaÃ§Ã£o.

**Workflow:**
1. Abra `/admin/rodadas/[roundId]`
2. Clique em um membro
3. Sistema mostra verificaÃ§Ã£o:
   - 11 titulares com âœ…/âŒ
   - Quantos tÃªm nota
   - Alertas de faltantes

### Caso 2: ValidaÃ§Ã£o Antes de Publicar
Antes de divulgar scores, vocÃª quer ter certeza que todos tÃªm notas.

**Workflow:**
1. Para cada membro, abra MemberRoundChecker
2. Veja a cobertura (%) â€” se < 100%, faltam notas
3. Identifique quem falta rating
4. Corrija manualmente no banco se necessÃ¡rio
5. Recalcule pontuaÃ§Ã£o

### Caso 3: Debugging de NÃ£o Casamento
Alguns times nÃ£o tiveram score calculado. Quais jogadores faltam?

**Workflow:**
1. Clique na rodada em RoundDetailsExpanded
2. Expande e mostra a verificaÃ§Ã£o
3. VÃª exatamente quem nÃ£o tem nota
4. Procura na imagem do jogo e insere manualmente

---

## ðŸŽ¨ Indicadores Visuais

### Cores por Status
```
âœ… Verde (7.0-7.9)    = Bom
â­ Amarelo (â‰¥8.0)    = Excelente
Laranja                 = Alerta operacional, não afeta pontuação
âŒ Vermelho (sem nota) = CrÃ­tico â€” CONFERIR
```

### Alertas
```
âš ï¸ FALTAM NOTAS        = X jogadores sem rating
âš ï¸ SUBS NÃƒO USADAS     = Banco nÃ£o totalmente acionado
```

---

## ðŸ”§ Exemplo PrÃ¡tico

Vamos dizer que vocÃª tem dados assim:

```tsx
const memberData: MemberRoundData = {
  memberId: 'abc123',
  memberName: 'AndrÃ©',
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
      rating: null, // âš ï¸ SEM NOTA
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

**O componente mostrarÃ¡:**
```
ðŸ‘¥ 11 Titulares
  â€¢ 10/11 com notas âš ï¸ FALTAM NOTAS

ðŸ”„ SubstituiÃ§Ãµes (1)
  â€¢ Player X entrou no lugar de Player Y
    âŒ SEM NOTA

âš ï¸ ALERTAS
  â€¢ Falta 1 nota crÃ­tica
  â€¢ 4 subs nÃ£o foram usadas
```

---

## ðŸ’¡ Dicas de Uso

### Para Admin (ConferÃªncia)
1. **Antes de recalcular:** Rode a verificaÃ§Ã£o para cada membro
2. **Se tiver <100% cobertura:** Identifique faltantes manualmente
3. **Se tem alertas de subs:** Confira se o jogo realmente nÃ£o usou substituiÃ§Ãµes

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

## ðŸš€ IntegraÃ§Ã£o Sugerida

### Na Home (`/app/page.tsx`)
Adicione um botÃ£o "ðŸ” Conferir Rodada" que abre um modal com o verificador.

### Na Admin (`/admin/rodadas/[roundId]/page.tsx`)
Adicione uma aba "ConferÃªncia" com verificaÃ§Ã£o para cada membro.

### Em Round Details
Substitua `RoundDetails` por `RoundDetailsExpanded` para ter verificaÃ§Ã£o integrada.

---

## ðŸ“¦ Estrutura de Tipos

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

## ðŸŽ¯ PrÃ³ximos Passos

1. **Integrar em Admin UI** - Adicione botÃ£o "ConferÃªncia" em `/admin/rodadas/[roundId]`
2. **Modal ReutilizÃ¡vel** - Crie `CheckerModal` que wrappa `MemberRoundChecker`
3. **API de Dados** - Crie `/api/members/[memberId]/round/[roundId]/verification` que retorna `MemberRoundData`
4. **Teste E2E** - Valide a conferÃªncia em Playwright

---

**Ãšltima atualizaÃ§Ã£o:** Junho 2026
