-- =============================================================================
-- SEED DO DRAFT — Dezcalação Copa 2026
-- Participantes: Lucas, Danyel, Gombas, João Lucas, André, Pedro, Pontes
--
-- COMO USAR:
--   1. Abra o SQL Editor no Supabase
--   2. Execute PASSO 1 (jogadores) inteiro
--   3. Execute PASSO 2 (draft) — os inserts usam display_name para achar o membro
--   4. Confirme com a query de verificação no final
--
-- NOTA: IDs na faixa 90001-90200 são reservados para este seed.
--       Se a API-Football já sincronizou os jogadores com IDs reais,
--       você pode atualizar team_players para apontar para os IDs reais depois.
-- =============================================================================

BEGIN;

-- =============================================================================
-- PASSO 1: JOGADORES
-- =============================================================================

INSERT INTO players (id, name, team_id, team_name, position, photo_url) VALUES
-- GK
( 90001, 'G. Kobel',       841,  'Switzerland',  'GK',  'https://media.api-sports.io/football/players/2932.png'),
( 90002, 'Maignan',        2,    'France',        'GK',  'https://media.api-sports.io/football/players/2935.png'),
( 90003, 'Neuer',          25,   'Germany',       'GK',  'https://media.api-sports.io/football/players/199.png'),
( 90004, 'Pickford',       10,   'England',       'GK',  'https://media.api-sports.io/football/players/2931.png'),
( 90005, 'E. Martínez',    26,   'Argentina',     'GK',  'https://media.api-sports.io/football/players/3268.png'),
( 90006, 'Muslera',        17,   'Uruguay',       'GK',  'https://media.api-sports.io/football/players/3267.png'),
( 90007, 'Hicane',         1569, 'Ivory Coast',   'GK',  'https://media.api-sports.io/football/players/3312.png'),
( 90008, 'Ryan',           3228, 'Australia',     'GK',  'https://media.api-sports.io/football/players/3237.png'),
( 90009, 'Cakir',          779,  'Turkey',        'GK',  'https://media.api-sports.io/football/players/3303.png'),
( 90010, 'Malagón',        3320, 'Mexico',        'GK',  'https://media.api-sports.io/football/players/3316.png'),
( 90011, 'E. Mendy',       1569, 'Ivory Coast',   'GK',  'https://media.api-sports.io/football/players/1020.png'),
( 90012, 'Linaković',      3,    'Croatia',       'GK',  'https://media.api-sports.io/football/players/3241.png'),
-- ZAG
( 90020, 'Van Dijk',       1118, 'Netherlands',   'ZAG', 'https://media.api-sports.io/football/players/147.png'),
( 90021, 'Saliba',         2,    'France',        'ZAG', 'https://media.api-sports.io/football/players/3298.png'),
( 90022, 'Marquinhos',     6,    'Brazil',        'ZAG', 'https://media.api-sports.io/football/players/9.png'),
( 90023, 'Akanji',         841,  'Switzerland',   'ZAG', 'https://media.api-sports.io/football/players/1571.png'),
( 90024, 'Schlotterbeck',  25,   'Germany',       'ZAG', 'https://media.api-sports.io/football/players/3048.png'),
( 90025, 'Pacho',          2417, 'Colombia',      'ZAG', 'https://media.api-sports.io/football/players/2484.png'),
( 90026, 'Laporte',        760,  'Spain',         'ZAG', 'https://media.api-sports.io/football/players/3194.png'),
( 90027, 'Koulibaly',      1569, 'Senegal',       'ZAG', 'https://media.api-sports.io/football/players/3319.png'),
( 90028, 'Alaba',          110,  'Austria',       'ZAG', 'https://media.api-sports.io/football/players/496.png'),
( 90029, 'Varela',         17,   'Uruguay',       'ZAG', 'https://media.api-sports.io/football/players/3256.png'),
( 90030, 'Gvardiol',       3,    'Croatia',       'ZAG', 'https://media.api-sports.io/football/players/3197.png'),
( 90031, 'Kim Min-jae',    149,  'South Korea',   'ZAG', 'https://media.api-sports.io/football/players/3106.png'),
( 90032, 'D. Magalhães',   6,    'Brazil',        'ZAG', 'https://media.api-sports.io/football/players/178.png'),
( 90033, 'Tomiyasu',       2413, 'Japan',         'ZAG', 'https://media.api-sports.io/football/players/3271.png'),
( 90034, 'Van Heck',       1118, 'Netherlands',   'ZAG', 'https://media.api-sports.io/football/players/2311.png'),
( 90035, 'Nádez',          17,   'Uruguay',       'ZAG', 'https://media.api-sports.io/football/players/3260.png'),
( 90036, 'Araújo',         6,    'Brazil',        'ZAG', 'https://media.api-sports.io/football/players/3270.png'),
( 90037, 'Giménez',        17,   'Uruguay',       'ZAG', 'https://media.api-sports.io/football/players/3258.png'),
( 90038, 'Stanisic',       841,  'Switzerland',   'ZAG', 'https://media.api-sports.io/football/players/3311.png'),
( 90039, 'H. Ito',         2413, 'Japan',         'ZAG', 'https://media.api-sports.io/football/players/3101.png'),
( 90040, 'Buchner',        1,    'Belgium',       'ZAG', 'https://media.api-sports.io/football/players/3309.png'),
( 90041, 'G. Gomez',       3,    'Croatia',       'ZAG', 'https://media.api-sports.io/football/players/3272.png'),
( 90042, 'Montes',         3320, 'Mexico',        'ZAG', 'https://media.api-sports.io/football/players/3315.png'),
( 90043, 'Van De Ven',     1118, 'Netherlands',   'ZAG', 'https://media.api-sports.io/football/players/274.png'),
-- LAT
( 90050, 'Nuno Mendes',    629,  'Portugal',      'LAT', 'https://media.api-sports.io/football/players/874.png'),
( 90051, 'Dumfries',       1118, 'Netherlands',   'LAT', 'https://media.api-sports.io/football/players/530.png'),
( 90052, 'Cucurella',      760,  'Spain',         'LAT', 'https://media.api-sports.io/football/players/723.png'),
( 90053, 'Molina',         26,   'Argentina',     'LAT', 'https://media.api-sports.io/football/players/54.png'),
( 90054, 'Robertson',      1882, 'Scotland',      'LAT', 'https://media.api-sports.io/football/players/267.png'),
( 90055, 'Hakimi',         1,    'Morocco',       'LAT', 'https://media.api-sports.io/football/players/345.png'),
( 90056, 'Estupiñán',      3229, 'Ecuador',       'LAT', 'https://media.api-sports.io/football/players/1268.png'),
( 90057, 'J. Rodriguez',   2415, 'USA',           'LAT', 'https://media.api-sports.io/football/players/3223.png'),
( 90058, 'Grimaldo',       629,  'Portugal',      'LAT', 'https://media.api-sports.io/football/players/875.png'),
( 90059, 'Tagliafico',     17,   'Uruguay',       'LAT', 'https://media.api-sports.io/football/players/3261.png'),
( 90060, 'Castagné',       1,    'Belgium',       'LAT', 'https://media.api-sports.io/football/players/3317.png'),
-- MEI
( 90070, 'B. Fernandes',   629,  'Portugal',      'MEI', 'https://media.api-sports.io/football/players/521.png'),
( 90071, 'De Paul',        26,   'Argentina',     'MEI', 'https://media.api-sports.io/football/players/306.png'),
( 90072, 'Bellingham',     10,   'England',       'MEI', 'https://media.api-sports.io/football/players/2308.png'),
( 90073, 'Kimmich',        25,   'Germany',       'MEI', 'https://media.api-sports.io/football/players/686.png'),
( 90074, 'Pedri',          760,  'Spain',         'MEI', 'https://media.api-sports.io/football/players/50.png'),
( 90075, 'De Bruyne',      1,    'Belgium',       'MEI', 'https://media.api-sports.io/football/players/191.png'),
( 90076, 'B. Silva',       629,  'Portugal',      'MEI', 'https://media.api-sports.io/football/players/3195.png'),
( 90077, 'Paquetá',        6,    'Brazil',        'MEI', 'https://media.api-sports.io/football/players/750.png'),
( 90078, 'Rice',           10,   'England',       'MEI', 'https://media.api-sports.io/football/players/3226.png'),
( 90079, 'Wirtz',          25,   'Germany',       'MEI', 'https://media.api-sports.io/football/players/591.png'),
( 90080, 'Tchouaméni',     2,    'France',        'MEI', 'https://media.api-sports.io/football/players/1269.png'),
( 90081, 'M. Caicedo',     2417, 'Colombia',      'MEI', 'https://media.api-sports.io/football/players/2486.png'),
( 90082, 'E. Fernández',   760,  'Spain',         'MEI', 'https://media.api-sports.io/football/players/2939.png'),
( 90083, 'Endo',           2413, 'Japan',         'MEI', 'https://media.api-sports.io/football/players/1065.png'),
( 90084, 'F. De Jong',     1118, 'Netherlands',   'MEI', 'https://media.api-sports.io/football/players/2310.png'),
( 90085, 'Pulisic',        2415, 'USA',           'MEI', 'https://media.api-sports.io/football/players/3221.png'),
( 90086, 'Carrascal',      2417, 'Colombia',      'MEI', 'https://media.api-sports.io/football/players/2483.png'),
( 90087, 'Valverde',       26,   'Argentina',     'MEI', 'https://media.api-sports.io/football/players/3265.png'),
( 90088, 'Llorente',       629,  'Portugal',      'MEI', 'https://media.api-sports.io/football/players/3196.png'),
( 90089, 'Musiala',        25,   'Germany',       'MEI', 'https://media.api-sports.io/football/players/3205.png'),
( 90090, 'Guler',          779,  'Turkey',        'MEI', 'https://media.api-sports.io/football/players/3314.png'),
( 90091, 'Weisa',          1569, 'Ivory Coast',   'MEI', 'https://media.api-sports.io/football/players/3313.png'),
( 90092, 'Modric',         3,    'Croatia',       'MEI', 'https://media.api-sports.io/football/players/3254.png'),
( 90093, 'João Neves',     629,  'Portugal',      'MEI', 'https://media.api-sports.io/football/players/3267.png'),
( 90094, 'O''Reilly',      2415, 'USA',           'MEI', 'https://media.api-sports.io/football/players/3222.png'),
( 90095, 'Y. Fofana',      2,    'France',        'MEI', 'https://media.api-sports.io/football/players/947.png'),
( 90096, 'Dani Olmo',      760,  'Spain',         'MEI', 'https://media.api-sports.io/football/players/2935.png'),
( 90097, 'Carrasquilla',   3041, 'Panama',        'MEI', 'https://media.api-sports.io/football/players/3225.png'),
( 90098, 'Jhon Arias',     2417, 'Colombia',      'MEI', 'https://media.api-sports.io/football/players/3159.png'),
( 90099, 'B. Guimarães',   6,    'Brazil',        'MEI', 'https://media.api-sports.io/football/players/3263.png'),
( 90100, 'Xhaka',          841,  'Switzerland',   'MEI', 'https://media.api-sports.io/football/players/1574.png'),
-- ATK
( 90110, 'Messi',          26,   'Argentina',     'ATK', 'https://media.api-sports.io/football/players/164.png'),
( 90111, 'C. Ronaldo',     629,  'Portugal',      'ATK', 'https://media.api-sports.io/football/players/874.png'),
( 90112, 'Neymar',         6,    'Brazil',        'ATK', 'https://media.api-sports.io/football/players/6.png'),
( 90113, 'Mbappé',         2,    'France',        'ATK', 'https://media.api-sports.io/football/players/137.png'),
( 90114, 'Haaland',        1655, 'Norway',        'ATK', 'https://media.api-sports.io/football/players/1100.png'),
( 90115, 'Harry Kane',     10,   'England',       'ATK', 'https://media.api-sports.io/football/players/184.png'),
( 90116, 'Vinicius Jr',    6,    'Brazil',        'ATK', 'https://media.api-sports.io/football/players/1485.png'),
( 90117, 'Dembélé',        2,    'France',        'ATK', 'https://media.api-sports.io/football/players/89.png'),
( 90118, 'Sané',           25,   'Germany',       'ATK', 'https://media.api-sports.io/football/players/2487.png'),
( 90119, 'J. Álvarez',     26,   'Argentina',     'ATK', 'https://media.api-sports.io/football/players/723.png'),
( 90120, 'Luis Díaz',      2417, 'Colombia',      'ATK', 'https://media.api-sports.io/football/players/678.png'),
( 90121, 'Saka',           10,   'England',       'ATK', 'https://media.api-sports.io/football/players/1485.png'),
( 90122, 'Yamal',          760,  'Spain',         'ATK', 'https://media.api-sports.io/football/players/18.png'),
( 90123, 'Doku',           1118, 'Netherlands',   'ATK', 'https://media.api-sports.io/football/players/2267.png'),
( 90124, 'Salah',          20,   'Egypt',         'ATK', 'https://media.api-sports.io/football/players/306.png'),
( 90125, 'Rodrygo',        6,    'Brazil',        'ATK', 'https://media.api-sports.io/football/players/288.png'),
( 90126, 'Endrick',        6,    'Brazil',        'ATK', 'https://media.api-sports.io/football/players/241.png'),
( 90127, 'Plata',          3229, 'Ecuador',       'ATK', 'https://media.api-sports.io/football/players/999.png'),
( 90128, 'Gakpo',          1118, 'Netherlands',   'ATK', 'https://media.api-sports.io/football/players/2267.png'),
( 90129, 'Gyökeres',       2415, 'Sweden',        'ATK', 'https://media.api-sports.io/football/players/3262.png'),
( 90130, 'G. Ramos',       1569, 'Senegal',       'ATK', 'https://media.api-sports.io/football/players/3320.png'),
( 90131, 'Odegaard',       1655, 'Norway',        'ATK', 'https://media.api-sports.io/football/players/3143.png'),
( 90132, 'Olise',          2,    'France',        'ATK', 'https://media.api-sports.io/football/players/3264.png'),
( 90133, 'H. Son',         149,  'South Korea',   'ATK', 'https://media.api-sports.io/football/players/2882.png'),
( 90134, 'Gordon',         1882, 'Scotland',      'ATK', 'https://media.api-sports.io/football/players/3224.png'),
( 90135, 'Doudé',          629,  'Portugal',      'ATK', 'https://media.api-sports.io/football/players/3269.png'),
( 90136, 'Boufal',         1,    'Morocco',       'ATK', 'https://media.api-sports.io/football/players/3318.png'),
( 90137, 'Sørloth',        1655, 'Norway',        'ATK', 'https://media.api-sports.io/football/players/2476.png'),
( 90138, 'Z. Suzuki',      2413, 'Japan',         'ATK', 'https://media.api-sports.io/football/players/3102.png'),
( 90139, 'Agüero',         17,   'Uruguay',       'ATK', 'https://media.api-sports.io/football/players/3259.png'),
( 90140, 'Yildiz',         779,  'Turkey',        'ATK', 'https://media.api-sports.io/football/players/3310.png'),
( 90141, 'Müller',         25,   'Germany',       'ATK', 'https://media.api-sports.io/football/players/3307.png')
ON CONFLICT (id) DO UPDATE SET
  name      = EXCLUDED.name,
  team_name = EXCLUDED.team_name,
  position  = EXCLUDED.position,
  photo_url = EXCLUDED.photo_url;

