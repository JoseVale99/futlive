import { HttpParams } from '@angular/common/http';

/**
 * Catálogo de ligas soportadas. Espejo de `api/leagues.js` para que el frontend
 * tenga nombre/color/país sin hacer un round-trip al backend. Si agregás una liga,
 * mantené ambos archivos en sync.
 */

export interface League {
  slug: string;
  name: string;
  country: string;
  espnPath: string;
  accent: string;
  iconBg: string;
  shortName: string;
}

export const LEAGUES: Record<string, League> = {
  premier:      { slug: 'premier',     name: 'Premier League',    country: 'Inglaterra',     espnPath: 'eng.1',                  accent: 'from-purple-600 to-indigo-600', iconBg: 'bg-purple-600',  shortName: 'PREMIER' },
  laliga:       { slug: 'laliga',      name: 'La Liga',           country: 'España',         espnPath: 'esp.1',                  accent: 'from-red-600 to-orange-600',   iconBg: 'bg-red-600',     shortName: 'LALIGA' },
  bundesliga:   { slug: 'bundesliga',  name: 'Bundesliga',        country: 'Alemania',       espnPath: 'ger.1',                  accent: 'from-red-500 to-amber-500',    iconBg: 'bg-red-500',     shortName: 'BUNDES' },
  ligue1:       { slug: 'ligue1',      name: 'Ligue 1',           country: 'Francia',        espnPath: 'fra.1',                  accent: 'from-sky-600 to-blue-700',     iconBg: 'bg-sky-600',     shortName: 'LIGUE 1' },
  champions:    { slug: 'champions',   name: 'Champions League',  country: 'UEFA',           espnPath: 'uefa.champions',         accent: 'from-blue-700 to-indigo-800',  iconBg: 'bg-blue-700',    shortName: 'UCL' },
  libertadores: { slug: 'libertadores',name: 'Copa Libertadores', country: 'CONMEBOL',       espnPath: 'conmebol.libertadores',  accent: 'from-yellow-500 to-amber-600', iconBg: 'bg-yellow-500',  shortName: 'LIBERTADORES' },
  ligamx:       { slug: 'ligamx',      name: 'Liga MX',           country: 'México',         espnPath: 'mex.1',                  accent: 'from-green-600 to-lime-600',   iconBg: 'bg-green-600',   shortName: 'LIGA MX' },
  mls:          { slug: 'mls',         name: 'MLS',               country: 'Estados Unidos', espnPath: 'usa.1',                  accent: 'from-rose-600 to-pink-700',    iconBg: 'bg-rose-600',    shortName: 'MLS' },
};

export const LEAGUE_LIST: League[] = Object.values(LEAGUES);

export function getLeague(slug: string | undefined): League | undefined {
  return slug ? LEAGUES[slug] : undefined;
}

export function leagueHttpParams(leagueSlug: string, extra?: Record<string, string>): HttpParams {
  let params = new HttpParams().set('league', leagueSlug);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params = params.set(k, v);
  }
  return params;
}