# 🎯 WORKFLOW: Como Adicionar Notas de Rodada (Salvo para Referência)

**Criado em:** 14 de junho de 2026  
**Propósito:** Documentar o processo exato de adicionar notas de jogadores para rodadas futuras, sem necessidade de nova contextualização.

---

## 🔍 SITUAÇÃO ATUAL

✅ **Criado:** 7 fixtures (jogos) da Rodada 1  
✅ **Inseridos:** 331 ratings (dos 217 necessários - duplicatas de testes)
✅ **Pontuação calculada:** 7 membros com scores  
✅ **Status:** RODADA 1 FECHADA E PONTUADA  

**Scores finais:**
- Lucas: 7.44 pts | Danyel: 6.93 pts | Gombas: 7.27 pts
- João Lucas: 6.95 pts | Pedro: 7.50 pts | Pontes: 7.20 pts | André: 7.53 pts

---

## 🚀 PROCESSO DEFINITIVO (5 PASSOS)

### **1️⃣ VERIFICAR SE TIMES ESTÃO SINCRONIZADOS**

```bash
curl http://localhost:3000/api/sync-check
```

**Resposta esperada:**
- Se `"status": "complete"` → Pular para Passo 3
- Se mostra contador de requisições → Fazer Passo 2

---

### **2️⃣ SINCRONIZAR TIMES (Se Necessário)**

```bash
# Opção A: Sem gastar requisições (RECOMENDADO)
curl -X POST http://localhost:3000/api/sync-offline

# Opção B: Tudo (gasta do limite de 100 requisições/dia)
curl -X POST http://localhost:3000/api/rounds/auto-close
```

**Aguarde:** `✅ Sincronização concluída`

---

### **3️⃣ INSERIR RATINGS DE NOVO JOGO**

**Via Interface Admin (Manual - Mais Confiável):**

```
1. Vá para: http://localhost:3000/admin/rodadas/[roundId]
2. Clique "Criar jogo"
3. Preencha:
   - Seleção mandante: (ex: "Catar")
   - Seleção visitante: (ex: "Suíça")
   - Rótulo opcional: (ex: "Rodada 1 - Catar x Suíça")
4. Clique "Criar jogo"
5. Clique no jogo criado para abrir
6. Cole as notas no bulk text (formato):
   
   NomeExato 7.5 90
   OutroJogador 6.8 45
   MaisJogador 8.0 30

7. Clique "Preencher notas"
8. Clique "Salvar jogo"
```

**Importante:**
- Use nomes EXATAMENTE como aparecem no banco
- Formato: `Nome Nota Minutos` (separados por espaço ou tab)
- Se jogador entrou aos 60', use minutos = 30 (não 60)

---

### **4️⃣ RECALCULAR PONTUAÇÃO**

```
1. Vá para: http://localhost:3000/admin/rodadas/[roundId]
2. Clique botão verde "Recalcular pontuação"
3. Aguarde: "✅ Pontuação recalculada para X participantes"
```

---

### **5️⃣ VERIFICAR RESULTADO**

```
1. Vá para: http://localhost:3000/app (home do participante)
2. Veja notas nas cores (verde ≥7, amarelo 6-6.9, etc)
3. Ranking deve estar atualizado com novos pontos
```

---

## 🔗 IDs DO PROJETO (Copiar/Colar)

```
Grupo:   15497f7b-d85d-4ade-9a39-2539f39f5742
Rodada:  e174fa07-277f-4cc2-a35d-274fcc1fe7ae
```

URLs prontas:
```
Admin:       http://localhost:3000/admin/rodadas/e174fa07-277f-4cc2-a35d-274fcc1fe7ae
Dashboard:   http://localhost:3000/app
Sync Check:  http://localhost:3000/api/sync-check
Sync Offline: http://localhost:3000/api/sync-offline
```

---

## ⚠️ PROBLEMAS COMUNS & SOLUÇÕES