-- =============================================================================
-- PASSO 2: DRAFT
-- Os INSERTs buscam o member pelo display_name dentro do grupo.
-- Se houver mais de um grupo, adicione: AND gm.group_id = '<UUID>'
-- =============================================================================

-- ─── LUCAS ───────────────────────────────────────────────────────────────────
-- Titulares (11): G.Kobel(GK) · Van Dijk(ZAG) · Saliba(ZAG) · H.Ito(ZAG) ·
--                 Nuno Mendes(LAT) · Llorente(MEI) · De Paul(MEI) · Wirtz(MEI) · Carrascal(MEI) ·
--                 Vinicius Jr(ATK) · Saka(ATK)
-- Reservas  ( 5): Muslera(GK) · Guler(MEI) · Plata(ATK) · Agüero(ATK) · Castagné(LAT)

DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM group_members
  WHERE display_name = 'Lucas' AND status = 'joined' LIMIT 1;
  IF v_id IS NULL THEN RAISE NOTICE 'Membro Lucas não encontrado'; RETURN; END IF;

  INSERT INTO team_players (group_member_id, player_id, slot, position_slot) VALUES
    (v_id, 90001, 'starter', 'GK'),
    (v_id, 90020, 'starter', 'ZAG'),
    (v_id, 90021, 'starter', 'ZAG'),
    (v_id, 90039, 'starter', 'ZAG'),
    (v_id, 90050, 'starter', 'LAT'),
    (v_id, 90088, 'starter', 'MEI'),
    (v_id, 90071, 'starter', 'MEI'),
    (v_id, 90079, 'starter', 'MEI'),
    (v_id, 90086, 'starter', 'MEI'),
    (v_id, 90116, 'starter', 'ATK'),
    (v_id, 90121, 'starter', 'ATK'),
    (v_id, 90006, 'bench',   'GK'),
    (v_id, 90090, 'bench',   'MEI'),
    (v_id, 90127, 'bench',   'ATK'),
    (v_id, 90139, 'bench',   'ATK'),
    (v_id, 90060, 'bench',   'LAT')
  ON CONFLICT (group_member_id, player_id) DO NOTHING;
