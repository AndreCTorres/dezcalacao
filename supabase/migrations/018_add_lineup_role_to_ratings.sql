alter table player_round_ratings
  add column if not exists lineup_role text;

alter table player_round_ratings
  drop constraint if exists player_round_ratings_lineup_role_check;

alter table player_round_ratings
  add constraint player_round_ratings_lineup_role_check
  check (lineup_role is null or lineup_role in ('starter', 'substitute'));
