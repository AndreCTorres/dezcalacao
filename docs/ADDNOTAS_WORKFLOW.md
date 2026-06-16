# Workflow manual de notas

Este fluxo foi pensado para o cenario real do projeto: voce tem prints dos jogos,
usa uma IA/OCR para transformar os prints em texto estruturado, confere os nomes e
sobe as notas de cada jogo ou de uma rodada inteira.

## Caminho recomendado

1. Crie a rodada em `/admin/rodadas`.
2. Pegue o `groupId` e o `roundId`.
   - O `roundId` aparece na URL quando voce entra em uma rodada.
   - O `groupId` aparece no banco ou nos scripts de apoio.
3. Transforme os prints em um arquivo JSON no formato abaixo.
4. Rode uma simulacao.
5. Corrija nomes que nao baterem.
6. Grave as notas.
7. Clique em `Recalcular pontuacao` na tela da rodada.

## Formato do arquivo

Crie um arquivo como `rodada-1-notas.json`:

```json
{
  "matches": [
    {
      "label": "Qatar x Switzerland",
      "home": "Qatar",
      "away": "Switzerland",
      "ratings": [
        { "name": "M. I. Abunada", "rating": 6.9, "minutes": 90 },
        { "name": "B. Khoukhi", "rating": 6.4, "minutes": 90 },
        { "name": "G. Kobel", "rating": 7.2, "minutes": 90 }
      ]
    }
  ]
}
```

Use `home` e `away` iguais aos nomes das selecoes cadastradas nos jogadores. A
tela da rodada mostra esses nomes no campo de criar jogo.

## Prompt para usar com IA/OCR

Cole o print ou o texto extraido e peca:

```text
Extraia as notas deste jogo para JSON, exatamente neste formato:

{
  "label": "TIME A x TIME B",
  "home": "TIME A",
  "away": "TIME B",
  "ratings": [
    { "name": "Nome do jogador", "rating": 7.1, "minutes": 90 }
  ]
}

Regras:
- use ponto decimal, nao virgula;
- minutes deve ser um numero inteiro;
- se o jogador entrou aos 60 minutos, use 30;
- nao invente jogadores que nao aparecem no print;
- devolva somente JSON valido.
```

Depois junte os jogos dentro de `"matches": [...]`.

## Simular antes de gravar

```bash
npm run ratings:bulk -- <groupId> <roundId> rodada-1-notas.json --dry-run
```

A simulacao mostra:

- quantos jogadores foram encontrados por jogo;
- nomes que nao bateram;
- sugestoes de nomes parecidos;
- correspondencias menos obvias para voce conferir.

## Gravar notas

Quando a simulacao estiver boa:

```bash
npm run ratings:bulk -- <groupId> <roundId> rodada-1-notas.json
```

Por seguranca, se algum jogador nao for encontrado, o script nao grava nada. Se
voce quiser gravar apenas os encontrados mesmo assim:

```bash
npm run ratings:bulk -- <groupId> <roundId> rodada-1-notas.json --allow-unmatched
```

## Via tela admin

Tambem da para fazer jogo por jogo pela interface:

1. Abra `/admin/rodadas/<roundId>`.
2. Crie o jogo usando os nomes das selecoes.
3. Clique no jogo.
4. Cole linhas assim no campo de notas:

```text
M. I. Abunada 6.9 90
B. Khoukhi 6.4 90
G. Kobel 7.2 90
```

5. Clique em `Preencher notas`.
6. Revise os nomes que nao baterem.
7. Clique em `Salvar jogo`.

## Depois de inserir tudo

Na tela da rodada, clique em `Recalcular pontuacao`. Isso recalcula os placares
dos participantes e marca a rodada como pontuada.

## Variaveis necessarias

O script usa `.env.local` ou variaveis de ambiente:

```text
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Nao commite `.env.local`.
