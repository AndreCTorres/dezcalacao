-- Migration: Adicionar tabela de auditoria para ratings
-- Data: Junho 2026
-- Descrição: Rastrear todas as alterações de ratings para diagnóstico e recuperação

-- Tabela de auditoria: cada insert/update em player_round_ratings gera um log
create table player_round_ratings_audit (
  id uuid primary key default gen_random_uuid(),
  
  -- Referência ao rating original
  rating_id uuid,  -- pode ser NULL se era um INSERT novo
  player_id bigint not null references players(id),
  round_id uuid not null references rounds(id) on delete cascade,
  fixture_id bigint references fixtures(id),
  
  -- Valores antigos (antes da mudança)
  old_rating numeric(4,2),
  old_minutes int,
  old_lineup_role text,
  old_source text,
  
  -- Valores novos (depois da mudança)
  new_rating numeric(4,2),
  new_minutes int,
  new_lineup_role text,
  new_source text,
  
  -- Metadados
  operation text not null,  -- 'INSERT' | 'UPDATE' | 'DELETE'
  admin_user_id uuid,       -- quem fez a mudança
  admin_email text,         -- email de quem fez a mudança
  created_at timestamptz default now(),
  
  -- Motivo/contexto (preenchido quando disponível)
  change_reason text,       -- ex: 'Manual adjustment', 'Batch upload', 'Duplicate removal'
  notes text
);

-- Índices para queries rápidas
create index on player_round_ratings_audit (round_id);
create index on player_round_ratings_audit (player_id);
create index on player_round_ratings_audit (admin_user_id);
create index on player_round_ratings_audit (created_at desc);

-- Função para auditar mudanças em player_round_ratings
create or replace function audit_player_round_ratings()
returns trigger as $$
declare
  admin_user_id uuid;
  admin_email text;
begin
  -- Tentar pegar user_id do contexto da sessão (se disponível)
  admin_user_id := auth.uid();
  if admin_user_id is not null then
    select email into admin_email from auth.users where id = admin_user_id;
  end if;

  if TG_OP = 'INSERT' then
    insert into player_round_ratings_audit (
      rating_id, player_id, round_id, fixture_id,
      old_rating, old_minutes, old_lineup_role, old_source,
      new_rating, new_minutes, new_lineup_role, new_source,
      operation, admin_user_id, admin_email, change_reason
    ) values (
      NEW.id, NEW.player_id, NEW.round_id, NEW.fixture_id,
      null, null, null, null,
      NEW.rating, NEW.minutes, NEW.lineup_role, NEW.source,
      'INSERT', admin_user_id, admin_email, 'New rating added'
    );
    
  elsif TG_OP = 'UPDATE' then
    -- Só auditar se algo realmente mudou
    if (OLD.rating, OLD.minutes, OLD.lineup_role, OLD.source) is distinct from 
       (NEW.rating, NEW.minutes, NEW.lineup_role, NEW.source) then
      
      insert into player_round_ratings_audit (
        rating_id, player_id, round_id, fixture_id,
        old_rating, old_minutes, old_lineup_role, old_source,
        new_rating, new_minutes, new_lineup_role, new_source,
        operation, admin_user_id, admin_email
      ) values (
        NEW.id, NEW.player_id, NEW.round_id, NEW.fixture_id,
        OLD.rating, OLD.minutes, OLD.lineup_role, OLD.source,
        NEW.rating, NEW.minutes, NEW.lineup_role, NEW.source,
        'UPDATE', admin_user_id, admin_email
      );
    end if;
    
  elsif TG_OP = 'DELETE' then
    insert into player_round_ratings_audit (
      rating_id, player_id, round_id, fixture_id,
      old_rating, old_minutes, old_lineup_role, old_source,
      new_rating, new_minutes, new_lineup_role, new_source,
      operation, admin_user_id, admin_email, change_reason
    ) values (
      OLD.id, OLD.player_id, OLD.round_id, OLD.fixture_id,
      OLD.rating, OLD.minutes, OLD.lineup_role, OLD.source,
      null, null, null, null,
      'DELETE', admin_user_id, admin_email, 'Rating deleted'
    );
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

-- Trigger que executa a auditoria
create trigger player_round_ratings_audit_trigger
after insert or update or delete on player_round_ratings
for each row execute function audit_player_round_ratings();

-- View para diagnosticar mudanças recentes de um jogador em uma rodada
create or replace view player_rating_changes as
select
  a.id as audit_id,
  a.player_id,
  p.name as player_name,
  p.team_name,
  a.round_id,
  r.name as round_name,
  a.fixture_id,
  f.label as fixture_label,
  a.operation,
  a.old_rating,
  a.new_rating,
  a.old_minutes,
  a.new_minutes,
  a.admin_email,
  a.created_at,
  a.change_reason,
  a.notes,
  -- Detectar anomalias
  case
    when a.operation = 'UPDATE' and a.old_rating > 8 and a.new_rating is null then 'POSSIBLE_DATA_LOSS'
    when a.operation = 'UPDATE' and (a.new_rating > 10 or a.new_rating < 0) then 'INVALID_RATING'
    when a.operation = 'DELETE' and a.old_rating is not null then 'DELETED_WITH_RATING'
    else null
  end as anomaly_flag
from player_round_ratings_audit a
left join players p on a.player_id = p.id
left join rounds r on a.round_id = r.id
left join fixtures f on a.fixture_id = f.id
order by a.created_at desc;

-- Comment para documentação
comment on table player_round_ratings_audit is 'Auditoria de todas as mudanças em ratings. Útil para diagnosticar erros e recuperar dados perdidos.';
comment on view player_rating_changes is 'View para consultar mudanças de ratings com detecção de anomalias.';
