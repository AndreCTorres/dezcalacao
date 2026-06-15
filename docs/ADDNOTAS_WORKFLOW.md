# 🎯 Workflow Completo: Adicionar Notas de Rodada

## Visão Geral
Este é o processo definitivo para adicionar notas (ratings) de uma rodada da Copa 2026 ao sistema Dezcalação.

**Tempo estimado:** 15-20 minutos por rodada  
**Pré-requisito:** Já ter o grupo criado e a rodada criada

---

## 📋 Checklist Antes de Começar

- ✅ Você tem os **prints/fotos dos jogos** com as notas de cada jogador
- ✅ A **rodada já existe** em `/admin/rodadas`
- ✅ Você é **admin do grupo**
- ✅ Você tem os **IDs do grupo e rodada** (vem da URL)

---

## 🔄 Processo em 4 Passos

### **Passo 1: Verificar Status (Sanidade Check)**

Antes de qualquer coisa, verifique se os times da rodada já estão no banco:

```bash
curl http://localhost:3000/api/sync-check
```

**Output esperado:**
- Se retorna `"status": "complete"` → Todos os times já estão sincronizados ✅
- Se retorna contador de requisições → Ainda faltam times para sincronizar

---

### **Passo 2: Sincronizar Times (Se Necessário)**

**Se a verificação mostrou times faltando:**

#### Opção A: Sincronizar 4 times sem gastar requisições (RECOMENDADO)
```bash
curl -X POST http://localhost:3000/api/sync-offline
```

#### Opção B: Sincronizar tudo (gasta requisições do plano free)
```bash
curl -X POST http://localhost:3000/api/rounds/auto-close \
  -H "Content-Type: application/json"
```

**Aguarde até ver:** `✅ Sincronização concluída`

---

### **Passo 3: Inserir Ratings**

#### Opção A: Via Script (Recomendado - Em Lotes)

**Preparar dados:**

1. Para cada jogo, extraia do print:
   - Nome do jogador
   - Nota (0.0-10.0)
   - Minutos em campo (0-90)

2. Crie arquivo `rodada-X-dados.json`:

```json
{
  "matches": [
    {
      "label": "Catar x Suíça",
      "home": "Catar",
      "away": "Suíça",
      "ratings": [
        { "name": "Abunada", "rating": 6.9, "minutes": 90 },
        { "name": "Khoukhi", "rating": 6.4, "minutes": 90 },
        { "name": "Kobel", "rating": 7.2, "minutes": 90 }
      ]
    }
  ]
}
```

3. Execute:
```bash
node scripts/bulk-insert-ratings.mjs <groupId> <roundId> rodada-X-dados.json
```

#### Opção B: Via Interface Admin (Jogo por Jogo)

1. Vá para `http://localhost:3000/admin/rodadas/[roundId]`
2. Para cada jogo:
   - Clique em "Criar jogo"
   - Preencha "Seleção mandante" e "Seleção visitante" (ex: "Catar" e "Suíça")
   - Clique "Criar jogo"
   - Clique no jogo para abrir
   - Cole as notas no bulk text:
     ```
     Abunada 6.9 90
     Khoukhi 6.4 90
     Kobel 7.2 90
     ```
   - Clique "Preencher notas"
   - Clique "Salvar jogo"

**Importante:** Use nomes EXATAMENTE como aparecem no banco de dados.

---

### **Passo 4: Recalcular Pontuação**

Depois que **todos os ratings estão inseridos**:

1. Vá para `http://localhost:3000/admin/rodadas/[roundId]`
2. Clique **"Recalcular pontuação"** (botão verde)
3. Aguarde a mensagem: `✅ Pontuação recalculada para X participantes`

---

## 🔍 Verificar Resultado

Após recalcular, os participantes devem ver:

1. **Em `/app` (home):**
   - Card "Seu Time": Mostra titulares com notas (em cores)
   - Card "🏆 Ranking": Atualiza com novos pontos
   - Seção "📊 Pontuação por Rodada": Mostra score da rodada

2. **Cores das notas:**
   - 🟢 Verde ≥ 7.0 (Bom)
   - 🟡 Amarelo 6.0-6.9 (Médio)
   - 🟠 Laranja 5.0-5.9 (Fraco)
   - 🔴 Vermelho < 5.0 (Péssimo)

---

## ⚠️ Troubleshooting

| Erro | Causa | Solução |
|------|-------|---------|
| "Jogadores não encontrados" | Times não sincronizados | Execute Passo 2 |
| "Rodada status locked" | Rodada já foi fechada | Crie nova rodada |
| "Ratings não aparecem" | Faltam dados ou erro de sync | Verifique Passo 3 |
| "Pontuação = 0" | Nomes dos jogadores errados | Corrija nomes exatos |

---

## 📌 Notas Importantes

1. **RLS & Permissões:** Você DEVE ser admin do grupo
2. **Nomes exatos:** Os nomes no bulk paste DEVEM existir no banco (case-sensitive)
3. **Minutos:** Se jogador entrou aos 60', use `30` (90-60)
4. **Requisições API:** Cada sincronização consome do limite de 100/dia
5. **Ratings Manuais:** Sempre sobrescrevem os automáticos (prioridade)

---

## 📱 Fluxo Resumido (1 Linha)

```
[Prints com notas] → Sync teams → Insert ratings → Recalculate → ✅ Pronto!
```

---

## 🚀 Comando Rápido (Para Criar Script Habitual)

Se você vai fazer isso frequentemente, salve:

```bash
#!/bin/bash
# sync-rodada.sh
groupId="15497f7b-d85d-4ade-9a39-2539f39f5742"
roundId="$1"

# 1. Sincronizar
curl -X POST http://localhost:3000/api/sync-offline

# 2. Inserir dados (você coloca seu arquivo)
node scripts/bulk-insert-ratings.mjs "$groupId" "$roundId" "rodada-$1-dados.json"

# 3. Recalcular
echo "✅ Ratings inseridos. Recalcule em: /admin/rodadas/$roundId"
```

Uso: `./sync-rodada.sh e174fa07-277f-4cc2-a35d-274fcc1fe7ae`