END $$;

-- ─── DANYEL ──────────────────────────────────────────────────────────────────
-- Titulares (11): Hicane(GK) · Marquinhos(ZAG) · Tomiyasu(ZAG) ·
--                 Nuno Mendes(LAT) · Dumfries(LAT) · E.Fernández(MEI) · Pulisic(MEI) · Endo(MEI) ·
--                 Yamal(ATK) · Gordon(ATK) · J.Rodriguez(LAT→ATK posicional na imagem)
-- Reservas  ( 5): Ryan(GK) · Stanisic(ZAG) · Weisa(MEI) · Carrasquilla(MEI) · Montes(ZAG)
-- NOTA: Neuer aparece na imagem como 2º GK titular — mantido como ZAG (posição de campo)

DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM group_members
  WHERE display_name = 'Danyel' AND status = 'joined' LIMIT 1;
  IF v_id IS NULL THEN RAISE NOTICE 'Membro Danyel não encontrado'; RETURN; END IF;

  INSERT INTO team_players (group_member_id, player_id, slot, position_slot) VALUES
    (v_id, 90007,  'starter', 'GK'),
    (v_id, 90022,  'starter', 'ZAG'),
    (v_id, 90033,  'starter', 'ZAG'),
    (v_id, 90050,  'starter', 'LAT'),
    (v_id, 90051,  'starter', 'LAT'),
    (v_id, 90082,  'starter', 'MEI'),
    (v_id, 90085,  'starter', 'MEI'),
    (v_id, 90083,  'starter', 'MEI'),
    (v_id, 90003,  'starter', 'GK'),   -- Neuer: slot GK mas na linha ZAG da imagem
    (v_id, 90122,  'starter', 'ATK'),
    (v_id, 90134,  'starter', 'ATK'),
    (v_id, 90008,  'bench',   'GK'),
    (v_id, 90038,  'bench',   'ZAG'),
    (v_id, 90091,  'bench',   'MEI'),
    (v_id, 90097,  'bench',   'MEI'),
    (v_id, 90042,  'bench',   'ZAG')
  ON CONFLICT (group_member_id, player_id) DO NOTHING;
