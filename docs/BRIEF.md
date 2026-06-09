# Dezcalação — Brief do Projeto

> Documento de contexto para desenvolvimento (cole isto no Cursor como base do projeto).
> Última atualização: junho/2026.

## 1. O que é

**Dezcalação** é um *fantasy draft* da Copa do Mundo para jogar entre amigos.
Um grupo de pessoas monta cada um seu time de 16 jogadores convocados para a Copa, e
ao longo do torneio a **nota de desempenho** real de cada jogador em campo vira pontos.
Ganha quem somar mais pontos na rodada e, no fim, quem somar mais no torneio inteiro.

O nome brinca com "Dezo" (apelido do criador) + "dez" (a nota perfeita) + "escalação".

## 2. Regras do jogo (a fonte da verdade)

- Cada participante tem um time de **16 jogadores: 11 titulares + 5 reservas**.
- **Um jogador por seleção**: os 16 vêm de 16 seleções diferentes. Não pode empilhar
  jogadores do mesmo país no mesmo time.
- Cada jogador drafttado é **exclusivo dentro do grupo**: se um membro pegou, ninguém
  mais do grupo pode pegar (clássico draft).
- **Posições** usadas no jogo: `GK` (goleiro), `ZAG` (zagueiro), `LAT` (lateral),
  `MEI` (meio-campo), `ATK` (ataque).
- **Substituições**: ao longo do torneio, o participante pode trocar reservas pela
  escalação titular para cobrir notas ruins, **respeitando a posição** (um MEI só entra
  no lugar de outro MEI, etc.). Limite: até **3 trocas** (ver "Decisões em aberto" sobre
  se é por rodada ou no total — começar com 3 por rodada).

## 3. Motor de pontuação

**Decisão tomada: a pontuação é a NOTA de desempenho do jogador no jogo** (escala ~0–10,
estilo das notas que sites como Sofascore atribuem). Escolhemos nota em vez de um sistema
de pontos por eventos (gol/assistência) porque a nota **já embute** passes, desarmes,
duelos, dribles etc. num número só — então premia justamente quem joga bem mesmo sem
números inflados (ex.: um meia armador que controla o jogo sem fazer gol).

### Cálculo da rodada (por participante)
1. Some a **nota de cada um dos 11 titulares** naquela rodada (após substituições).
2. **Minutagem**: jogador com menos de ~20 min em campo não pontua (ou pontua com piso).
   Evita que um cara que entrou nos minutos finais valha igual a quem jogou 90.
3. **Sem jogo / eliminado**: jogador cuja seleção não jogou ou foi eliminada = 0 na rodada.
   É aí que entram as substituições, pra cobrir o buraco.
4. **Dado faltando**: se a nota ainda não saiu, usar valor neutro temporário e recalcular
   quando o dado chegar (não travar a rodada).

### Bônus (FASE 2 — começar desligado)
- **Seleção da Rodada**: o sistema monta um XI com as **maiores notas por posição** da
  rodada (gerado do mesmo dado de nota, então é determinístico e sem briga). Quem tiver um
  jogador nesse XI ganha pontos extras.
- **Craque da partida**: o maior rating de cada jogo rende um bônus a quem tem aquele jogador.
  (Existe a versão oficial "Player of the Match" da FIFA, mas ela não vem limpa nas APIs;
  por isso derivamos pela nota, ou inserimos manualmente se quiser o selo oficial.)

> O MVP entrega **só a nota**. Os bônus entram depois, são aditivos e configuráveis por grupo.

## 4. Modelo do draft (decisão tomada)

O draft **acontece fora da plataforma** (transmissão no Discord, admin conduzindo). A
plataforma **só registra o resultado**:

- O **admin** tem uma tela de draft onde seleciona um membro e vai **atribuindo jogadores**
  a ele (busca na lista de convocados, com validação de "um por seleção" e dos slots de posição).
- Quando termina, o admin **fecha o draft** e a temporada começa.
- Não há draft em tempo real, nem turnos, nem escolha concorrente. Membros não precisam
  estar online no draft — só precisam de conta pra depois ver o time e fazer trocas.

(Um draft ao vivo dentro da plataforma é um possível upgrade futuro, não faz parte do MVP.)

## 5. Fonte de dados

**API-Football** (api-sports.io, também disponível via RapidAPI). É a fonte viável que
fornece **nota por jogador por jogo**. Sofascore e Flashscore **não têm API pública oficial**
— usar os endpoints internos deles é frágil e contra os termos, então não dependemos disso.

