# 🚀 Guia Rápido: Inserir Notas em Massa

Fluxo completo para extrair dados de screenshots e jogar no banco.

---

## Passo 1️⃣ : Preparar Screenshots

Tire screenshots dos resultados de cada jogo com:
- ✅ Nome das seleções (Brasil x Uruguai)
- ✅ Placar final (2 x 1)
- ✅ Lista de jogadores que jogaram
- ✅ Nota de cada jogador (0-10)
- ✅ Minutos (ex: 90, 76, 45)

Exemplo de área a capturar:
```
┌─────────────────────────────────┐
│ BRASIL x URUGUAI                │
│ 2 x 1                           │
│ ─────────────────────────────── │
│ BRASIL                          │
│ Vinicius Jr       8.5 / 90'     │
│ Rodrygo          7.2 / 76'      │
│ Neymar           8.1 / 90'      │
│ ─────────────────────────────── │
│ URUGUAI                         │
│ Luis Suárez       6.8 / 88'     │
└─────────────────────────────────┘
```

---

## Passo 2️⃣ : Mandar pro ChatGPT

1. Abra ChatGPT (chat.openai.com)
2. Copie o conteúdo de **`PROMPT_EXTRAIR_NOTAS.md`** (este projeto)
3. Cole a mensagem + anexe seus screenshots
4. O ChatGPT vai retornar JSON estruturado

Exemplo de prompt:
```
[Você cola PROMPT_EXTRAIR_NOTAS.md aqui]

[Você sobe 3-5 screenshots de jogos]
```

---

## Passo 3️⃣ : Copiar JSON do ChatGPT

ChatGPT retorna algo assim:

```json
{
  "fixture": {
    "title": "BRASIL x URUGUAI",
    "homeTeam": "Brasil",
    "awayTeam": "Uruguai",
    "homeGoals": 2,
    "awayGoals": 1
  },
  "players": [
    { "name": "Vinicius Jr", "team": "Brasil", "rating": 8.5, "minutes": 90 },
    { "name": "Rodrygo", "team": "Brasil", "rating": 7.2, "minutes": 76 },
    { "name": "Neymar", "team": "Brasil", "rating": 8.1, "minutes": 90 },
    { "name": "Luis Suárez", "team": "Uruguai", "rating": 6.8, "minutes": 88 }
  ]
}
```

---

## Passo 4️⃣ : Editar `scripts/bulk-insert-ratings.mjs`

1. Abra `scripts/bulk-insert-ratings.mjs`
2. Procure a linha: `const DATA = [`
3. **Cole o JSON do ChatGPT** dentro de `DATA` (substituindo o comentário)

Exemplo do arquivo editado:
```javascript
const DATA = [
  {
    "fixture": {
      "title": "BRASIL x URUGUAI",
      "homeTeam": "Brasil",
      "awayTeam": "Uruguai",
      "homeGoals": 2,
      "awayGoals": 1
    },
    "players": [
      { "name": "Vinicius Jr", "team": "Brasil", "rating": 8.5, "minutes": 90 },
      { "name": "Luis Suárez", "team": "Uruguai", "rating": 6.8, "minutes": 88 }
    ]
  },
  // Próximo jogo aqui...
]
```

---

## Passo 5️⃣ : Rodar o Script

No terminal do projeto:

```bash
node scripts/bulk-insert-ratings.mjs
```

**Saída esperada:**
```
📊 BULK INSERT - Notas de Jogadores
============================================================

✅ 2 jogo(s) para processar

🔍 Procurando rodada aberta...
   ✓ Rodada: "Rodada 1" (ID: abc123)

📍 Jogo 1: BRASIL x URUGUAI
   2 x 1
   ✓ Fixture ID: 42
   👥 Jogadores: 4 fornecidos, 4 encontrados
   ✓ 4 notas inseridas

============================================================

✅ CONCLUÍDO: 4 notas inseridas no banco
   Rodada: "Rodada 1"
   Jogos processados: 1

🎯 Próximos passos:
   1. Verifique em /admin/rodadas/abc123
   2. Se tudo certo, feche a rodada (calcular pontuação)
   3. Veja em /app/notas
```

---

## ✅ Verificação

Após rodar, vá para:

1. **Admin**: `http://localhost:3000/admin/rodadas/[roundId]`
   - Veja os jogos com notas preenchidas
   - Verifique se os placares bateram

2. **Participante**: `http://localhost:3000/app/notas`
   - Veja os jogos com todos os jogadores + notas
   - Clique nos jogos para ver detalhes

3. **Fechar Rodada**: Em `/admin/rodadas`, clique "Fechar Rodada"
   - Calcula pontuação automaticamente
   - Atualiza o ranking

---

## 🆘 Troubleshooting

### ❌ "Rodada não encontrada"
- Vá em `/admin/rodadas`
- Crie uma rodada (status deve ser **"open"**)
- Tente novamente

### ❌ "Jogadores não encontrados"
- Nomes errados? ChatGPT às vezes muda grafia
- Vá em `/admin/rodadas/[roundId]`
- Veja os nomes exatos dos jogadores no banco
- Corrija no JSON antes de rodar

### ❌ "Erro ao inserir"
- Cheque `.env.local`: tem `SUPABASE_SERVICE_ROLE_KEY`?
- Supabase RLS pode estar bloqueando
- Contate admin

### ⚠️ "Jogador encontrado mas não inseriu"
- Pode ser problema de conflito (já existe)
- Script usa `upsert` = atualiza se já existe
- Verifique em `/admin/rodadas`

---

## 🎯 Tips

1. **Multiple jogos de uma vez**: Cole vários JSONs em `DATA`
   ```javascript
   const DATA = [
     { jogo 1 },
     { jogo 2 },
     { jogo 3 }
   ]
   ```

2. **Validar antes**: Rode com 1 jogo primeiro
   - Se funcionar, adicione mais

3. **Backup**: Antes de rodar script grande
   - Export das ratings atuais (Supabase dashboard)

4. **Dúvida com ChatGPT?**: Mande um novo print e diga:
   - "Aumenta zoom"
   - "Reescreve os nomes"
   - "Confirma se é [Nome Exato]"

---

## 📋 Checklist

- [ ] Screenshots prontos (todos os jogos)
- [ ] Rodada criada e **status = "open"**
- [ ] JSON extraído do ChatGPT
- [ ] JSON colado em `scripts/bulk-insert-ratings.mjs`
- [ ] `.env.local` tem `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Rodou `node scripts/bulk-insert-ratings.mjs`
- [ ] Verificou em `/admin/rodadas/[roundId]`
- [ ] Fechou a rodada em `/admin/rodadas`
- [ ] Viu em `/app/notas` os scores aparecerem

---

**Dúvidas?** Revise `PROMPT_EXTRAIR_NOTAS.md` ou execute:
```bash
node scripts/bulk-insert-ratings.mjs --help
```

Boa sorte! 🚀⚽
