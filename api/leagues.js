/**
 * Catálogo de ligas soportadas. La fuente única para backend (api/*.js) y frontend
 * (src/app/shared/constants/leagues.ts) — se mantiene duplicado a propósito:
 * las funciones serverless de Vercel no pueden importar módulos fuera de /api.
 *
 * `espnPath` se inserta en `sports/soccer/<espnPath>/...` para hits a ESPN.
 *
 * Reglas:
 *   - `slug` es la clave de URL (`/ligas/<slug>`) y de query (`?league=<slug>`).
 *   - `default` = `fifa.world` no aparece: la home-view sigue llamándolo sin `league`,
 *     lo que el backend resuelve al mundial. Sin entrada, no hay riesgo de colisión.
 *   - Las copas (`uefa.champions`, `libertadores`) NO tienen standings por grupo — el
 *     frontend debe ocultarlo o mostrar fallback cuando la respuesta llegue vacía.
 */

module.exports = {
  LEAGUES: {
    'premier':       { name: 'Premier League',       country: 'Inglaterra',  espnPath: 'eng.1',           accent: 'from-purple-600 to-indigo-600',   iconBg: 'bg-purple-600',   shortName: 'PREMIER' },
    'laliga':        { name: 'La Liga',              country: 'España',      espnPath: 'esp.1',           accent: 'from-red-600 to-orange-600',     iconBg: 'bg-red-600',      shortName: 'LALIGA' },
    'bundesliga':    { name: 'Bundesliga',           country: 'Alemania',    espnPath: 'ger.1',           accent: 'from-red-500 to-amber-500',      iconBg: 'bg-red-500',      shortName: 'BUNDES' },
    'ligue1':        { name: 'Ligue 1',              country: 'Francia',     espnPath: 'fra.1',           accent: 'from-sky-600 to-blue-700',       iconBg: 'bg-sky-600',      shortName: 'LIGUE 1' },
    'champions':     { name: 'Champions League',     country: 'UEFA',        espnPath: 'uefa.champions',  accent: 'from-blue-700 to-indigo-800',    iconBg: 'bg-blue-700',     shortName: 'UCL' },
    'libertadores':  { name: 'Copa Libertadores',    country: 'CONMEBOL',    espnPath: 'conmebol.libertadores', accent: 'from-yellow-500 to-amber-600', iconBg: 'bg-yellow-500', shortName: 'LIBERTADORES' },
    'ligamx':        { name: 'Liga MX',              country: 'México',      espnPath: 'mex.1',           accent: 'from-green-600 to-lime-600',     iconBg: 'bg-green-600',    shortName: 'LIGA MX' },
    'mls':           { name: 'MLS',                  country: 'Estados Unidos', espnPath: 'usa.1',        accent: 'from-rose-600 to-pink-700',      iconBg: 'bg-rose-600',     shortName: 'MLS' },
  },

  /** Slug por defecto cuando el cliente no manda `league` (compatibilidad con home-view). */
  DEFAULT_SLUG: 'worldcup',
  DEFAULT_PATH: 'fifa.world',

  /** Resuelve el path ESPN a partir del slug, o devuelve el default (mundial). */
  resolvePath(slug) {
    if (!slug) return module.exports.DEFAULT_PATH;
    const league = module.exports.LEAGUES[slug];
    return league ? league.espnPath : module.exports.DEFAULT_PATH;
  },

  /** Resuelve el nombre legible, útil para etiquetar `competition` en matches. */
  resolveName(slug) {
    if (!slug) return 'FIFA World Cup 2026';
    const league = module.exports.LEAGUES[slug];
    return league ? league.name : 'FIFA World Cup 2026';
  },

  /** Lista de ligas en el orden que debe mostrarlas el landing del frontend. */
  list() {
    return Object.entries(module.exports.LEAGUES).map(([slug, data]) => ({ slug, ...data }));
  },
};