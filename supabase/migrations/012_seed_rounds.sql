-- Migration 012: Criar rodadas da Copa do Mundo 2026
-- Fase de grupos: 3 rodadas
-- Playoffs: 16avos, oitavas, quartas, semi e final
-- O draft será refeito após os 16avos de final

insert into rounds (group_id, name, status, created_at) values
  ('15497f7b-d85d-4ade-9a39-2539f39f5742', 'Fase de Grupos - Rodada 1', 'open',  now() + interval '0 days'),
  ('15497f7b-d85d-4ade-9a39-2539f39f5742', 'Fase de Grupos - Rodada 2', 'open', now() + interval '1 days'),
  ('15497f7b-d85d-4ade-9a39-2539f39f5742', 'Fase de Grupos - Rodada 3', 'open', now() + interval '2 days'),
  ('15497f7b-d85d-4ade-9a39-2539f39f5742', '16 Avos de Final',          'open', now() + interval '3 days'),
  ('15497f7b-d85d-4ade-9a39-2539f39f5742', 'Oitavas de Final',          'open', now() + interval '4 days'),
  ('15497f7b-d85d-4ade-9a39-2539f39f5742', 'Quartas de Final',          'open', now() + interval '5 days'),
  ('15497f7b-d85d-4ade-9a39-2539f39f5742', 'Semifinal',                 'open', now() + interval '6 days'),
  ('15497f7b-d85d-4ade-9a39-2539f39f5742', 'Final',                     'open', now() + interval '7 days');
