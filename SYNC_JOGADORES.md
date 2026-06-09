# Sincronização de Jogadores da Copa 2026

## 📋 Pré-requisitos

1. **API-Football Key** configurada em `.env.local`
2. **Migration SQL executada** no Supabase

## 🚀 Como Sincronizar

### Passo 1: Executar a Migration

Rode o SQL abaixo no **SQL Editor do Supabase** (após rodar o `schema.sql` inicial):

```sql
-- Ver arquivo: supabase/migration-teams-sync.sql
```

Esse script cria:
- Tabela `teams` (cache de IDs das seleções)
- Novas colunas na tabela `players` (`api_player_id`, `age`, `number`, `api_position`, `season`, `synced_at`)
- Ajusta a primary key de `players` para usar `api_player_id`

### Passo 2: Usar o Botão de Sync

1. Faça login como **admin** do grupo
2. Acesse `/admin`
3. Clique no botão **"🔄 Sincronizar Jogadores"**
4. Aguarde (pode levar 2-3 minutos)

## 🔍 O que o Sync Faz

### Etapa 1: Resolver IDs das Seleções (48 países)

1. Busca times da Copa 2022 (`/teams?league=1&season=2022`) para pegar ~32 IDs de uma vez
2. Para países não encontrados, busca individualmente (`/teams?search={país}`) filtrando por seleção nacional
3. Usa mapeamento de nomes conhecidos:
   - `South Korea` → `Korea Republic`
   - `DR Congo` → `Congo DR`
   - `Czechia` → `Czech Republic`
   - `Turkey` → `Türkiye`
   - `Ivory Coast` → `Cote D'Ivoire`

4. Salva IDs na tabela `teams` (cache para próximas execuções)

### Etapa 2: Sincronizar Elencos

Para cada seleção resolvida:
1. Busca o squad (`/players/squads?team={id}`)
2. Insere/atualiza jogadores na tabela `players` (upsert por `api_player_id`)
3. Mapeia posições:
   - `Goalkeeper` → `GK`
   - `Defender` → `ZAG` (ajuste manual para LAT depois)
   - `Midfielder` → `MEI`
   - `Attacker` → `ATK`

## ⚙️ Características Técnicas

### Throttle
- **350ms entre requisições** (~3 req/seg)
- Evita rate limit da API-Football

### Resumibilidade
- Upsert por `api_player_id` permite re-executar sem duplicar
- IDs de times ficam cacheados na tabela `teams`
- Se o sync falhar no meio, pode continuar do ponto onde parou

### Segurança
- **Admin-only**: Só admins de grupo podem sincronizar
- **Service role**: Usa `supabaseAdmin()` com filtro por `user.id` validado
- **Logs detalhados**: Console mostra progresso e pendências

## 📊 Resultado Esperado

Após a sincronização bem-sucedida:

- **Seleções**: 48 / 48 (ou algumas pendentes se houver problema de grafia)
- **Jogadores**: ~1.200 (média de 25 por seleção)

### Seleções Pendentes

Se alguma seleção não resolver, o sistema loga no console e no resultado:

```
⚠️ Seleções pendentes: Bosnia & Herzegovina, Curaçao
```

Nesses casos, você precisa:
1. Buscar o ID manualmente na API-Football
2. Inserir na tabela `teams`:
   ```sql
   insert into teams (id, name, country, api_name, national, season)
   values (XXX, 'Bosnia-Herzegovina', 'Bosnia & Herzegovina', 'Bosnia-Herzegovina', true, '2026');
   ```
3. Re-executar o sync (ele vai pular times já sincronizados)

## 🔧 Troubleshooting

### Erro: "api_player_id já existe"
- A tabela `players` já tem dados antigos
- Opções:
  1. Deletar dados antigos: `delete from players;`
  2. Ou ajustar a migration para dropar/recriar a tabela

### Erro: "foreign key violation em team_players"
- Há drafts já feitos com IDs antigos
- Solução: Deletar drafts: `delete from team_players;`

### Limite de API excedido
- Plano gratuito: ~100 req/dia
- O sync completo usa ~150 requisições
- Solução: Esperar 24h ou atualizar plano

## 📝 Lista das 48 Seleções

Europa (16): Germany, England, Austria, Belgium, Bosnia & Herzegovina, Croatia, Scotland, Spain, France, Norway, Netherlands, Portugal, Sweden, Switzerland, Czechia, Turkey

América do Sul (6): Argentina, Brazil, Colombia, Ecuador, Paraguay, Uruguay

CONCACAF (6): Canada, USA, Mexico, Curaçao, Haiti, Panama

África (8): South Africa, Algeria, Cape Verde, Ivory Coast, Egypt, Ghana, Morocco, DR Congo, Senegal, Tunisia

Ásia (10): Saudi Arabia, Australia, Iraq, Japan, Jordan, Uzbekistan, Qatar, South Korea, Iran

Oceania (1): New Zealand

**Total: 48 seleções**
