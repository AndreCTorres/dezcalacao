# DezcalaÃ§Ã£o â€” Brief do Projeto

> Documento de contexto para desenvolvimento (cole isto no Cursor como base do projeto).
> Ãšltima atualizaÃ§Ã£o: junho/2026.

## 1. O que Ã©

**DezcalaÃ§Ã£o** Ã© um *fantasy draft* da Copa do Mundo para jogar entre amigos.
Um grupo de pessoas monta cada um seu time de 16 jogadores convocados para a Copa, e
ao longo do torneio a **nota de desempenho** real de cada jogador em campo vira pontos.
Ganha quem somar mais pontos na rodada e, no fim, quem somar mais no torneio inteiro.

O nome brinca com "Dezo" (apelido do criador) + "dez" (a nota perfeita) + "escalaÃ§Ã£o".

## 2. Regras do jogo (a fonte da verdade)

- Cada participante tem um time de **16 jogadores: 11 titulares + 5 reservas**.
- **Um jogador por seleÃ§Ã£o**: os 16 vÃªm de 16 seleÃ§Ãµes diferentes. NÃ£o pode empilhar
  jogadores do mesmo paÃ­s no mesmo time.
- Cada jogador drafttado Ã© **exclusivo dentro do grupo**: se um membro pegou, ninguÃ©m
  mais do grupo pode pegar (clÃ¡ssico draft).
- **PosiÃ§Ãµes** usadas no jogo: `GK` (goleiro), `ZAG` (zagueiro), `LAT` (lateral),
  `MEI` (meio-campo), `ATK` (ataque).
- **SubstituiÃ§Ãµes**: ao longo do torneio, o participante pode trocar reservas pela
  escalaÃ§Ã£o titular para cobrir notas ruins, **respeitando a posiÃ§Ã£o** (um MEI sÃ³ entra
  no lugar de outro MEI, etc.). Limite: atÃ© **3 trocas** (ver "DecisÃµes em aberto" sobre
  se Ã© por rodada ou no total â€” comeÃ§ar com 3 por rodada).

## 3. Motor de pontuaÃ§Ã£o

**DecisÃ£o tomada: a pontuaÃ§Ã£o Ã© a NOTA de desempenho do jogador no jogo** (escala ~0â€“10,
estilo das notas que sites como Sofascore atribuem). Escolhemos nota em vez de um sistema
de pontos por eventos (gol/assistÃªncia) porque a nota **jÃ¡ embute** passes, desarmes,
duelos, dribles etc. num nÃºmero sÃ³ â€” entÃ£o premia justamente quem joga bem mesmo sem
nÃºmeros inflados (ex.: um meia armador que controla o jogo sem fazer gol).

### CÃ¡lculo da rodada (por participante)
1. Some a **nota de cada um dos 11 titulares** naquela rodada (apÃ³s substituiÃ§Ãµes).
2. **Minutagem**: os minutos são registrados para conferência, mas não filtram a pontuação. Se o jogador tem nota, a nota conta integralmente.
3. **Sem jogo / eliminado**: jogador cuja seleÃ§Ã£o nÃ£o jogou ou foi eliminada = 0 na rodada.
   Ã‰ aÃ­ que entram as substituiÃ§Ãµes, pra cobrir o buraco.
4. **Dado faltando**: se a nota ainda nÃ£o saiu, usar valor neutro temporÃ¡rio e recalcular
   quando o dado chegar (nÃ£o travar a rodada).

### BÃ´nus (FASE 2 â€” comeÃ§ar desligado)
- **SeleÃ§Ã£o da Rodada**: o sistema monta um XI com as **maiores notas por posiÃ§Ã£o** da
  rodada (gerado do mesmo dado de nota, entÃ£o Ã© determinÃ­stico e sem briga). Quem tiver um
  jogador nesse XI ganha pontos extras.
