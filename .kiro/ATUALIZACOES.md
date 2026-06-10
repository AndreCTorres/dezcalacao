# 📝 Atualizações do Steering File (Junho 2026)

## O que foi atualizado em `.kiro/steering/PROJETO.md`

### 1️⃣ Novos Fluxos Adicionados à Seção "🔄 Fluxos Principais"

#### ➕ "Fechar Rodada & Calcular Pontuação"
- Documenta o fluxo completo: fixtures → ratings → cálculo → scores → status

#### ➕ "Fazer Substituição (Antes da Rodada Ser Fechada)"
- Explicação passo-a-passo de como participante faz uma substituição
- Validações aplicadas
- Como é aplicada na pontuação

#### ➕ "Ver Ranking & Pontuação"
- Descreve o que é exibido em `/app`
- Menciona atualização 30s
- Explicação de "detalhes por rodada"

---

### 2️⃣ Estrutura de Pastas Atualizada em "🗂️ Estrutura de Pastas"

**Adicionados:**
```
app/api/rounds/[groupId]/details/route.ts
app/app/
  ├── time/page.tsx
  ├── substitution-interface.tsx
  ├── substitutions-actions.ts
  ├── participant-standings.tsx ✨ (atualizado)
  ├── participant-team.tsx ✨ (com botão)
  ├── round-details.tsx
  └── standings-actions.ts

lib/services/scoring.service.ts ✨ (bug fix em getGroupStandings)
lib/scoring.ts ✨ (com detalhes de funções)
```

**Notações:**
- ✨ = Novo ou significativamente atualizado
- Cada arquivo documentado com sua responsabilidade

---

### 3️⃣ Nova Seção: "📋 Status de Implementação (Junho 2026)"

Rastreamento das 4 prioridades:

```
✅ Priority 1: Integrar Pontuação
   - closeRound() com 4 passos
   - Sync ratings + cálculo automático
   
✅ Priority 2: UI de Substituições
   - 8 validações implementadas
   - Interface interativa por posição
   
✅ Priority 3: Ranking em Tempo Real
   - Auto-atualização 30s com medalhas
   - Acordeon de rodadas
   
🎯 Priority 4: Testes + Polimento (próximo)
```

---

### 4️⃣ Nova Seção: "🔌 Fluxos de Dados (Referência Técnica)"

3 diagramas ASCII detalhando:
- **Cálculo de Pontuação**: Função por função
- **Exibição de Ranking**: Client-side + fetch
- **Aplicação de Substituição**: Validações + inserção
- **Retenção de Substituições**: Como entram no cálculo

---

### 5️⃣ Dúvidas Frequentes Expandidas

**Adicionadas 5 novas perguntas:**
- "Como funciona o cálculo de pontuação?"
- "Quando as substituições são aplicadas?"
- "O ranking é ao vivo?"
- "Posso ver apenas uma rodada?"
- "Como debugar scoring?"

Cada uma com resposta concisa + referência de código.

---

### 6️⃣ Referências Rápidas Atualizadas

**Antes:**
```
- Scoring: lib/scoring.ts
```

**Depois:**
```
- Scoring: lib/scoring.ts (lógica pura) + lib/services/scoring.service.ts (orquestração)
- Substituições: app/app/substitutions-actions.ts (server) + app/app/substitution-interface.tsx (UI)
- Ranking: app/app/standings-actions.ts (server) + app/app/participant-standings.tsx (UI)
```

---

## 📊 Mudanças Resumidas

| Seção | Antes | Depois |
|-------|-------|--------|
| Fluxos Principais | 3 | 6 |
| Arquivos documentados | 20 | 35+ |
| Dúvidas Frequentes | 4 | 9 |
| Diagramas técnicos | 0 | 3 |
| Linhas totais | ~150 | ~350 |

---

## 🎯 Como Usar

O steering file atualizado será **automaticamente incluído** em todas as interações com Kiro.

Quando você fizer perguntas sobre:
- ✅ Scoring → Vê fluxo completo + dúvidas
- ✅ Substituições → Vê validações + fluxo
- ✅ Ranking → Vê atualização 30s + detalhes
- ✅ Bugs → Vê como debugar (console tags)

---

## 🔗 Próximas Atualizações

Quando Priority 4 (Testes + Polimento) for implementado:
1. Adicionar seção "🧪 Testes"
2. Documentar testes E2E com Playwright
3. Adicionar dúvida "Como rodar testes?"
4. Versão para 3.0

---

**Data:** 10 de Junho de 2026  
**Versão:** 2.0 (com Scoring, Substituições, Ranking)
