# Prompt para Extrair Notas de Screenshots

Cole este prompt no ChatGPT junto com os screenshots dos resultados de jogos.

---

## Instrucao para o ChatGPT

Voce vai receber screenshots de partidas da Copa do Mundo 2026 para alimentar um app de fantasy draft chamado Dezcalacao.

Para cada jogo, extraia somente dados visiveis ou muito provaveis do print e devolva em JSON valido.

## Formato obrigatorio

Responda somente com JSON, sem markdown, sem explicacoes antes ou depois.

```json
{
  "fixture": {
    "title": "QATAR x SWITZERLAND",
    "homeTeam": "Qatar",
    "awayTeam": "Switzerland",
    "homeGoals": 1,
    "awayGoals": 1
  },
  "players": [
    { "name": "M. I. Abunada", "team": "Qatar", "rating": 6.9, "minutes": 90 },
    { "name": "B. Khoukhi", "team": "Qatar", "rating": 6.4, "minutes": 90 },
    { "name": "P. Miguel", "team": "Qatar", "rating": 7.4, "minutes": 90 },
    { "name": "G. Kobel", "team": "Switzerland", "rating": 7.2, "minutes": 90 },
    { "name": "G. Xhaka", "team": "Switzerland", "rating": 7.2, "minutes": 90 }
  ]
}
```

## Regras de padronizacao

- Use nomes das selecoes em ingles, no padrao do banco/API-Football.
- Use `Qatar`, nunca `Catar`.
- Use `Switzerland`, nunca `Suica`.
- Use `Brazil`, nunca `Brasil`.
- Use `Germany`, nunca `Alemanha`.
- Use `South Korea`, nunca `Coreia do Sul`.
- Use `Czech Republic` ou `Czechia`, nunca `Rep. Tcheca`.
- Use `United States` ou `USA`, nunca `EUA`.
- Use `Morocco`, nunca `Marrocos`.
- Use `Turkey`, nunca `Turquia`.
- Use `Japan`, nunca `Japao`.
- Use `Netherlands`, nunca `Holanda`.
- Use `Ivory Coast`, nunca `Costa do Marfim`.
- Use `Ecuador`, nunca `Equador`.
- Use `Paraguay`, nunca `Paraguai`.
- Use `South Africa`, nunca `Africa do Sul`.

## Regras para nomes dos jogadores

- Priorize o nome curto exibido no app de estatisticas, porque o banco costuma usar esse padrao.
- Quando o print mostrar nome completo, prefira a versao curta/abreviada mais comum.
- Exemplos:
  - `Boualem Khoukhi` deve virar `B. Khoukhi`.
  - `Pedro Miguel` deve virar `P. Miguel`.
  - `Jassem Gaber Abdulsallam` deve virar `J. G. Abdulsallam`.
  - `Assim Madibo` deve virar `A. Madibo`.
  - `Yousef Abdurisag` deve virar `Y. Abdurisag`.
  - `Edmilson Junior` deve virar `E. Junior`.
  - `Akram Afif` deve virar `A. Afif`.
  - `Breel Embolo` deve virar `B. Embolo`.
  - `Granit Xhaka` deve virar `G. Xhaka`.
  - `Dan Ndoye` deve virar `D. Ndoye`.
  - `Michel Aebischer` deve virar `M. Aebischer`.
  - `Denis Zakaria` deve virar `D. Zakaria`.
  - `Nico Elvedi` deve virar `N. Elvedi`.
  - `Manuel Akanji` deve virar `M. Akanji`.
  - `Ricardo Rodriguez` deve virar `R. Rodriguez`.
  - `Gregor Kobel` deve virar `G. Kobel`.
  - `Ruben Vargas` deve virar `R. Vargas`.
  - `Remo Freuler` deve virar `R. Freuler`.

## Regras de extracao

- Extraia o nome do jogo.
- Extraia o placar final.
- Extraia todos os jogadores que participaram da partida.
- Para cada jogador, extraia:
  - `name`: nome padronizado do jogador.
  - `team`: selecao em ingles.
  - `rating`: nota de 0 a 10, usando ponto decimal.
  - `minutes`: minutos jogados como numero inteiro.
- Ordene os jogadores pelo time mandante primeiro e depois pelo visitante.
- Em geral, devem existir no maximo 16 jogadores por time: 11 titulares + ate 5 reservas que entraram.
- Nao inclua jogadores que ficaram no banco e nao entraram.
- Se a nota nao estiver visivel, use `null`.
- Se os minutos nao estiverem visiveis, estime pelos dados do print. Se nao houver pista, use `90` para titular e `0` para jogador que nao entrou.

## Validacao antes de responder

Antes de finalizar, confira:

- `homeTeam` e `awayTeam` estao em ingles.
- Todos os valores `team` nos jogadores estao em ingles.
- O JSON e valido.
- Nao ha texto fora do JSON.
- Nao ha jogadores duplicados.
- Nao ha mais de 16 jogadores por time.

## Exemplo completo

```json
{
  "fixture": {
    "title": "QATAR x SWITZERLAND",
    "homeTeam": "Qatar",
    "awayTeam": "Switzerland",
    "homeGoals": 1,
    "awayGoals": 1
  },
  "players": [
    { "name": "M. I. Abunada", "team": "Qatar", "rating": 6.9, "minutes": 90 },
    { "name": "B. Khoukhi", "team": "Qatar", "rating": 6.4, "minutes": 90 },
    { "name": "P. Miguel", "team": "Qatar", "rating": 7.4, "minutes": 90 },
    { "name": "A. Madibo", "team": "Qatar", "rating": 6.3, "minutes": 79 },
    { "name": "A. Afif", "team": "Qatar", "rating": 7.2, "minutes": 90 },
    { "name": "G. Kobel", "team": "Switzerland", "rating": 7.2, "minutes": 90 },
    { "name": "G. Xhaka", "team": "Switzerland", "rating": 7.2, "minutes": 90 },
    { "name": "B. Embolo", "team": "Switzerland", "rating": 7.0, "minutes": 90 },
    { "name": "R. Rodriguez", "team": "Switzerland", "rating": 7.6, "minutes": 89 },
    { "name": "R. Vargas", "team": "Switzerland", "rating": 7.9, "minutes": 79 }
  ]
}
```

---

## Como usar

1. Envie este prompt junto com os prints.
2. Copie somente o JSON retornado.
3. Cole o JSON na tela de notas do jogo correspondente.
4. Revise o contador de correspondencias antes de salvar.
