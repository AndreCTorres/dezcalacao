# 📋 Reorganização da Estrutura do Projeto

> Resumo das mudanças implementadas em junho de 2026

## 🎯 Objetivos

- ✅ Tipos centralizados e reutilizáveis
- ✅ Lógica de negócio separada (services)
- ✅ Componentes UI genéricos
- ✅ Migrations organizadas e versionadas
- ✅ Melhor descoberta e manutenção

---

## 📁 O Que Foi Criado

### 1. **`lib/types.ts`** — Tipos Compartilhados

Centraliza todos os tipos TypeScript que espelham o schema do Supabase.

**Incluem:**
- `Profile`, `Group`, `GroupMember`
- `Player`, `TeamPlayer`, `Position`
- `Round`, `Fixture`, `PlayerRoundRating`
- `Substitution`, `RoundScore`
- `ScoringConfig`, `Standing`
- Response types para Server Actions

**Benefícios:**
- ✅ Evita tipos espalhados por múltiplos arquivos
- ✅ Facilita reuso
- ✅ Documentação centralizada (comments)
- ✅ Manutenção: muda em um lugar só

**Como usar:**
```typescript
import type { Group, Player, Substitution } from '@/lib/types'

const group: Group = { ... }
```

---

### 2. **`lib/services/`** — Services de Negócio

Separa lógica de negócio da integração com o banco.

#### **`group.service.ts`**
Lógica relacionada a grupos:
- `getGroupWithMembers(groupId, userId)`
- `isGroupAdmin(groupId, userId)`
- `isGroupMember(groupId, userId)`
- `getGroupMemberStats(groupId)`

#### **`scoring.service.ts`**
Orquestração de pontuação:
- `calculateMemberRoundScore(memberId, roundId, group)`
- `calculateRoundScores(groupId, roundId)`
- `getGroupStandings(groupId, roundId?)`

#### **`sync.service.ts`**
Sincronização com API-Football:
- `resolveTeamIds()`
- `apiFootballGet(endpoint, params)`
- `mapPosition(apiPosition)`
- Helpers para sync

**Como usar:**
```typescript
import { getGroupWithMembers, calculateRoundScores } from '@/lib/services'

const group = await getGroupWithMembers(groupId, userId)
const result = await calculateRoundScores(groupId, roundId)
```

---

### 3. **`app/components/ui/`** — Componentes Genéricos

Componentes reutilizáveis com estilos padrão.

#### **`Button.tsx`**
- Variantes: `primary` (verde-limão), `secondary`, `danger`
- Tamanhos: `sm`, `md`, `lg`
- Estados: `loading`, `disabled`

#### **`Card.tsx`**
- Container padrão (fundo cinza, borda)
- Padding: `sm`, `md`, `lg`
- Opção `highlight` para destaque

#### **`Input.tsx`**
- Campo de texto com label, error, helper text
- Validação visual
- Tema verde-limão no focus

**Como usar:**
```typescript
import { Button, Card, Input } from '@/app/components/ui'

<Card padding="md">
  <Input label="Seu nome" error="Campo obrigatório" />
  <Button variant="primary" onClick={...}>Enviar</Button>
</Card>
```

---

### 4. **`supabase/migrations/`** — Migrations Organizadas

Schema SQL versionado:

- **`001_initial_schema.sql`** — Schema inicial completo
  - Todas as tabelas principais
  - Comentários explicativos
  - Índices e trigger de auto-profile

- **`002_teams_sync.sql`** — Adições para sync
  - Tabela `teams` (cache)
  - Colunas adicionais em `players`
  - Índices para performance

- **`003_rls_policies.sql`** — Row Level Security
  - Políticas de leitura, insert, update, delete
  - Proteção multi-tenant
  - Validações de admin

**Benefícios:**
- ✅ Histórico de mudanças
- ✅ Fácil revisar o que mudou
- ✅ Rollback simples (deletar migration)
- ✅ Documentação integrada

---

## 🚀 Como Usar

### Importar Tipos
```typescript
import type {
  Group,
  Player,
  TeamPlayer,
  RoundScore,
} from '@/lib/types'
```

### Usar Services
```typescript
import {
  getGroupWithMembers,
  calculateRoundScores,
  resolveTeamIds,
} from '@/lib/services'
```

### Componentes UI
```typescript
import { Button, Card, Input } from '@/app/components/ui'
```

---

## 📊 Impacto

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Tipos espalhados | ❌ Sim (vários arquivos) | ✅ Centralizados (`lib/types.ts`) |
| Lógica de negócio | ❌ Misturada no app | ✅ Services organizados |
| Componentes UI | ❌ Só específicos | ✅ Genéricos + específicos |
| Migrations | ❌ Soltos em `supabase/` | ✅ Versionados em `supabase/migrations/` |
| Manutenção | ⚠️ Difícil (código espalhado) | ✅ Fácil (organizado) |

---

## 🔄 Próximas Etapas (Futuro)

1. **Testes:** Criar `tests/unit/` e `tests/integration/`
2. **Mais Services:** `draft.service.ts`, `substitution.service.ts`
3. **Validações:** Centralizar schemas de validação
4. **Hooks:** Custom React hooks (ex: `useGroup`, `useRound`)
5. **Utils:** Helpers de formatação, conversão, etc.

---

## 📖 Referências

- Ver `.kiro/steering/PROJETO.md` para padrões completos
- Ver `docs/ARCHITECTURE.md` para schema do banco
- Ver `lib/types.ts` para todos os tipos disponíveis

---

**Data:** Junho 2026  
**Versão:** 1.0
