alter table if exists rounds
  add column if not exists finalized_at timestamptz;

comment on column rounds.finalized_at is 'Quando o admin marcou a rodada como finalizada para consulta e organização';
