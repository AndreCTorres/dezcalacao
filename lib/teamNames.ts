function repairKnownMojibake(value: string): string {
  return value
    .replace(/T(?:Ã¼|ÃƒÂ¼|Ã\xbc|ü|Ü|u|U)rkiye/gi, 'Turkiye')
    .replace(/Cura(?:Ã§|ÃƒÂ§|\xE7|ç)c?ao/gi, 'Curacao')
    .replace(/Cura(?:Ã§|ÃƒÂ§|\xE7|ç)ao/gi, 'Curacao')
    .replace(/Su(?:Ã[ií]|ÃƒÂ[ií]|í|i)c?a/gi, 'Suica')
}

export function normalizeTeamName(value: string | null | undefined): string {
  return repairKnownMojibake(String(value ?? ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const TEAM_ALIASES: Record<string, string[]> = {
  algeria: ['argelia'],
  argelia: ['algeria'],
  argentina: ['argentina'],
  australia: ['australia'],
  austria: ['austria'],
  belgium: ['belgica'],
  belgica: ['belgium'],
  bosnia: ['bosnia herzegovina', 'bosnia and herzegovina', 'bosnia & herzegovina'],
  'bosnia herzegovina': ['bosnia', 'bosnia and herzegovina', 'bosnia & herzegovina'],
  'bosnia and herzegovina': ['bosnia', 'bosnia herzegovina', 'bosnia & herzegovina'],
  'bosnia & herzegovina': ['bosnia', 'bosnia herzegovina', 'bosnia and herzegovina'],
  brazil: ['brasil'],
  brasil: ['brazil'],
  canada: ['canada'],
  'cape verde': ['cape verde islands', 'cabo verde'],
  'cape verde islands': ['cape verde', 'cabo verde'],
  'cabo verde': ['cape verde', 'cape verde islands'],
  colombia: ['colombia'],
  'congo dr': ['dr congo', 'rd congo', 'democratic republic of the congo', 'republica democratica do congo'],
  'dr congo': ['congo dr', 'rd congo', 'democratic republic of the congo'],
  'rd congo': ['congo dr', 'dr congo', 'democratic republic of the congo'],
  'democratic republic of the congo': ['congo dr', 'dr congo', 'rd congo'],
  'republica democratica do congo': ['congo dr', 'dr congo'],
  croatia: ['croacia'],
  croacia: ['croatia'],
  curacao: ['curacao', 'curacao'],
  czechia: ['czech republic', 'rep tcheca', 'republica tcheca'],
  'czech republic': ['czechia', 'rep tcheca', 'republica tcheca'],
  'rep tcheca': ['czech republic', 'czechia'],
  'republica tcheca': ['czech republic', 'czechia'],
  ecuador: ['equador'],
  equador: ['ecuador'],
  egypt: ['egito'],
  egito: ['egypt'],
  england: ['inglaterra'],
  inglaterra: ['england'],
  france: ['franca'],
  franca: ['france'],
  germany: ['alemanha'],
  alemanha: ['germany'],
  ghana: ['gana'],
  gana: ['ghana'],
  haiti: ['haiti'],
  iran: ['ira'],
  ira: ['iran'],
  iraq: ['iraque'],
  iraque: ['iraq'],
  'ivory coast': ['cote d ivoire', 'cote divoire', 'costa do marfim'],
  'cote d ivoire': ['ivory coast', 'cote divoire', 'costa do marfim'],
  'cote divoire': ['ivory coast', 'cote d ivoire', 'costa do marfim'],
  'costa do marfim': ['ivory coast', 'cote d ivoire', 'cote divoire'],
  japan: ['japao'],
  japao: ['japan'],
  jordan: ['jordania'],
  jordania: ['jordan'],
  mexico: ['mexico'],
  morocco: ['marrocos'],
  marrocos: ['morocco'],
  netherlands: ['holanda'],
  holanda: ['netherlands'],
  'new zealand': ['nova zelandia'],
  'nova zelandia': ['new zealand'],
  norway: ['noruega'],
  noruega: ['norway'],
  panama: ['panama'],
  paraguay: ['paraguai'],
  paraguai: ['paraguay'],
  portugal: ['portugal'],
  qatar: ['catar'],
  catar: ['qatar'],
  'saudi arabia': ['arabia saudita'],
  'arabia saudita': ['saudi arabia'],
  scotland: ['escocia'],
  escocia: ['scotland'],
  senegal: ['senegal'],
  'south africa': ['africa do sul'],
  'africa do sul': ['south africa'],
  'south korea': ['korea republic', 'coreia do sul'],
  'korea republic': ['south korea', 'coreia do sul'],
  'coreia do sul': ['south korea', 'korea republic'],
  spain: ['espanha'],
  espanha: ['spain'],
  sweden: ['suecia'],
  suecia: ['sweden'],
  switzerland: ['suica', 'swiss', 'sui'],
  suica: ['switzerland', 'swiss', 'sui'],
  tunisia: ['tunisie', 'tunis'],
  tunisie: ['tunisia', 'tunis'],
  tunis: ['tunisia', 'tunisie'],
  turkey: ['turkiye', 'turquia'],
  turkiye: ['turkey', 'turquia'],
  turquia: ['turkey', 'turkiye'],
  uruguay: ['uruguai'],
  uruguai: ['uruguay'],
  usa: ['united states', 'eua', 'estados unidos'],
  'united states': ['usa', 'eua', 'estados unidos'],
  eua: ['usa', 'united states', 'estados unidos'],
  'estados unidos': ['usa', 'united states', 'eua'],
  uzbekistan: ['uzbequistao'],
  uzbequistao: ['uzbekistan'],
}

export const CANONICAL_TEAM_BY_NORMALIZED: Record<string, string> = {
  algeria: 'Algeria',
  argelia: 'Algeria',
  argentina: 'Argentina',
  australia: 'Australia',
  austria: 'Austria',
  belgium: 'Belgium',
  belgica: 'Belgium',
  bosnia: 'Bosnia & Herzegovina',
  'bosnia herzegovina': 'Bosnia & Herzegovina',
  'bosnia and herzegovina': 'Bosnia & Herzegovina',
  'bosnia & herzegovina': 'Bosnia & Herzegovina',
  brazil: 'Brazil',
  brasil: 'Brazil',
  canada: 'Canada',
  'cape verde': 'Cape Verde Islands',
  'cape verde islands': 'Cape Verde Islands',
  'cabo verde': 'Cape Verde Islands',
  colombia: 'Colombia',
  'congo dr': 'Congo DR',
  'dr congo': 'Congo DR',
  'rd congo': 'Congo DR',
  'democratic republic of the congo': 'Congo DR',
  'republica democratica do congo': 'Congo DR',
  croatia: 'Croatia',
  croacia: 'Croatia',
  curacao: 'Curacao',
  czechia: 'Czech Republic',
  'czech republic': 'Czech Republic',
  'rep tcheca': 'Czech Republic',
  'republica tcheca': 'Czech Republic',
  ecuador: 'Ecuador',
  equador: 'Ecuador',
  egypt: 'Egypt',
  egito: 'Egypt',
  england: 'England',
  inglaterra: 'England',
  france: 'France',
  franca: 'France',
  germany: 'Germany',
  alemanha: 'Germany',
  ghana: 'Ghana',
  gana: 'Ghana',
  haiti: 'Haiti',
  iran: 'Iran',
  ira: 'Iran',
  iraq: 'Iraq',
  iraque: 'Iraq',
  'ivory coast': 'Ivory Coast',
  'cote d ivoire': 'Ivory Coast',
  'cote divoire': 'Ivory Coast',
  'costa do marfim': 'Ivory Coast',
  japan: 'Japan',
  japao: 'Japan',
  jordan: 'Jordan',
  jordania: 'Jordan',
  mexico: 'Mexico',
  morocco: 'Morocco',
  marrocos: 'Morocco',
  netherlands: 'Netherlands',
  holanda: 'Netherlands',
  'new zealand': 'New Zealand',
  'nova zelandia': 'New Zealand',
  norway: 'Norway',
  noruega: 'Norway',
  panama: 'Panama',
  paraguay: 'Paraguay',
  paraguai: 'Paraguay',
  portugal: 'Portugal',
  qatar: 'Qatar',
  catar: 'Qatar',
  'saudi arabia': 'Saudi Arabia',
  'arabia saudita': 'Saudi Arabia',
  scotland: 'Scotland',
  escocia: 'Scotland',
  senegal: 'Senegal',
  'south africa': 'South Africa',
  'africa do sul': 'South Africa',
  'south korea': 'South Korea',
  'korea republic': 'South Korea',
  'coreia do sul': 'South Korea',
  spain: 'Spain',
  espanha: 'Spain',
  sweden: 'Sweden',
  suecia: 'Sweden',
  switzerland: 'Switzerland',
  suica: 'Switzerland',
  swiss: 'Switzerland',
  sui: 'Switzerland',
  tunisia: 'Tunisia',
  tunisie: 'Tunisia',
  tunis: 'Tunisia',
  turkey: 'Turkey',
  turkiye: 'Turkey',
  turquia: 'Turkey',
  uruguay: 'Uruguay',
  uruguai: 'Uruguay',
  usa: 'USA',
  'united states': 'USA',
  eua: 'USA',
  'estados unidos': 'USA',
  uzbekistan: 'Uzbekistan',
  uzbequistao: 'Uzbekistan',
}

export function teamVariants(value: string | null | undefined): string[] {
  const base = normalizeTeamName(value)
  if (!base) return []
  return Array.from(new Set([base, ...(TEAM_ALIASES[base] ?? [])].map(normalizeTeamName)))
}

export function teamsMatch(
  playerTeam: string | null | undefined,
  expectedTeam: string | null | undefined
): boolean {
  const playerVariants = teamVariants(playerTeam)
  const expectedVariants = teamVariants(expectedTeam)
  if (playerVariants.length === 0 || expectedVariants.length === 0) return false

  return playerVariants.some((playerVariant) =>
    expectedVariants.some(
      (expectedVariant) =>
        playerVariant === expectedVariant ||
        playerVariant.includes(expectedVariant) ||
        expectedVariant.includes(playerVariant)
    )
  )
}

export function canonicalTeamName(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const normalized = normalizeTeamName(raw)
  return CANONICAL_TEAM_BY_NORMALIZED[normalized] ?? raw
}

export function canonicalTeamHint(value: string | null | undefined): string {
  return canonicalTeamName(value)
}
