# 📋 Prompt para Extrair Notas de Screenshots

Cole este prompt no ChatGPT junto com seus screenshots dos resultados de jogos.

---

## Instrução para o ChatGPT:

Você vai receber screenshots de partidas da Copa do Mundo 2026 (em um app de fantasy draft chamado Dezcalação). Para cada screenshot:

1. **Identifique:**
   - Nome do jogo (ex: "Brasil x Uruguai")
   - Placar final (ex: "2 x 1")
   - Lista de jogadores que jogaram, com:
     - Nome do jogador
     - Nota/rating (número de 0-10, pode ter decimais)
     - Minutos jogados (número inteiro)

2. **Extraia em este formato JSON:**

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
    {
      "name": "Vinicius Jr",
      "team": "Brasil",
      "rating": 8.5,
      "minutes": 90
    },
    {
      "name": "Rodrygo",
      "team": "Brasil",
      "rating": 7.2,
      "minutes": 76
    },
    {
      "name": "Neymar",
      "team": "Brasil",
      "rating": 8.1,
      "minutes": 90
    },
    {
      "name": "Luis Suárez",
      "team": "Uruguai",
      "rating": 6.8,
      "minutes": 88
    }
  ]
}
```

3. **Regras importantes:**
   - Se a nota não aparecer claramente, estime entre 5-7 (neutro)
   - Se os minutos não aparecerem, use 90 (jogo completo) se fez gol/teve destaque, senão 45-60
   - Nomes exatos: use a grafia do app/estatísticas oficiais
   - Ordene players por time (Brasil primeiro, depois adversário)
   - Se houver multiple screenshots, faça um JSON por jogo (separados por `---`)

4. **Após extrair, forneça:**
   - O JSON acima
   - Uma linha de verificação: `JOGO VALIDADO: [Time1] X [Time2] | [N] jogadores`

---

## Exemplo de resposta esperada:

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
    {"name": "Vinicius Jr", "team": "Brasil", "rating": 8.5, "minutes": 90},
    {"name": "Rodrygo", "team": "Brasil", "rating": 7.2, "minutes": 76},
    {"name": "Neymar", "team": "Brasil", "rating": 8.1, "minutes": 90},
    {"name": "Luis Suárez", "team": "Uruguai", "rating": 6.8, "minutes": 88}
  ]
}
```

JOGO VALIDADO: Brasil X Uruguai | 4 jogadores

---

## Como usar:

1. Você: Manda print(s) + este prompt pro ChatGPT
2. ChatGPT: Extrai e valida os dados em JSON
3. Você: Copia o JSON + valida os nomes
4. Você: Usa o script `scripts/bulk-insert-ratings.mjs` pra importar pro banco

---

**Dúvidas?** Se o ChatGPT não conseguir extrair de um screenshot, peça:
- "Aumenta o zoom nessa área"
- "Reescreve em minúsculas os nomes"
- "Confirma se viu [X jogador]"

Boa sorte! 🚀
