import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://doynzpekofzfrzhfogkw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveW56cGVrb2Z6ZnJ6aGZvZ2t3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA1NDc2MiwiZXhwIjoyMDk2NjMwNzYyfQ.sVfzDkLJKBaf7AauJY4RkG0TJ_6xX6vz9af06i2g90M'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Dados dos 7 jogos da Rodada 1 com ratings
const ROUND1_DATA = [
  {
    label: 'Catar x Suíça',
    home: 'Catar',
    away: 'Suíça',
    ratings: [
      { name: 'M. I. Abunada', rating: 6.9, minutes: 90 },
      { name: 'B. Khoukhi', rating: 6.4, minutes: 90 },
      { name: 'P. Miguel', rating: 7.4, minutes: 90 },
      { name: 'A. A. Oui', rating: 6.1, minutes: 90 },
      { name: 'J. G. Abdulsallam', rating: 6.4, minutes: 90 },
      { name: 'Y. Abdurisag', rating: 7.0, minutes: 90 },
      { name: 'A. Madibo', rating: 6.3, minutes: 90 },
      { name: 'H. Al-Amin', rating: 7.2, minutes: 90 },
      { name: 'I. Laye', rating: 7.2, minutes: 90 },
      { name: 'A. Afif', rating: 7.2, minutes: 90 },
      { name: 'E. Junior', rating: 6.1, minutes: 90 },
      { name: 'Ahmed Fathi', rating: 6.7, minutes: 30 },
      { name: 'Karim Boudiaf', rating: 7.0, minutes: 30 },
      { name: 'Ahmed Alaaeldin', rating: 6.4, minutes: 30 },
      { name: 'Mohamed Naceur Almanai', rating: 6.6, minutes: 11 },
      { name: 'Hassan Al Haydos', rating: 6.5, minutes: 2 },
      { name: 'G. Kobel', rating: 7.2, minutes: 90 },
      { name: 'N. Elvedi', rating: 7.1, minutes: 90 },
      { name: 'M. Akanji', rating: 7.5, minutes: 90 },
      { name: 'R. Rodriguez', rating: 7.6, minutes: 90 },
      { name: 'G. Xhaka', rating: 7.2, minutes: 90 },
      { name: 'B. Embolo', rating: 7.0, minutes: 90 },
      { name: 'D. Ndoye', rating: 6.3, minutes: 90 },
      { name: 'M. Aebischer', rating: 7.4, minutes: 90 },
      { name: 'R. Vargas', rating: 7.9, minutes: 90 },
      { name: 'R. Freuler', rating: 6.5, minutes: 90 },
      { name: 'D. Zakaria', rating: 6.5, minutes: 90 },
      { name: 'Fabian Rieder', rating: 6.4, minutes: 25 },
      { name: 'Johan Manzambi', rating: 6.1, minutes: 25 },
      { name: 'Zeki Amdouni', rating: 6.9, minutes: 11 },
      { name: 'Miro Muheim', rating: 5.4, minutes: 1 },
      { name: 'Ardon Jashari', rating: 6.3, minutes: 1 },
    ],
  },
  {
    label: 'Marrocos x Brasil',
    home: 'Marrocos',
    away: 'Brasil',
    ratings: [
      { name: 'Bono', rating: 6.9, minutes: 90 },
      { name: 'C. Riad', rating: 6.6, minutes: 90 },
      { name: 'A. Bouaddi', rating: 6.9, minutes: 90 },
      { name: 'N. Mazraoui', rating: 7.0, minutes: 90 },
      { name: 'I. Saibari', rating: 7.8, minutes: 90 },
      { name: 'A. Ounahi', rating: 6.7, minutes: 90 },
      { name: 'N. El Aynaoui', rating: 6.9, minutes: 90 },
      { name: 'I. Diop', rating: 6.6, minutes: 90 },
      { name: 'B. Díaz', rating: 6.8, minutes: 90 },
      { name: 'A. Hakimi', rating: 7.2, minutes: 90 },
      { name: 'Chemsdine Talbi', rating: 6.5, minutes: 25 },
      { name: 'Samir El Mourabet', rating: 6.6, minutes: 25 },
      { name: 'Anass Salah-Eddine', rating: 6.7, minutes: 10 },
      { name: 'Ayoube Amaimouni Echghouyab', rating: 6.7, minutes: 10 },
      { name: 'Soufiane Rahimi', rating: 6.5, minutes: 1 },
      { name: 'Alisson', rating: 6.9, minutes: 90 },
      { name: 'Marquinhos', rating: 7.3, minutes: 90 },
      { name: 'G. Magalhães', rating: 7.1, minutes: 90 },
      { name: 'R. Ibáñez', rating: 6.2, minutes: 90 },
      { name: 'Casemiro', rating: 6.6, minutes: 90 },
      { name: 'L. Paquetá', rating: 6.9, minutes: 90 },
      { name: 'Raphinha', rating: 6.5, minutes: 90 },
      { name: 'I. Thiago', rating: 6.2, minutes: 90 },
      { name: 'B. Guimarães', rating: 6.7, minutes: 90 },
      { name: 'D. Santos', rating: 7.2, minutes: 90 },
      { name: 'Vinicius Jr.', rating: 8.0, minutes: 90 },
      { name: 'Danilo', rating: 6.8, minutes: 44 },
      { name: 'Fabinho', rating: 6.6, minutes: 44 },
      { name: 'Matheus Cunha', rating: 6.8, minutes: 29 },
      { name: 'Luiz Henrique', rating: 7.0, minutes: 28 },
      { name: 'Danilo Santos', rating: 6.4, minutes: 10 },
    ],
  },
  {
    label: 'Haiti x Escócia',
    home: 'Haiti',
    away: 'Escócia',
    ratings: [
      { name: 'J. Placide', rating: 6.9, minutes: 90 },
      { name: 'C. Arcus', rating: 6.3, minutes: 90 },
      { name: 'R. Adé', rating: 7.0, minutes: 90 },
      { name: 'H. Delcroix', rating: 6.9, minutes: 90 },
      { name: 'L. D. Deedson', rating: 6.4, minutes: 90 },
      { name: 'D. Jean Jacques', rating: 7.1, minutes: 90 },
      { name: 'J. Bellegarde', rating: 7.3, minutes: 90 },
      { name: 'M. Expérience', rating: 7.0, minutes: 90 },
      { name: 'R. Providence', rating: 6.9, minutes: 90 },
      { name: 'W. Isidor', rating: 6.2, minutes: 90 },
      { name: 'F. Pierrot', rating: 6.8, minutes: 90 },
      { name: 'Josué Casimir', rating: 6.7, minutes: 29 },
      { name: 'Lenny Joseph', rating: 6.3, minutes: 14 },
      { name: 'Yassin Fortune', rating: 6.6, minutes: 5 },
      { name: 'A. Gunn', rating: 7.2, minutes: 90 },
      { name: 'G. Hanley', rating: 7.5, minutes: 90 },
      { name: 'J. Hendry', rating: 7.1, minutes: 90 },
      { name: 'A. Robertson', rating: 7.2, minutes: 90 },
      { name: 'J. McGinn', rating: 7.5, minutes: 90 },
      { name: 'L. Ferguson', rating: 7.6, minutes: 90 },
      { name: 'S. McTominay', rating: 6.4, minutes: 90 },
      { name: 'C. Adams', rating: 6.5, minutes: 90 },
      { name: 'L. Shankland', rating: 6.5, minutes: 90 },
      { name: 'B. Doak', rating: 7.2, minutes: 90 },
      { name: 'A. Hickey', rating: 7.0, minutes: 90 },
      { name: 'Nathan Patterson', rating: 6.9, minutes: 15 },
      { name: 'Ryan Christie', rating: 6.7, minutes: 15 },
      { name: 'Lyndon Dykes', rating: 6.5, minutes: 15 },
      { name: 'Kenny McLean', rating: 6.6, minutes: 7 },
      { name: 'Findlay Curtis', rating: 6.4, minutes: 7 },
    ],
  },
  {
    label: 'Austrália x Turquia',
    home: 'Austrália',
    away: 'Turquia',
    ratings: [
      { name: 'P. Beach', rating: 9.1, minutes: 90 },
      { name: 'H. Souttar', rating: 7.5, minutes: 90 },
      { name: 'A. Circati', rating: 7.7, minutes: 90 },
      { name: 'J. Italiano', rating: 7.0, minutes: 90 },
      { name: 'C. Burgess', rating: 7.3, minutes: 90 },
      { name: 'A. O\'Neill', rating: 7.1, minutes: 90 },
      { name: 'C. Metcalfe', rating: 7.8, minutes: 90 },
      { name: 'P. Okon-Engstler', rating: 7.3, minutes: 90 },
      { name: 'J. Bos', rating: 6.9, minutes: 90 },
      { name: 'N. Irankunda', rating: 7.4, minutes: 90 },
      { name: 'M. Touré', rating: 6.4, minutes: 90 },
      { name: 'Nishan Velupillay', rating: 6.4, minutes: 29 },
      { name: 'Jason Geria', rating: 6.9, minutes: 16 },
      { name: 'Tete Yengi', rating: 6.8, minutes: 16 },
      { name: 'Aziz Behich', rating: 6.6, minutes: 6 },
      { name: 'Jackson Irvine', rating: 6.5, minutes: 6 },
      { name: 'U. Çakır', rating: 6.2, minutes: 90 },
      { name: 'M. Demiral', rating: 6.7, minutes: 90 },
      { name: 'H. Çalhanoğlu', rating: 7.3, minutes: 90 },
      { name: 'A. Bardakcı', rating: 6.7, minutes: 90 },
      { name: 'O. Kökçü', rating: 6.3, minutes: 90 },
      { name: 'İ. Yüksek', rating: 7.4, minutes: 90 },
      { name: 'A. Güler', rating: 6.6, minutes: 90 },
      { name: 'Z. Çelik', rating: 6.2, minutes: 90 },
      { name: 'F. Kadıoğlu', rating: 6.5, minutes: 90 },
      { name: 'B. A. Yılmaz', rating: 6.3, minutes: 90 },
      { name: 'K. Aktürkoğlu', rating: 5.6, minutes: 90 },
      { name: 'Kenan Yıldız', rating: 7.1, minutes: 44 },
      { name: 'Yunus Akgün', rating: 6.5, minutes: 28 },
      { name: 'Mert Müldür', rating: 6.7, minutes: 9 },
      { name: 'Salih Özcan', rating: 6.8, minutes: 9 },
      { name: 'Deniz Gül', rating: 6.4, minutes: 5 },
    ],
  },
  {
    label: 'Alemanha x Curaçao',
    home: 'Alemanha',
    away: 'Curaçao',
    ratings: [
      { name: 'M. Neuer', rating: 6.6, minutes: 90 },
      { name: 'N. Schlotterbeck', rating: 8.4, minutes: 90 },
      { name: 'J. Tah', rating: 6.9, minutes: 90 },
      { name: 'J. Kimmich', rating: 8.1, minutes: 90 },
      { name: 'A. Pavlović', rating: 7.6, minutes: 90 },
      { name: 'J. Musiala', rating: 8.1, minutes: 90 },
      { name: 'F. Nmecha', rating: 8.5, minutes: 90 },
      { name: 'L. Sané', rating: 6.4, minutes: 90 },
      { name: 'F. Wirtz', rating: 7.6, minutes: 90 },
      { name: 'N. Brown', rating: 8.0, minutes: 90 },
      { name: 'K. Havertz', rating: 8.5, minutes: 90 },
      { name: 'Deniz Undav', rating: 8.5, minutes: 26 },
      { name: 'David Raum', rating: 6.8, minutes: 17 },
      { name: 'Antonio Rüdiger', rating: 6.7, minutes: 17 },
      { name: 'Leon Goretzka', rating: 6.9, minutes: 17 },
      { name: 'Waldemar Anton', rating: 6.8, minutes: 7 },
      { name: 'E. Room', rating: 5.0, minutes: 90 },
      { name: 'D. Fonville', rating: 5.0, minutes: 90 },
      { name: 'J. Bacuna', rating: 6.8, minutes: 90 },
      { name: 'A. Obispo', rating: 5.7, minutes: 90 },
      { name: 'L. Bacuna', rating: 6.4, minutes: 90 },
      { name: 'T. Chong', rating: 6.5, minutes: 90 },
      { name: 'R. Bazoer', rating: 5.3, minutes: 90 },
      { name: 'L. Comenencia', rating: 7.3, minutes: 90 },
      { name: 'S. Floranus', rating: 5.2, minutes: 90 },
      { name: 'S. Hansen', rating: 6.6, minutes: 90 },
      { name: 'J. Locadia', rating: 6.7, minutes: 90 },
      { name: 'Jeremy Antonisse', rating: 6.8, minutes: 44 },
      { name: 'Jearl Margaritha', rating: 6.4, minutes: 25 },
      { name: 'Gervane Kastaneer', rating: 6.3, minutes: 7 },
    ],
  },
  {
    label: 'Holanda x Japão',
    home: 'Holanda',
    away: 'Japão',
    ratings: [
      { name: 'B. Verbruggen', rating: 6.0, minutes: 90 },
      { name: 'J. P. van Hecke', rating: 7.4, minutes: 90 },
      { name: 'V. van Dijk', rating: 7.9, minutes: 90 },
      { name: 'D. Dumfries', rating: 7.0, minutes: 90 },
      { name: 'T. Reijnders', rating: 6.5, minutes: 90 },
      { name: 'F. de Jong', rating: 7.2, minutes: 90 },
      { name: 'R. Gravenberch', rating: 7.3, minutes: 90 },
      { name: 'C. Summerville', rating: 8.5, minutes: 90 },
      { name: 'D. Malen', rating: 6.6, minutes: 90 },
      { name: 'M. van de Ven', rating: 6.4, minutes: 90 },
      { name: 'C. Gakpo', rating: 7.5, minutes: 90 },
      { name: 'Quinten Timber', rating: 6.8, minutes: 20 },
      { name: 'Teun Koopmeiners', rating: 6.4, minutes: 20 },
      { name: 'Memphis Depay', rating: 6.5, minutes: 20 },
      { name: 'Nathan Aké', rating: 6.3, minutes: 9 },
      { name: 'Brian Brobbey', rating: 6.5, minutes: 5 },
      { name: 'Z. Suzuki', rating: 7.8, minutes: 90 },
      { name: 'S. Taniguchi', rating: 6.6, minutes: 90 },
      { name: 'H. Itô', rating: 6.3, minutes: 90 },
      { name: 'K. Nakamura', rating: 7.6, minutes: 90 },
      { name: 'D. Kamada', rating: 7.1, minutes: 90 },
      { name: 'T. Kubo', rating: 6.7, minutes: 90 },
      { name: 'K. Sano', rating: 6.2, minutes: 90 },
      { name: 'R. Doan', rating: 6.4, minutes: 90 },
      { name: 'T. Watanabe', rating: 6.4, minutes: 90 },
      { name: 'A. Ueda', rating: 6.6, minutes: 90 },
      { name: 'D. Maeda', rating: 6.3, minutes: 90 },
      { name: 'Junya Ito', rating: 6.5, minutes: 24 },
      { name: 'Yukinari Sugawara', rating: 7.1, minutes: 15 },
      { name: 'Takehiro Tomiyasu', rating: 6.8, minutes: 15 },
      { name: 'Koki Ogawa', rating: 6.6, minutes: 15 },
      { name: 'Kento Shiogai', rating: 6.5, minutes: 6 },
    ],
  },
  {
    label: 'Costa do Marfim x Equador',
    home: 'Costa do Marfim',
    away: 'Equador',
    ratings: [
      { name: 'Y. Fofana', rating: 6.7, minutes: 90 },
      { name: 'W. Singo', rating: 7.7, minutes: 90 },
      { name: 'E. Agbadou', rating: 7.6, minutes: 90 },
      { name: 'G. Konan', rating: 7.2, minutes: 90 },
      { name: 'F. Kessié', rating: 7.2, minutes: 90 },
      { name: 'S. Fofana', rating: 6.6, minutes: 90 },
      { name: 'B. Touré', rating: 6.3, minutes: 90 },
      { name: 'E. Wahi', rating: 6.4, minutes: 90 },
      { name: 'N. Pépé', rating: 6.7, minutes: 90 },
      { name: 'Y. Diomande', rating: 8.2, minutes: 90 },
      { name: 'G. Doué', rating: 7.2, minutes: 90 },
      { name: 'Amad Diallo', rating: 8.3, minutes: 34 },
      { name: 'Ange-Yoan Bonny', rating: 6.4, minutes: 34 },
      { name: 'Ibrahim Sangaré', rating: 6.9, minutes: 13 },
      { name: 'Christ Inao Oulaï', rating: 7.1, minutes: 13 },
      { name: 'Odilon Kossounou', rating: 6.7, minutes: 1 },
      { name: 'H. Galíndez', rating: 7.0, minutes: 90 },
      { name: 'W. Pacho', rating: 6.5, minutes: 90 },
      { name: 'P. Hincapié', rating: 6.5, minutes: 90 },
      { name: 'J. Ordóñez', rating: 6.8, minutes: 90 },
      { name: 'M. Caicedo', rating: 7.1, minutes: 90 },
      { name: 'P. Vite', rating: 7.4, minutes: 90 },
      { name: 'E. Valencia', rating: 6.6, minutes: 90 },
      { name: 'G. Plata', rating: 6.6, minutes: 90 },
      { name: 'J. Yeboah', rating: 6.5, minutes: 90 },
      { name: 'A. Franco', rating: 7.1, minutes: 90 },
      { name: 'Nilson Angulo', rating: 6.4, minutes: 34 },
      { name: 'Jackson Porozo', rating: 6.1, minutes: 28 },
      { name: 'Ángelo Preciado', rating: 6.1, minutes: 28 },
      { name: 'Kevin Rodriguez', rating: 6.1, minutes: 13 },
    ],
  },
]

