-- Migration 015: Fixtures e ratings da Rodada 1 (Fase de Grupos)
-- Jogos: México x África do Sul, Coreia do Sul x Rep. Tcheca,
--        Canadá x Bósnia e Herzegovina, EUA x Paraguai
-- Fonte: Sofascore (inserção manual)
-- Round: e174fa07-277f-4cc2-a35d-274fcc1fe7ae

-- ============================================================
-- LIMPA dados anteriores desta rodada (idempotente)
-- ============================================================
delete from player_round_ratings where round_id = 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae' and source = 'manual';
delete from fixtures where id in (10001, 10002, 10003, 10004);

-- ============================================================
-- FIXTURES
-- ============================================================
insert into fixtures (id, round_id, home_team, away_team, label, status) values
  (10001, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 'Mexico',               'South Africa',         'México x África do Sul',      'FT'),
  (10002, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 'South Korea',          'Czech Republic',       'Coreia do Sul x Rep. Tcheca', 'FT'),
  (10003, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 'Canada',               'Bosnia & Herzegovina', 'Canadá x Bósnia',             'FT'),
  (10004, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 'USA',                  'Paraguay',             'EUA x Paraguai',              'FT');

-- ============================================================
-- RATINGS — Jogo 1: México x África do Sul
-- ============================================================
insert into player_round_ratings (player_id, round_id, fixture_id, rating, minutes, source) values
  (270774, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 7.3,  90, 'manual'), -- J. Rangel
  (2873,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.8,  90, 'manual'), -- C. Montes
  (35544,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.9,  90, 'manual'), -- J. Vásquez
  (266345, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 7.4,  66, 'manual'), -- É. Lira
  (750,    'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 7.1,  66, 'manual'), -- Á. Fidalgo
  (212233, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.9,  76, 'manual'), -- B. Gutiérrez
  (2881,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.9,  90, 'manual'), -- J. Gallardo
  (35532,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 8.6,  79, 'manual'), -- J. Quiñones
  (2887,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 7.6,  76, 'manual'), -- R. Jiménez
  (127227, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 7.2,  90, 'manual'), -- I. Reyes
  (2879,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 8.2,  90, 'manual'), -- R. Alvarado
  (482605, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.6,  24, 'manual'), -- G. Mora
  (35690,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.8,  24, 'manual'), -- L. Chávez
  (2869,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 7.0,  14, 'manual'), -- E. Álvarez
  (291713, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.2,  14, 'manual'), -- A. González
  (2889,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.4,  11, 'manual'), -- A. Vega
  (3275,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.3,  90, 'manual'), -- R. Williams
  (406752, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.3,  90, 'manual'), -- I. Okon
  (46458,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.0,  90, 'manual'), -- N. Sibisi
  (3287,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.5,  90, 'manual'), -- T. Mokoena
  (46601,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.5,  90, 'manual'), -- K. Mudau
  (158433, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 4.9,  90, 'manual'), -- S. Sithole
  (127429, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.1,  76, 'manual'), -- I. Rayners
  (268710, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.6,  61, 'manual'), -- J. Adams
  (510799, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.4,  90, 'manual'), -- M. Mbokazi
  (179893, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 5.9,  77, 'manual'), -- O. Appollis
  (46334,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 5.9,  59, 'manual'), -- A. Modiba
  (194430, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.5,  34, 'manual'), -- T. Mbatha
  (3289,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 5.3,  29, 'manual'), -- T. Zwane
  (201354, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, 6.8,  14, 'manual'), -- E. Makgopa
  (46245,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10001, null,  0, 'manual'); -- R. Goss

-- ============================================================
-- RATINGS — Jogo 2: Coreia do Sul x Rep. Tcheca
-- ============================================================
insert into player_round_ratings (player_id, round_id, fixture_id, rating, minutes, source) values
  (2892,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 7.3,  90, 'manual'), -- Kim Seung-gyu
  (2897,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.9,  90, 'manual'), -- Kim Min-jae
  (2909,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 7.1,  84, 'manual'), -- Paik Seung-ho
  (2901,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 8.8,  84, 'manual'), -- Hwang In-beom
  (197985, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.6,  84, 'manual'), -- Seol Young-woo
  (2906,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.9,  62, 'manual'), -- Lee Jae-sung
  (34431,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.8,  90, 'manual'), -- Lee Dong-gyeong
  (237218, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.8,  90, 'manual'), -- Lee Han-beom
  (186,    'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.8,  69, 'manual'), -- Son Heung-min
  (304951, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 8.2,  90, 'manual'), -- Lee Gi-hyuk (#19)
  (24888,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.7,  28, 'manual'), -- Hwang Hee-chan
  (237050, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 7.0,  21, 'manual'), -- Eom Ji-sung
  (34710,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 7.5,  21, 'manual'), -- Oh Hyeon-gyu
  (34168,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.7,   6, 'manual'), -- Kim Jin-gyu
  (138804, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 7.0,  90, 'manual'), -- M. Kovár
  (1231,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.4,  90, 'manual'), -- V. Coufal
  (162964, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.3,  90, 'manual'), -- R. Hranác
  (337740, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 5.9,  90, 'manual'), -- S. Chaloupek
  (1243,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.6,  90, 'manual'), -- T. Soucek
  (66353,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.9,  64, 'manual'), -- L. Provod
  (386837, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.7,  84, 'manual'), -- A. Sojka
  (66387,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.7,  64, 'manual'), -- P. Sulc
  (794,    'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.4,  64, 'manual'), -- P. Schick
  (66407,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 7.1,  90, 'manual'), -- L. Krejcí
  (1237,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.8,  90, 'manual'), -- J. Zelený
  (241,    'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.6,  26, 'manual'), -- M. Sadílek
  (66019,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 7.0,  26, 'manual'), -- A. Hlozek
  (818,    'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.5,  26, 'manual'), -- T. Chorý
  (66275,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, 6.4,   6, 'manual'), -- M. Chytil
  (66347,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10002, null,  0, 'manual'); -- J. Stanek

-- ============================================================
-- RATINGS — Jogo 3: Canadá x Bósnia
-- ============================================================
insert into player_round_ratings (player_id, round_id, fixture_id, rating, minutes, source) values
  (51274,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.8,  90, 'manual'), -- M. Crépeau
  (327738, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.7,  90, 'manual'), -- L. De Fougerolles
  (51295,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.6,  90, 'manual'), -- D. Cornelius
  (35570,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 7.0,  90, 'manual'), -- S. Eustáquio
  (50817,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.9,  90, 'manual'), -- J. Osorio
  (44798,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.7,  61, 'manual'), -- L. Millar
  (328046, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.5,  61, 'manual'), -- I. Koné
  (351587, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.2,  61, 'manual'), -- T. Oluwaseyi
  (8489,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.3,  61, 'manual'), -- J. David
  (78547,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.9,  90, 'manual'), -- A. Johnston
  (51016,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.2,  61, 'manual'), -- T. Buchanan
  (50816,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 8.1,  90, 'manual'), -- R. Laryea
  (362145, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.6,  29, 'manual'), -- A. Ahmed
  (50826,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.7,  29, 'manual'), -- J. Shaffelburg
  (313353, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.5,  29, 'manual'), -- P. David
  (2001,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 7.6,  14, 'manual'), -- C. Larin
  (9026,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.3,  90, 'manual'), -- N. Vasilj
  (1741,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 8.1,  90, 'manual'), -- N. Katić
  (271350, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 7.8,  90, 'manual'), -- T. Muharemovic
  (162222, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 7.4,  62, 'manual'), -- I. Basic
  (329409, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.0,  74, 'manual'), -- E. Bajraktarevic
  (264094, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.5,  90, 'manual'), -- B. Tahirovic
  (77037,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 7.4,  90, 'manual'), -- J. Lukic
  (46930,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.8,  90, 'manual'), -- E. Demirovic
  (7318,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.9,  90, 'manual'), -- A. Dedic
  (1442,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 7.9,  84, 'manual'), -- S. Kolasinac
  (322101, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.3,  74, 'manual'), -- A. Memic
  (70514,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.8,  28, 'manual'), -- A. Gigovic
  (314377, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.2,  28, 'manual'), -- S. Bazdar
  (1324,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.4,  16, 'manual'), -- I. Sunjic
  (395559, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.5,  16, 'manual'), -- K. Alajbegovic
  (25129,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10003, 6.7,   6, 'manual'); -- D. Burnic

-- ============================================================
-- RATINGS — Jogo 4: EUA x Paraguai
-- ============================================================
insert into player_round_ratings (player_id, round_id, fixture_id, rating, minutes, source) values
  (50728,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.0,  90, 'manual'), -- M. Freese
  (19549,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.9,  90, 'manual'), -- A. Robinson
  (19023,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 7.6,  90, 'manual'), -- T. Ream
  (126949, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 7.6,  90, 'manual'), -- C. Richards
  (355994, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 7.3,  90, 'manual'), -- A. Freeman
  (38735,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.7,  46, 'manual'), -- S. Dest
  (1150,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 7.0,  90, 'manual'), -- T. Adams
  (415,    'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 7.4,  90, 'manual'), -- W. McKennie
  (17,     'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 7.6,  46, 'manual'), -- C. Pulisic
  (162037, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 7.3,  82, 'manual'), -- M. Tillman
  (138835, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 9.0,  72, 'manual'), -- F. Balogun
  (201713, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.8,  44, 'manual'), -- S. Berhalter
  (1138,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.5,  18, 'manual'), -- T. Weah
  (73868,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.3,  18, 'manual'), -- R. Pepi
  (161921, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 7.8,   8, 'manual'), -- G. Reyna
  (50999,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, null,  0, 'manual'), -- M. Turner
  (70852,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.1,  90, 'manual'), -- O. Gill
  (6168,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.2,  90, 'manual'), -- O. Alderete
  (195107, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 5.5,  46, 'manual'), -- D. Bobadilla
  (2499,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 5.3,  90, 'manual'), -- J. Alonso
  (195992, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.3,  79, 'manual'), -- J. Cáceres
  (2507,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.5,  79, 'manual'), -- M. Almirón
  (6236,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.9,  90, 'manual'), -- A. Cubas
  (278370, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.0,  46, 'manual'), -- D. Gómez
  (70747,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 7.3,  90, 'manual'), -- J. Enciso
  (2502,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 5.9,  90, 'manual'), -- G. Gómez
  (2522,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.4,  46, 'manual'), -- A. Sanabria
  (106485, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 7.3,  44, 'manual'), -- Maurício
  (2514,   'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.2,  28, 'manual'), -- A. Romero
  (35808,  'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.3,  11, 'manual'), -- G. Velázquez
  (196298, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.6,  11, 'manual'), -- R. Sosa
  (535737, 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae', 10004, 6.4,  10, 'manual'); -- A. Romero #17