END $$;

-- ─── GOMBAS ──────────────────────────────────────────────────────────────────
-- Titulares (11): Maignan(GK) · Pacho(ZAG) · Araújo(ZAG) ·
--                 Pedri(MEI) · Kimmich(MEI) · De Bruyne(MEI) · B.Silva(MEI) ·
--                 Harry Kane(ATK) · Dembélé(ATK) · Boufal(ATK) · Doudé(ATK)
-- Reservas  ( 5): Cakir(GK) · Z.Suzuki(ATK) · Yildiz(ATK) · Van Heck(ZAG) · Stanisic(ZAG)

DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM group_members
  WHERE display_name = 'Gombas' AND status = 'joined' LIMIT 1;
  IF v_id IS NULL THEN RAISE NOTICE 'Membro Gombas não encontrado'; RETURN; END IF;

  INSERT INTO team_players (group_member_id, player_id, slot, position_slot) VALUES
    (v_id, 90002,  'starter', 'GK'),
    (v_id, 90025,  'starter', 'ZAG'),
    (v_id, 90036,  'starter', 'ZAG'),
    (v_id, 90074,  'starter', 'MEI'),
    (v_id, 90073,  'starter', 'MEI'),
    (v_id, 90075,  'starter', 'MEI'),
    (v_id, 90076,  'starter', 'MEI'),
    (v_id, 90115,  'starter', 'ATK'),
    (v_id, 90117,  'starter', 'ATK'),
    (v_id, 90136,  'starter', 'ATK'),
    (v_id, 90135,  'starter', 'ATK'),
    (v_id, 90009,  'bench',   'GK'),
    (v_id, 90138,  'bench',   'ATK'),
    (v_id, 90140,  'bench',   'ATK'),
    (v_id, 90034,  'bench',   'ZAG'),
    (v_id, 90038,  'bench',   'ZAG')
  ON CONFLICT (group_member_id, player_id) DO NOTHING;