- **Craque da partida**: o maior rating de cada jogo rende um bÃ´nus a quem tem aquele jogador.
  (Existe a versÃ£o oficial "Player of the Match" da FIFA, mas ela nÃ£o vem limpa nas APIs;
  por isso derivamos pela nota, ou inserimos manualmente se quiser o selo oficial.)

> O MVP entrega **sÃ³ a nota**. Os bÃ´nus entram depois, sÃ£o aditivos e configurÃ¡veis por grupo.

## 4. Modelo do draft (decisÃ£o tomada)

O draft **acontece fora da plataforma** (transmissÃ£o no Discord, admin conduzindo). A
plataforma **sÃ³ registra o resultado**:

- O **admin** tem uma tela de draft onde seleciona um membro e vai **atribuindo jogadores**
  a ele (busca na lista de convocados, com validaÃ§Ã£o de "um por seleÃ§Ã£o" e dos slots de posiÃ§Ã£o).
- Quando termina, o admin **fecha o draft** e a temporada comeÃ§a.
- NÃ£o hÃ¡ draft em tempo real, nem turnos, nem escolha concorrente. Membros nÃ£o precisam
  estar online no draft â€” sÃ³ precisam de conta pra depois ver o time e fazer trocas.

(Um draft ao vivo dentro da plataforma Ã© um possÃ­vel upgrade futuro, nÃ£o faz parte do MVP.)

## 5. Fonte de dados

**API-Football** (api-sports.io, tambÃ©m disponÃ­vel via RapidAPI). Ã‰ a fonte viÃ¡vel que
fornece **nota por jogador por jogo**. Sofascore e Flashscore **nÃ£o tÃªm API pÃºblica oficial**
â€” usar os endpoints internos deles Ã© frÃ¡gil e contra os termos, entÃ£o nÃ£o dependemos disso.

Endpoints principais (confirmar IDs e formato na doc oficial antes de codar):
- **Squads / convocados** por seleÃ§Ã£o â†’ popula a lista de jogadores do draft (de graÃ§a).
- **Fixtures** por liga (Copa do Mundo) + temporada 2026 â†’ calendÃ¡rio/rodadas.
- **Players por fixture** (estatÃ­sticas do jogo) â†’ traz o campo `rating` por jogador.

> âš ï¸ A API classifica posiÃ§Ã£o como GK / Defender / Midfielder / Attacker. Dividir
> "Defender" em `ZAG` vs `LAT` precisa de mapeamento manual/heurÃ­stico â€” prever um campo
> editÃ¡vel de posiÃ§Ã£o ao cadastrar os jogadores.

Custo: com **cache** (puxar uma vez apÃ³s cada jogo e guardar), o **free tier (~100 req/dia)**
provavelmente jÃ¡ basta para um grupo de amigos. Verificar planos/preÃ§os atuais antes de
decidir pagar.

**SeguranÃ§a:** a chave da API **nunca** vai pro navegador. Toda chamada Ã  API-Football
passa por rota de servidor (API route do Next). Chave em `.env.local` / variÃ¡vel de ambiente.

## 6. Stack

- **Front-end + back-end:** Next.js (App Router) + TypeScript. As rotas de API do Next
  guardam a chave e fazem o cÃ¡lculo da pontuaÃ§Ã£o.
- **Banco + Auth:** Supabase (Postgres + Auth). Login por link mÃ¡gico (e-mail) ou Google.
- **Hospedagem:** Vercel (front + serverless) + Supabase. Ambos tÃªm free tier.
- **AtualizaÃ§Ã£o das rodadas:** comeÃ§ar com um **botÃ£o "fechar rodada"** no painel do admin
  (puxa as notas dos jogos daquela rodada e calcula). Automatizar com cron (Vercel Cron)
  depois, se quiser.

## 7. PÃ¡ginas

PÃºblicas:
- `/` â€” landing (jÃ¡ existe: `dezcalacao.html`).
- `/login` â€” autenticaÃ§Ã£o (Supabase).