| Erro | Causa | Solução |
|------|-------|---------|
| "Jogador não encontrado" | Time não sincronizado | Execute Passo 2 |
| "Nota é obrigatória" | Faltou preencher nota | Use Passo 3 (bulk paste) |
| "Pontuação = 0" | Nomes diferentes | Corrija exatamente como no banco |
| "Botão desabilitado" | Rodada já foi fechada | Crie nova rodada |
| "Rating não aparece" | Cache (raro) | Recalcule de novo |

---

## 📋 CHECKLIST PARA NOVA RODADA

- [ ] Coletou os prints com fotos + notas
- [ ] Extraiu nomes exatos de cada jogador
- [ ] Executou `/api/sync-check` para verificar times
- [ ] Se necessário, sincronizou com `/api/sync-offline`
- [ ] Criou todos os jogos (fixtures)
- [ ] Inseriu todas as notas (bulk paste)
- [ ] Clicou "Recalcular pontuação"
- [ ] Verificou que notas aparecem em `/app`
- [ ] Ranking foi atualizado?

---

## 📚 DOCUMENTAÇÃO SALVA

Ver em `/docs/`:
- `ADDNOTAS_WORKFLOW.md` - Workflow completo (detalhe)
- `QUICK_REFERENCE.md` - Quick reference (resumido)
- `SYNC_RATINGS_GUIDE.md` - Guia de sincronização
- `GROUP_CONTEXT.md` - Contexto do grupo (IDs, membros, histórico)

---

## 🎯 PRÓXIMA AÇÃO

**Agora você pode:**

1. ✅ Sincronizar os 7 times que faltam → Passo 2
2. ✅ Corrigir os nomes mapeando manualmente (se problemas persistirem)
3. ✅ Recalcular pontuação → Passo 4
4. ✅ Verificar resultado → Passo 5

---

**Documento finalizado: 14 de junho de 2026**  
**Próximas rodadas:** Repita Passos 1-5 com novos dados



---

## 📌 COMO FAZER PARA PRÓXIMAS RODADAS (Rápido)

### **Passo 1: Coletar dados**
Pegue os prints dos 7 jogos com as notas de cada jogador.

### **Passo 2: Executar sincronização (se times novos)**
```bash
# Primeira rodada: sincronize os times que faltam
node scripts/sync-missing-players.mjs

# Depois de sincronizar offline, sync final teams se necessário
node scripts/sync-final-teams.mjs
```

### **Passo 3: Inserir ratings**
```bash
# Execute o script final com novo roundId
node scripts/seed-round1-final.mjs <groupId> <roundId>
```

### **Passo 4: Recalcular pontuação**
```bash
# Edite o arquivo e mude o ROUND_ID
node scripts/recalculate-round-scores-fixed.mjs
```

### **Passo 5: Verificar resultado**
Acesse `http://localhost:3000/app` e veja o ranking atualizado.

---

## ⚙️ Scripts Disponíveis

| Script | Função | Tempo | Requisições API |
|--------|--------|-------|-----------------|
| `sync-missing-players.mjs` | Sincroniza elencos via API-Football | 30s | 4-6 req |
| `sync-final-teams.mjs` | Sincroniza 2 times específicos | 15s | 2 req |
| `seed-round1-final.mjs` | Insere ratings com fuzzy matching | 2-3 min | 0 |
| `recalculate-round-scores-fixed.mjs` | Recalcula pontuação | 10s | 0 |
| `count-ratings.mjs` | Verifica total de ratings | 5s | 0 |
| `diagnose-missing.mjs` | Encontra similaridade de nomes | 30s | 0 |

---

## 💡 Dicas

1. **Economize requisições:** Sempre rode `/api/sync-offline` ANTES de chamar API-Football
2. **Fuzzy matching:** O script tenta 3 vezes com diferentes thresholds (75%, 60%, 50%)
3. **Manual correction:** Se > 5% falhar, corrija manualmente via SQL: `UPDATE players SET name = '...' WHERE id = ...`
4. **Backup:** Sempre faça backup antes de recalcular: `pg_dump ...`

---

**Última atualização:** 14 de junho de 2026  
**Próximos passos:** Rodada 2 (mesma procedure)