END $$;

-- ─── JOÃO LUCAS ──────────────────────────────────────────────────────────────
-- Titulares (11): Maignan(GK) · Gvardiol(ZAG) · Akanji(ZAG) ·
--                 Grimaldo(LAT) · Bellingham(MEI) · Carrascal(MEI) ·
--                 Sané(ATK) · Messi(ATK) · C.Ronaldo(ATK) · Neymar(ATK) · J.Álvarez(ATK)
-- Reservas  ( 5): Cakir(GK) · Salah(ATK) · Alaba(ZAG) · H.Son(ATK) · Estupiñán(LAT)
--   ↑ Correções: Micolta → Estupiñán (Ecuador LAT)

DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM group_members
  WHERE display_name = 'João Lucas' AND status = 'joined' LIMIT 1;
  IF v_id IS NULL THEN RAISE NOTICE 'Membro João Lucas não encontrado'; RETURN; END IF;

  INSERT INTO team_players (group_member_id, player_id, slot, position_slot) VALUES
    (v_id, 90002,  'starter', 'GK'),
    (v_id, 90030,  'starter', 'ZAG'),
    (v_id, 90023,  'starter', 'ZAG'),
    (v_id, 90058,  'starter', 'LAT'),
    (v_id, 90072,  'starter', 'MEI'),
    (v_id, 90086,  'starter', 'MEI'),
    (v_id, 90118,  'starter', 'ATK'),
    (v_id, 90110,  'starter', 'ATK'),
    (v_id, 90111,  'starter', 'ATK'),
    (v_id, 90112,  'starter', 'ATK'),
    (v_id, 90119,  'starter', 'ATK'),
    (v_id, 90009,  'bench',   'GK'),
    (v_id, 90124,  'bench',   'ATK'),
    (v_id, 90028,  'bench',   'ZAG'),
    (v_id, 90133,  'bench',   'ATK'),
    (v_id, 90056,  'bench',   'LAT')
  ON CONFLICT (group_member_id, player_id) DO NOTHING;
