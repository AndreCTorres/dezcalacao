import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://doynzpekofzfrzhfogkw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveW56cGVrb2Z6ZnJ6aGZvZ2t3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA1NDc2MiwiZXhwIjoyMDk2NjMwNzYyfQ.sVfzDkLJKBaf7AauJY4RkG0TJ_6xX6vz9af06i2g90M'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Nomes que faltaram
const MISSING = [
  'J. G. Abdulsallam',
  'H. Al-Amin',
  'R. Rodriguez',
  'Bono',
  'R. Ibáñez',
  'Vinicius Jr.',
  'R. Adé',
  'Yassin Fortune',
  'A. Pavlović',
  'E. Room',
  'D. Fonville',
  'J. Bacuna',
  'A. Obispo',
  'L. Bacuna',
  'T. Chong',
  'R. Bazoer',
  'L. Comenencia',
  'S. Floranus',
  'S. Hansen',
  'J. Locadia',
  'Jearl Margaritha',
  'Gervane Kastaneer',
  'H. Itô',
  'J. Ordóñez',
  'Kevin Rodriguez',
]

function levenshtein(a, b) {
  const matrix = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

function similarityScore(a, b) {
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase())
  const maxLen = Math.max(a.length, b.length)
  return 1 - dist / maxLen
}

async function diagnose() {
  console.log('🔍 Diagnosticando nomes faltantes...\n')

  // Buscar todos os jogadores
  const { data: allPlayers, error } = await supabase
    .from('players')
    .select('id, name, team_id')
    .eq('season', 'WC2026')
    .in('team_id', [20, 22, 1569, 1568]) // Qatar, Switzerland, Curacao, Turkey

  if (error || !allPlayers) {
    console.error('Erro:', error)
    process.exit(1)
  }

  console.log(`📦 Carregados ${allPlayers.length} jogadores dos 4 times faltantes\n`)

  for (const missingName of MISSING) {
    console.log(`\n❓ "${missingName}"`)
    const candidates = []

    for (const player of allPlayers) {
      const score = similarityScore(missingName, player.name)
      if (score > 0.4) {
        candidates.push({ name: player.name, score, team: player.team_id })
      }
    }

    candidates.sort((a, b) => b.score - a.score)

    if (candidates.length === 0) {
      console.log('  ⚠️  Nenhum similar encontrado')
    } else {
      candidates.slice(0, 3).forEach((c, i) => {
        console.log(`  ${i + 1}. "${c.name}" (${(c.score * 100).toFixed(0)}%) [Team ${c.team}]`)
      })
    }
  }

  process.exit(0)
}

diagnose()
