const TEAM_NAMES_ES: Record<string, string> = {
  'Algeria': 'Argelia',
  'Argentina': 'Argentina',
  'Australia': 'Australia',
  'Austria': 'Austria',
  'Belgium': 'Bélgica',
  'Bosnia & Herzegovina': 'Bosnia y Herzegovina',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia-Herzegovina',
  'Brazil': 'Brasil',
  'Cabo Verde': 'Cabo Verde',
  'Canada': 'Canadá',
  'Cape Verde': 'Cabo Verde',
  'Cape Verde Islands': 'Cabo Verde',
  'Colombia': 'Colombia',
  'Congo DR': 'RD Congo',
  'Costa Rica': 'Costa Rica',
  "Côte d'Ivoire": 'Costa de Marfil',
  'Croatia': 'Croacia',
  'Curaçao': 'Curazao',
  'Czechia': 'Chequia',
  'Ecuador': 'Ecuador',
  'Egypt': 'Egipto',
  'England': 'Inglaterra',
  'France': 'Francia',
  'Germany': 'Alemania',
  'Ghana': 'Ghana',
  'Haiti': 'Haití',
  'IR Iran': 'Irán',
  'Iran': 'Irán',
  'Iraq': 'Irak',
  'Ivory Coast': 'Costa de Marfil',
  'Japan': 'Japón',
  'Jordan': 'Jordania',
  'Korea Republic': 'Corea del Sur',
  'Mexico': 'México',
  'Morocco': 'Marruecos',
  'Netherlands': 'Países Bajos',
  'New Zealand': 'Nueva Zelanda',
  'Norway': 'Noruega',
  'Panama': 'Panamá',
  'Paraguay': 'Paraguay',
  'Portugal': 'Portugal',
  'Qatar': 'Catar',
  'Saudi Arabia': 'Arabia Saudita',
  'Scotland': 'Escocia',
  'Senegal': 'Senegal',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Spain': 'España',
  'Sweden': 'Suecia',
  'Switzerland': 'Suiza',
  'Tunisia': 'Túnez',
  'Türkiye': 'Turquía',
  'Turkey': 'Turquía',
  'United States': 'Estados Unidos',
  'Uruguay': 'Uruguay',
  'USA': 'Estados Unidos',
  'Uzbekistan': 'Uzbekistán',
};

/**
 * Traduce nombre de equipo al español. Si no encuentra traducción, retorna el original.
 * También traduce placeholders de ESPN como "Round of 32 5 Winner".
 */
export function translateTeamName(name: string): string {
  if (TEAM_NAMES_ES[name]) return TEAM_NAMES_ES[name];

  // Traducir placeholders ESPN de bracket knockout
  const roundOf = name.match(/^Round of (\d+) (\d+) Winner$/i);
  if (roundOf) {
    const round = parseInt(roundOf[1], 10);
    const matchNum = roundOf[2];
    const roundName = ROUND_NAMES[round] ?? `Ronda de ${round}`;
    return `Ganador ${roundName} ${matchNum}`;
  }

  const qf = name.match(/^Quarterfinal (\d+) Winner$/i);
  if (qf) return `Ganador Cuartos ${qf[1]}`;

  const sf = name.match(/^Semifinal (\d+) Winner$/i);
  if (sf) return `Ganador Semi ${sf[1]}`;

  if (/^TBD$/i.test(name)) return 'Por definir';

  return name;
}

const ROUND_NAMES: Record<number, string> = {
  16: '16vos',
  32: '32vos',
};