END $$;

-- ─── ANDRÉ ───────────────────────────────────────────────────────────────────
-- Titulares (11): E.Mendy(GK) · D.Magalhães(ZAG) · Schlotterbeck(ZAG) ·
--                 Molina(LAT) · B.Fernandes(MEI) · Valverde(MEI) · M.Caicedo(MEI) · Dani Olmo(MEI) · O'Reilly(MEI) ·
--                 Olise(ATK) · Doku(ATK)
-- Reservas  ( 5): Linaković(GK) · Sørloth(ATK) · Kim Min-jae(ZAG) · Xhaka(MEI) · Van De Ven(ZAG)

DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM group_members
  WHERE display_name = 'André' AND status = 'joined' LIMIT 1;
  IF v_id IS NULL THEN RAISE NOTICE 'Membro André não encontrado'; RETURN; END IF;

  INSERT INTO team_players (group_member_id, player_id, slot, position_slot) VALUES
    (v_id, 90011,  'starter', 'GK'),
    (v_id, 90032,  'starter', 'ZAG'),
    (v_id, 90024,  'starter', 'ZAG'),
    (v_id, 90053,  'starter', 'LAT'),
    (v_id, 90070,  'starter', 'MEI'),
    (v_id, 90087,  'starter', 'MEI'),
    (v_id, 90081,  'starter', 'MEI'),
    (v_id, 90096,  'starter', 'MEI'),
    (v_id, 90094,  'starter', 'MEI'),
    (v_id, 90132,  'starter', 'ATK'),
    (v_id, 90123,  'starter', 'ATK'),
    (v_id, 90012,  'bench',   'GK'),
    (v_id, 90137,  'bench',   'ATK'),
    (v_id, 90031,  'bench',   'ZAG'),
    (v_id, 90100,  'bench',   'MEI'),
    (v_id, 90043,  'bench',   'ZAG')
  ON CONFLICT (group_member_id, player_id) DO NOTHING;
END $$;

