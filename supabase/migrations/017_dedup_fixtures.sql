-- Migration 017: remover jogos duplicados dentro da mesma rodada
-- Duplicata aqui significa mesmo round_id + mesmo par de selecoes,
-- mesmo que os fixtures tenham ids diferentes.

with fixture_ratings as (
  select
    f.id,
    f.round_id,
    least(
      lower(regexp_replace(coalesce(f.home_team, ''), '[^[:alnum:]]+', ' ', 'g')),
      lower(regexp_replace(coalesce(f.away_team, ''), '[^[:alnum:]]+', ' ', 'g'))
    ) as team_a,
    greatest(
      lower(regexp_replace(coalesce(f.home_team, ''), '[^[:alnum:]]+', ' ', 'g')),
      lower(regexp_replace(coalesce(f.away_team, ''), '[^[:alnum:]]+', ' ', 'g'))
    ) as team_b,
    count(prr.id) filter (where prr.rating is not null) as ratings_count
  from fixtures f
  left join player_round_ratings prr on prr.fixture_id = f.id
  group by f.id, f.round_id, f.home_team, f.away_team
),
ranked_fixtures as (
  select
    *,
    first_value(id) over (
      partition by round_id, team_a, team_b
      order by ratings_count desc, id asc
    ) as keep_fixture_id,
    row_number() over (
      partition by round_id, team_a, team_b
      order by ratings_count desc, id asc
    ) as row_number
  from fixture_ratings
),
duplicates as (
  select id as duplicate_fixture_id, keep_fixture_id
  from ranked_fixtures
  where row_number > 1
),
moved_ratings as (
  update player_round_ratings prr
  set fixture_id = duplicates.keep_fixture_id
  from duplicates
  where prr.fixture_id = duplicates.duplicate_fixture_id
  returning prr.id
)
delete from fixtures f
using duplicates
where f.id = duplicates.duplicate_fixture_id;

create index if not exists idx_fixtures_round_id
  on fixtures(round_id);

create index if not exists idx_player_round_ratings_fixture
  on player_round_ratings(fixture_id)
  where fixture_id is not null;
