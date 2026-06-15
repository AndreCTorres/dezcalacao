# 📋 Guia: Sincronizar Ratings da Copa 2026

## Problema
Quando você traz dados de novos jogos (prints com fotos + notas), os jogadores ainda não estão no banco de dados. Precisa sincronizá-los primeiro via API-Football.

## Solução: 3 Passos

### **Passo 1: Sincronizar Jogadores (Squads)**
Se os jogadores de uma seleção não existem no banco, use:

```bash
GET /api/sync-check
```
Para ver quantas requisições fará.

Depois:
```bash
POST /api/sync-offline  (recomendado para poupar requisições)
OU
POST /api/rounds/auto-close (sincroniza todos os 48 times)
```

**IMPORTANTE:** A API-Football tem limite de ~100 requisições/dia no plano free!

---

### **Passo 2: Inserir Ratings (Notas dos Jogadores)**

#### Opção A: Via Script (Automático) - **RECOMENDADO**
```bash
# 1. Copie os prints com as fotos + notas
# 2. Extraia o nome de cada jogador
# 3. Crie um arquivo com a estrutura (ver exemplos abaixo)
# 4. Rode o script:

node scripts/seed-round-ratings.mjs "<groupId>" "<roundId>" "<matchesData>"
```

#### Opção B: Via Admin UI (Manual)
1. Vá para `/admin/rodadas/[roundId]`
2. Crie o "Jogo" (fixture) com "Seleção mandante" e "Seleção visitante"
3. Abra o jogo e cole as notas no bulk text:
   ```
   Nome Jogador 7.5 90
   Outro Jogador 6.8 45
   ```
4. Clique "Salvar jogo"

---

### **Passo 3: Recalcular Pontuação**

Depois que todos os ratings estão inseridos:

```bash
POST /admin/rodadas/[roundId]
Clique em "Recalcular pontuação"
```

Isso vai:
- Buscar todos os ratings inseridos
- Calcular nota de cada jogador da rodada
- Atualizar pontos de todos os membros do grupo

---

## Formato de Dados (Para Script)

**Arquivo JSON com nomes e notas:**
```json
{
  "matches": [
    {
      "label": "Catar x Suíça",
      "home": "Catar",
      "away": "Suíça",
      "ratings": [
        { "name": "Abunada", "rating": 6.9, "minutes": 90 },
        { "name": "Khoukhi", "rating": 6.4, "minutes": 90 }
      ]
    }
  ]
}
```

**OU Texto (para UI bulk paste):**
```
Abunada 6.9 90
Khoukhi 6.4 90
P. Miguel 7.4 90
```

---

## Troubleshooting

### "Jogadores não encontrados"
→ Execute o passo 1 (sincronizar jogadores primeiro)

### "Rodada não existe"
→ Crie a rodada em `/admin/rodadas`

### "Ratings não aparecem no ranking"
→ Clique "Recalcular pontuação" após inserir todos os ratings

---

## Processo Completo (Resumido)

1. **Admin:** Sinc ronize jogadores → `/api/sync-offline`
2. **Admin:** Insira ratings → `/admin/rodadas/[roundId]`
3. **Admin:** Recalcule → "Recalcular pontuação"
4. **Participantes:** Veem notas em `/app` (home dashboard)

---

## APIs Úteis

| Endpoint | Uso |
|----------|-----|
| `GET /api/sync-check` | Ver quantas requisições fará |
| `POST /api/sync-offline` | Sincronizar 4 times sem requisições |
| `POST /api/rounds/auto-close` | Sincronizar todos + fechar rodada |
| `GET /admin/rodadas/[roundId]` | UI para criar fixtures e inserir ratings |

---

## Dicas

- **Sempre use `/api/sync-check` ANTES de sincronizar** para saber o custo em requisições
- **Prefira `/api/sync-offline`** para poupar requisições (sincroniza times já conhecidos)
- **Ratings manuais têm prioridade** sobre ratings da API-Football
- **Recalcule sempre após mudanças** de ratings