-- ─── PEDRO ───────────────────────────────────────────────────────────────────
-- Titulares (11): Pickford(GK) · Laporte(ZAG) · Koulibaly(ZAG) ·
--                 Hakimi(LAT) · Robertson(LAT) · Musiala(MEI) · João Neves(MEI) ·
--                 Mbappé(ATK) · Luis Díaz(ATK) · Gakpo(ATK) · Odegaard(ATK)
-- Reservas  ( 5): Ryan(GK) · Y.Fofana(MEI) · B.Guimarães(MEI) · Tagliafico(LAT) · Giménez(ZAG)

DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM group_members
  WHERE display_name = 'Pedro' AND status = 'joined' LIMIT 1;
  IF v_id IS NULL THEN RAISE NOTICE 'Membro Pedro não encontrado'; RETURN; END IF;

  INSERT INTO team_players (group_member_id, player_id, slot, position_slot) VALUES
    (v_id, 90004,  'starter', 'GK'),
    (v_id, 90026,  'starter', 'ZAG'),
    (v_id, 90027,  'starter', 'ZAG'),
    (v_id, 90055,  'starter', 'LAT'),
    (v_id, 90054,  'starter', 'LAT'),
    (v_id, 90089,  'starter', 'MEI'),
    (v_id, 90093,  'starter', 'MEI'),
    (v_id, 90113,  'starter', 'ATK'),
    (v_id, 90120,  'starter', 'ATK'),
    (v_id, 90128,  'starter', 'ATK'),
    (v_id, 90131,  'starter', 'ATK'),
    (v_id, 90008,  'bench',   'GK'),
    (v_id, 90095,  'bench',   'MEI'),
    (v_id, 90099,  'bench',   'MEI'),
    (v_id, 90059,  'bench',   'LAT'),
    (v_id, 90037,  'bench',   'ZAG')
  ON CONFLICT (group_member_id, player_id) DO NOTHING;
END $$;

-- ─── PONTES ──────────────────────────────────────────────────────────────────
-- Titulares (11): E.Martínez(GK) · Buchner(ZAG) · Tomiyasu(ZAG) ·
--                 Cucurella(LAT) · Rice(MEI) · Tchouaméni(MEI) · F.De Jong(MEI) ·
--                 Haaland(ATK) · Endrick(ATK) · G.Ramos(ATK) · Müller(ATK)
-- Reservas  ( 5): Malagón(GK) · G.Gomez(ZAG) · Jhon Arias(MEI) · Modric(MEI) · Nádez(ZAG)
--   ↑ Correções: Piquerez → Nádez (Uruguay ZAG)

DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM group_members
  WHERE display_name = 'Pontes' AND status = 'joined' LIMIT 1;
  IF v_id IS NULL THEN RAISE NOTICE 'Membro Pontes não encontrado'; RETURN; END IF;

  INSERT INTO team_players (group_member_id, player_id, slot, position_slot) VALUES
    (v_id, 90005,  'starter', 'GK'),
    (v_id, 90040,  'starter', 'ZAG'),
    (v_id, 90033,  'starter', 'ZAG'),
    (v_id, 90052,  'starter', 'LAT'),
    (v_id, 90078,  'starter', 'MEI'),
    (v_id, 90080,  'starter', 'MEI'),
    (v_id, 90084,  'starter', 'MEI'),
    (v_id, 90114,  'starter', 'ATK'),
    (v_id, 90126,  'starter', 'ATK'),
    (v_id, 90130,  'starter', 'ATK'),
    (v_id, 90141,  'starter', 'ATK'),
    (v_id, 90010,  'bench',   'GK'),
    (v_id, 90041,  'bench',   'ZAG'),
    (v_id, 90098,  'bench',   'MEI'),
    (v_id, 90092,  'bench',   'MEI'),
    (v_id, 90035,  'bench',   'ZAG')
  ON CONFLICT (group_member_id, player_id) DO NOTHING;
END $$;

COMMIT;

-- =============================================================================
-- VERIFICAÇÃO — cole no SQL Editor para confirmar
-- =============================================================================
/*
SELECT
  gm.display_name            AS participante,
  COUNT(*) FILTER (WHERE tp.slot = 'starter') AS titulares,
  COUNT(*) FILTER (WHERE tp.slot = 'bench')   AS reservas,
  COUNT(*)                                    AS total
FROM team_players tp
JOIN group_members gm ON gm.id = tp.group_member_id
GROUP BY gm.display_name
ORDER BY gm.display_name;
*/

-- Esperado: cada participante com 11 titulares + 5 reservas = 16 total
