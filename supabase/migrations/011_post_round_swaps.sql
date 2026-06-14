-- Migration 011: Trocas pós-rodada
-- Participante pode trocar até 3 reservas que pontuaram melhor que titulares,
-- depois que a rodada foi fechada (status = 'scored').

create table post_round_swaps (
  id uuid primary key default gen_random_uuid(),
  group_member_id uuid not null references group_members(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  out_player_id bigint not null references players(id),
  in_player_id bigint not null references players(id),
  position_slot text not null, -- GK | ZAG | LAT | MEI | ATK
  created_at timestamptz default now()
);

comment on table post_round_swaps is 'Trocas pós-rodada: reserva que pontuou melhor entra retroativamente no score';
comment on column post_round_swaps.out_player_id is 'Titular que sai (já pontuou)';
comment on column post_round_swaps.in_player_id is 'Reserva que entra (deve ter nota melhor)';

-- Índices
create index idx_post_round_swaps_member on post_round_swaps(group_member_id);
create index idx_post_round_swaps_round on post_round_swaps(round_id);

-- RLS
alter table post_round_swaps enable row level security;

-- Participante pode ver suas próprias trocas
create policy "Membro vê suas próprias trocas pós-rodada"
  on post_round_swaps for select
  using (
    group_member_id in (
      select id from group_members where profile_id = auth.uid()
    )
  );

-- Participante pode inserir suas trocas
create policy "Membro pode inserir trocas pós-rodada"
  on post_round_swaps for insert
  with check (
    group_member_id in (
      select id from group_members where profile_id = auth.uid()
    )
  );

-- Participante pode deletar suas trocas (para desfazer)
create policy "Membro pode deletar suas trocas pós-rodada"
  on post_round_swaps for delete
  using (
    group_member_id in (
      select id from group_members where profile_id = auth.uid()
    )
  );