async function run() {
  const groupId = process.argv[2]
  const roundId = process.argv[3]

  if (!groupId || !roundId) {
    console.error('❌ Uso: node scripts/seed-round1-ratings.mjs <groupId> <roundId>')
    process.exit(1)
  }

  console.log(`🚀 Populando Rodada 1 para grupo ${groupId}...`)

  try {
    // 1. Criar os 7 fixtures
    console.log('\n📋 Criando fixtures...')
    const fixtures = []

    for (const match of ROUND1_DATA) {
      const fixtureId = Math.floor(Math.random() * 1000000) + Date.now()

      const { data, error } = await supabase
        .from('fixtures')
        .insert({
          id: fixtureId,
          round_id: roundId,
          home_team: match.home,
          away_team: match.away,
          status: 'FT',
        })
        .select()
        .single()

      if (error) {
        console.error(`❌ Erro ao criar fixture ${match.label}:`, error.message)
        continue
      }

      fixtures.push(data)
      console.log(`  ✓ ${match.label}`)
    }

    // 2. Para cada fixture, buscar os IDs dos jogadores e inserir ratings
    console.log('\n🎯 Inserindo ratings...')
    let totalRatings = 0
    let totalErrors = 0

    for (let i = 0; i < ROUND1_DATA.length; i++) {
      const match = ROUND1_DATA[i]
      const fixture = fixtures[i]

      if (!fixture) {
        console.log(`  ⚠️  Pulando ${match.label} (fixture não criado)`)
        continue
      }

      console.log(`  📍 ${match.label}...`)

      // Buscar todos os jogadores do jogo (ambos os times)
      const allPlayers = match.ratings

      // Buscar IDs do banco para cada nome
      for (const playerRating of allPlayers) {
        // Query: buscar jogador por nome (ilike com %)
        const { data: players, error: searchError } = await supabase
          .from('players')
          .select('id')
          .ilike('name', `%${playerRating.name}%`)
          .limit(1)

        if (searchError || !players || players.length === 0) {
          totalErrors++
          console.log(`    ⚠️  ${playerRating.name} não encontrado`)
          continue
        }

        const playerId = players[0].id

        // Upsert rating
        const { error: ratingError } = await supabase
          .from('player_round_ratings')
          .upsert(
            {
              player_id: playerId,
              round_id: roundId,
              fixture_id: fixture.id,
              rating: playerRating.rating,
              minutes: playerRating.minutes,
              source: 'manual',
              fetched_at: new Date().toISOString(),
            },
            { onConflict: 'player_id,round_id' }
          )

        if (ratingError) {
          totalErrors++
          console.log(`    ❌ Erro ao salvar rating de ${playerRating.name}: ${ratingError.message}`)
        } else {
          totalRatings++
        }
      }
    }

    console.log(`\n✅ Concluído!`)
    console.log(`  • Fixtures criados: ${fixtures.length}`)
    console.log(`  • Ratings inseridos: ${totalRatings}`)
    console.log(`  • Erros: ${totalErrors}`)

    process.exit(0)
  } catch (err) {
    console.error('❌ Erro fatal:', err.message)
    process.exit(1)
  }
}

run()