Participante (logado):
- `/app` â€” home: meu time, minha pontuaÃ§Ã£o na rodada, classificaÃ§Ã£o do grupo.
- `/app/time` â€” ver escalaÃ§Ã£o e **fazer substituiÃ§Ãµes** (respeitando posiÃ§Ã£o e limite).

Admin (logado, dono do grupo):
- `/admin` â€” criar grupo, **convidar/adicionar membros**, configurar regras.
- `/admin/draft` â€” **atribuir jogadores a cada membro** e fechar o draft.
- `/admin/rodadas` â€” gerenciar rodadas e **fechar rodada** (puxa notas + calcula).

Rotas de API (servidor, seguram a chave):
- `POST /api/sync/squads` â€” busca convocados e popula a tabela `players`.
- `POST /api/sync/ratings` â€” busca notas dos jogos de uma rodada.
- `POST /api/scoring/compute` â€” calcula a pontuaÃ§Ã£o da rodada por participante.

## 8. Modelo de dados

Ver `supabase/schema.sql` para o DDL completo. Resumo das tabelas:

- `profiles` â€” usuÃ¡rios (vinculado ao auth do Supabase).
- `groups` â€” grupos/bolÃµes (admin, temporada, status: setupâ†’draftingâ†’activeâ†’finished).
- `group_members` â€” membros do grupo (pode existir antes da conta; `profile_id` nulo atÃ© aceitar).
- `players` â€” jogadores convocados (vindos da API; `position` editÃ¡vel por causa de ZAG/LAT).
- `team_players` â€” quem pegou quem (slot titular/reserva + posiÃ§Ã£o). Draft registrado aqui.
- `rounds` â€” rodadas/matchdays.
- `fixtures` â€” jogos (referÃªncia).
- `player_round_ratings` â€” nota de cada jogador em cada rodada (puxada da API).
- `substitutions` â€” trocas de reservaâ†’titular por rodada (com limite).
- `round_scores` â€” pontuaÃ§Ã£o calculada por participante por rodada (base + bÃ´nus + total).

## 9. Escopo do MVP

Entregar primeiro:
1. Login + criar grupo + convidar membros.
2. Sincronizar convocados (popular `players`).
3. Tela de draft do admin (atribuir jogadores, validar regras, fechar draft).
4. Tela do participante (ver time + classificaÃ§Ã£o).
5. Fechar rodada (puxar notas, calcular pontuaÃ§Ã£o sÃ³ pela nota).
6. SubstituiÃ§Ãµes por posiÃ§Ã£o.

Depois (fase 2): bÃ´nus (SeleÃ§Ã£o da Rodada, craque da partida), automaÃ§Ã£o por cron,
draft ao vivo dentro da plataforma, abrir pro pÃºblico.

## 10. DecisÃµes em aberto

- Limite de substituiÃ§Ãµes: 3 por rodada **ou** 3 no total do torneio? (comeÃ§ar: 3 por rodada).
- Minutagem não filtra pontuação; manter minutos apenas como dado de conferência.
- Como tratar prorrogaÃ§Ã£o/pÃªnaltis no mata-mata (a nota cobre, mas confirmar).
- CritÃ©rio de desempate na classificaÃ§Ã£o (sugestÃ£o: maior nota individual na rodada).

## 11. Tom / UI

- Copy em **portuguÃªs do Brasil**, informal mas claro.
- Identidade visual da landing: estÃ¡dio Ã  noite, verde-tinta escuro, acento verde-limÃ£o,
  dourado para "nota". Tipografia: Anton (tÃ­tulos), Hanken Grotesk (corpo), Space Mono (nÃºmeros).
- **Sem** usar marcas/logos da FIFA ou imagens de jogadores reais sem cuidado de direito de
  imagem. Ã‰ um bolÃ£o entre amigos, **sem apostas**.
