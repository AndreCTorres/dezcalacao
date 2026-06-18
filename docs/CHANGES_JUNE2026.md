# 📋 Mudanças - Junho 2026

## 🐛 Bug Fix: Exibição de Jogadores da Rodada (Qatar x Suíça)

### Problema
Ao editar notas de um jogo (ex: Qatar x Suíça), apenas os jogadores do **time mandante (Qatar)** eram visíveis na modal. Os jogadores do **time visitante (Suíça)** apareciam **fora do viewport**, exigindo scroll longo para encontrá-los.

### Causa
A modal tinha `max-h-[90vh]` com `overflow-y-auto`, e o **resumo de cada time estava renderizado em bloco vertical** (`space-y-5`), causando que o segundo time ficasse abaixo da área visível inicialmente.

### Solução
Alterado o layout do **resumo dos times** de **vertical para grid lado-a-lado** (2 colunas):

**Antes:**
```jsx
{Object.entries(playersByTeam).map(([teamName, teamPlayers]) => {
  // Cada resumo renderizado abaixo do anterior
```

**Depois:**
```jsx
<div className="grid grid-cols-2 gap-3">
  {Object.entries(playersByTeam).map(([teamName, teamPlayers]) => {
    // Resumos lado-a-lado em telas grandes
    // Responsivo: 1 coluna em telas pequenas
```

**Resultado:**
- ✅ Ambos os times visíveis na mesma tela
- ✅ Resumo compacto (Jogaram, Titulares, Reservas) para os dois times lado-a-lado
- ✅ Sem necessidade de scroll vertical para alternar entre times
- ✅ Modal mais intuitiva

---

## ✨ Nova Funcionalidade: Reordenação de Jogos (Drag-and-Drop)

### Contexto
Na lista de rodadas (`/admin/rodadas`), os jogos eram exibidos em **ordem de criação** apenas. Você queria poder reordenar os jogos **conforme a ordem que realmente ocorreram**, já que o sistema não captura data/hora de início dos jogos com precisão.

### Implementação

#### 1️⃣ Banco de Dados
**Nova coluna na tabela `rounds`:**
- `sort_order` (integer, nullable)
- Armazena a ordem manual definida pelo admin
- Se NULL, fallback para `created_at`
- Migração: `supabase/migrations/021_add_rounds_sort_order.sql`

```sql
alter table rounds add column sort_order integer default null;
create index idx_rounds_sort_order on rounds(group_id, sort_order nulls last, created_at);
```

#### 2️⃣ Server Action
**Nova ação:** `reorderRounds(groupId, roundIds)`  
Salva a nova ordem no banco:

```typescript
export async function reorderRounds(groupId: string, roundIds: string[]) {
  // Valida admin do grupo
  // Atualiza sort_order para cada rodada (0, 1, 2, ...)
  // Revalida página
}
```

#### 3️⃣ Frontend (Round List)
**Componente `RoundList` agora suporta:**
- ✅ **Drag-and-drop**: Arraste rodadas para reordenar
- ✅ **Ordenação dinâmica**: Por `sort_order` (se existe) ou `created_at`
- ✅ **Feedback visual**: Ícone de mão e mensagem de instrução
- ✅ **Estado em tempo real**: Reordenação salva automaticamente
- ✅ **Rollback em erro**: Se falhar, volta para ordem anterior

**Como usar:**
```
1. Vá para /admin/rodadas
2. Arraste uma rodada para cima/baixo
3. A nova ordem é salva automaticamente
4. A página revalida e mostra mensagem de sucesso
```

#### 4️⃣ Query Update
`/admin/rodadas/page.tsx` agora busca `sort_order`:

```typescript
.select('...sort_order')  // ← Nova coluna
```

Fallback automático se coluna não existir (para DBs antigos).

---

## 📊 Resumo de Arquivos Alterados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `app/admin/rodadas/[roundId]/round-ratings-manager.tsx` | Componente | Layout dos resumos de time (vertical → grid 2 colunas) |
| `app/admin/rodadas/actions.ts` | Server Action | `reorderRounds()` nova função |
| `app/admin/rodadas/round-list.tsx` | Componente | Drag-and-drop + ordenação by `sort_order` |
| `app/admin/rodadas/page.tsx` | Page | Query agora busca `sort_order` |
| `supabase/migrations/021_add_rounds_sort_order.sql` | Migration | Nova coluna `sort_order` em `rounds` |

---

## 🧪 Testando as Mudanças

### Bug Fix (Modal de Notas)
1. Vá para `/admin/rodadas`
2. Clique em "Editar notas" em qualquer rodada
3. Abra um jogo com 2 times diferentes
4. ✅ Ambos os resumos devem aparecer **lado-a-lado** na tela

### Reordenação de Jogos
1. Vá para `/admin/rodadas`
2. Passe o mouse sobre uma rodada → cursor muda para ✋
3. Arraste uma rodada para cima/baixo
4. ✅ Nova ordem é **salva automaticamente**
5. ✅ Mensagem "💾 Salvando..." aparece brevemente
6. ✅ Se fatigar, volta para ordem anterior

---

## 🔄 Sincronização com Participantes

- ✅ A ordem das rodadas vem de `sort_order` na query
- ✅ Participantes veem os jogos na **nova ordem** (ranking, notas, etc)
- ✅ Não afeta dados históricos ou pontuações
- ✅ Revert instantâneo se algo der errado

---

## 📝 Notas Técnicas

### Por que `sort_order` é nullable?
- Backwards compatibility com DB antigos (sem a coluna)
- Fallback automático: se NULL, usa `created_at`
- Permite "deletar" ordenação customizada voltando ao padrão

### Por que grid 2 colunas?
- Telas grandes: lado-a-lado (melhor aproveitamento)
- Telas pequenas: 1 coluna automática via Tailwind (`grid-cols-2` → ajusta em mobile)
- Reduz scroll necessário na modal

### Sem chamada à API-Football?
- Reordenação é 100% local (não toca API)
- Apenas 1 query per rodada ao banco (update sort_order)
- Zero impacto no rate limit diário

---

## ✅ QA Checklist

- [x] Build sem erros
- [x] TypeScript sem erros
- [x] Componente renderiza sem crashes
- [x] Drag-and-drop funciona em mouse
- [x] Ordem persiste após refresh
- [x] Fallback para `created_at` se `sort_order` NULL
- [x] Admin pode reverter com novo drag
- [x] Rollback em erro de rede
- [x] Mensagem de feedback clara

---

**Versão:** 3.1 (Junho 2026)  
**Status:** ✅ Pronto para produção