Endpoints principais (confirmar IDs e formato na doc oficial antes de codar):
- **Squads / convocados** por seleção → popula a lista de jogadores do draft (de graça).
- **Fixtures** por liga (Copa do Mundo) + temporada 2026 → calendário/rodadas.
- **Players por fixture** (estatísticas do jogo) → traz o campo `rating` por jogador.

> ⚠️ A API classifica posição como GK / Defender / Midfielder / Attacker. Dividir
> "Defender" em `ZAG` vs `LAT` precisa de mapeamento manual/heurístico — prever um campo
> editável de posição ao cadastrar os jogadores.

Custo: com **cache** (puxar uma vez após cada jogo e guardar), o **free tier (~100 req/dia)**
provavelmente já basta para um grupo de amigos. Verificar planos/preços atuais antes de
decidir pagar.

**Segurança:** a chave da API **nunca** vai pro navegador. Toda chamada à API-Football
passa por rota de servidor (API route do Next). Chave em `.env.local` / variável de ambiente.

## 6. Stack

- **Front-end + back-end:** Next.js (App Router) + TypeScript. As rotas de API do Next
  guardam a chave e fazem o cálculo da pontuação.
- **Banco + Auth:** Supabase (Postgres + Auth). Login por link mágico (e-mail) ou Google.
- **Hospedagem:** Vercel (front + serverless) + Supabase. Ambos têm free tier.
- **Atualização das rodadas:** começar com um **botão "fechar rodada"** no painel do admin
  (puxa as notas dos jogos daquela rodada e calcula). Automatizar com cron (Vercel Cron)
  depois, se quiser.

## 7. Páginas

Públicas:
- `/` — landing (já existe: `dezcalacao.html`).
- `/login` — autenticação (Supabase).

Participante (logado):
- `/app` — home: meu time, minha pontuação na rodada, classificação do grupo.
- `/app/time` — ver escalação e **fazer substituições** (respeitando posição e limite).

Admin (logado, dono do grupo):
- `/admin` — criar grupo, **convidar/adicionar membros**, configurar regras.
- `/admin/draft` — **atribuir jogadores a cada membro** e fechar o draft.
- `/admin/rodadas` — gerenciar rodadas e **fechar rodada** (puxa notas + calcula).

Rotas de API (servidor, seguram a chave):
- `POST /api/sync/squads` — busca convocados e popula a tabela `players`.
- `POST /api/sync/ratings` — busca notas dos jogos de uma rodada.
- `POST /api/scoring/compute` — calcula a pontuação da rodada por participante.

## 8. Modelo de dados

Ver `supabase/schema.sql` para o DDL completo. Resumo das tabelas:

- `profiles` — usuários (vinculado ao auth do Supabase).
- `groups` — grupos/bolões (admin, temporada, status: setup→drafting→active→finished).
- `group_members` — membros do grupo (pode existir antes da conta; `profile_id` nulo até aceitar).
- `players` — jogadores convocados (vindos da API; `position` editável por causa de ZAG/LAT).
- `team_players` — quem pegou quem (slot titular/reserva + posição). Draft registrado aqui.
- `rounds` — rodadas/matchdays.
- `fixtures` — jogos (referência).
- `player_round_ratings` — nota de cada jogador em cada rodada (puxada da API).
- `substitutions` — trocas de reserva→titular por rodada (com limite).
- `round_scores` — pontuação calculada por participante por rodada (base + bônus + total).

## 9. Escopo do MVP

Entregar primeiro:
1. Login + criar grupo + convidar membros.
2. Sincronizar convocados (popular `players`).
3. Tela de draft do admin (atribuir jogadores, validar regras, fechar draft).
4. Tela do participante (ver time + classificação).
5. Fechar rodada (puxar notas, calcular pontuação só pela nota).
6. Substituições por posição.

Depois (fase 2): bônus (Seleção da Rodada, craque da partida), automação por cron,
draft ao vivo dentro da plataforma, abrir pro público.

## 10. Decisões em aberto

- Limite de substituições: 3 por rodada **ou** 3 no total do torneio? (começar: 3 por rodada).
- Piso de minutagem exato (sugestão: 20 min).
- Como tratar prorrogação/pênaltis no mata-mata (a nota cobre, mas confirmar).
- Critério de desempate na classificação (sugestão: maior nota individual na rodada).

## 11. Tom / UI

- Copy em **português do Brasil**, informal mas claro.
- Identidade visual da landing: estádio à noite, verde-tinta escuro, acento verde-limão,
  dourado para "nota". Tipografia: Anton (títulos), Hanken Grotesk (corpo), Space Mono (números).
- **Sem** usar marcas/logos da FIFA ou imagens de jogadores reais sem cuidado de direito de
  imagem. É um bolão entre amigos, **sem apostas**.
