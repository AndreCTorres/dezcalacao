import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://doynzpekofzfrzhfogkw.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRveW56cGVrb2Z6ZnJ6aGZvZ2t3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA1NDc2MiwiZXhwIjoyMDk2NjMwNzYyfQ.sVfzDkLJKBaf7AauJY4RkG0TJ_6xX6vz9af06i2g90M'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const groupId = '15497f7b-d85d-4ade-9a39-2539f39f5742'
const roundId = 'e174fa07-277f-4cc2-a35d-274fcc1fe7ae'

// Nomes que faltaram
const missingNames = [
  'M. I. Abunada', 'B. Khoukhi', 'P. Miguel', 'A. A. Oui', 'J. G. Abdulsallam',
  'A. Madibo', 'H. Al-Amin', 'I. Laye', 'A. Afif', 'E. Junior',
  'Ahmed Alaaeldin', 'Mohamed Naceur Almanai', 'R. Rodriguez',
  'Fabian Rieder', 'Johan Manzambi', 'Zeki Amdouni', 'Miro Muheim', 'Ardon Jashari',
  'Bono', 'B. Díaz', 'Chemsdine Talbi', 'Samir El Mourabet', 'Anass Salah-Eddine',
  'Ayoube Amaimouni Echghouyab', 'Soufiane Rahimi', 'G. Magalhães', 'R. Ibáñez',
  'L. Paquetá', 'I. Thiago', 'B. Guimarães', 'D. Santos', 'Vinicius Jr.',
  'R. Adé', 'L. D. Deedson', 'D. Jean Jacques', 'Josué Casimir', 'Lenny Joseph',
  'Yassin Fortune', 'J. McGinn', 'Nathan Patterson', 'Ryan Christie', 'Lyndon Dykes',
  'Kenny McLean', 'A. O\'Neill', 'P. Okon-Engstler', 'Nishan Velupillay',
  'Jason Geria', 'Tete Yengi', 'Aziz Behich', 'Jackson Irvine', 'U. Çakır',
  'H. Çalhanoğlu', 'A. Bardakcı', 'O. Kökçü', 'İ. Yüksek', 'F. Kadıoğlu',
  'B. A. Yılmaz', 'K. Aktürkoğlu', 'Kenan Yıldız', 'Yunus Akgün', 'Mert Müldür',
  'Salih Özcan', 'Deniz Gül', 'A. Pavlović', 'Deniz Undav', 'David Raum',
  'Antonio Rüdiger', 'Leon Goretzka', 'Waldemar Anton', 'D. Fonville',
  'Jeremy Antonisse', 'Jearl Margaritha', 'Gervane Kastaneer', 'J. P. van Hecke',
  'Quinten Timber', 'Teun Koopmeiners', 'Memphis Depay', 'Nathan Aké',
  'Brian Brobbey', 'H. Itô', 'K. Nakamura', 'Junya Ito', 'Yukinari Sugawara',
  'Takehiro Tomiyasu', 'Kento Shiogai', 'Amad Diallo', 'Ange-Yoan Bonny',
  'Ibrahim Sangaré', 'Christ Inao Oulaï', 'Odilon Kossounou', 'J. Ordóñez',
  'Nilson Angulo', 'Jackson Porozo', 'Ángelo Preciado', 'Kevin Rodriguez',
]

async function findExactNames() {
  console.log('🔍 Buscando nomes exatos no banco...\n')

  const mapping = {}
  let found = 0
  let notFound = 0

  for (const searchName of missingNames) {
    // Tenta várias estratégias de busca
    let playerId = null

    // 1. Busca exata
    let { data: exactMatch } = await supabase
      .from('players')
      .select('id, name')
      .eq('name', searchName)
      .limit(1)

    if (exactMatch && exactMatch.length > 0) {
      playerId = exactMatch[0].id
      mapping[searchName] = { id: exactMatch[0].id, name: exactMatch[0].name }
      found++
      console.log(`✓ ${searchName} → ${exactMatch[0].name}`)
      continue
    }

    // 2. Busca ilike (case-insensitive)
    let { data: ilikeMatch } = await supabase
      .from('players')
      .select('id, name')
      .ilike('name', `%${searchName}%`)
      .limit(1)

    if (ilikeMatch && ilikeMatch.length > 0) {
      playerId = ilikeMatch[0].id
      mapping[searchName] = { id: ilikeMatch[0].id, name: ilikeMatch[0].name }
      found++
      console.log(`✓ ${searchName} → ${ilikeMatch[0].name} (ilike)`)
      continue
    }

    // 3. Tenta remover pontos e buscarnovamente
    const withoutDots = searchName.replace(/\./g, '')
    let { data: nodotsMatch } = await supabase
      .from('players')
      .select('id, name')
      .ilike('name', `%${withoutDots}%`)
      .limit(1)

    if (nodotsMatch && nodotsMatch.length > 0) {
      playerId = nodotsMatch[0].id
      mapping[searchName] = { id: nodotsMatch[0].id, name: nodotsMatch[0].name }
      found++
      console.log(`✓ ${searchName} → ${nodotsMatch[0].name} (sem pontos)`)
      continue
    }

    notFound++
    console.log(`✗ ${searchName} (NÃO ENCONTRADO)`)
  }

  console.log(`\n📊 Resumo:`)
  console.log(`  Encontrados: ${found}`)
  console.log(`  Não encontrados: ${notFound}`)

  if (notFound > 0) {
    console.log(`\n📋 Nomes NÃO encontrados (próximo passo):`)
    for (const name of missingNames) {
      if (!mapping[name]) {
        console.log(`  - ${name}`)
      }
    }
  }

  // Salvar mapping para referência
  console.log(`\n💾 Salvando mapping em mapping.json...`)
  // Aqui você pode salvar em arquivo se precisar

  return mapping
}

findExactNames()
