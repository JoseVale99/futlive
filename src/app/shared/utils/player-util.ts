import { LineupPlayer } from '../../core/models/live-data-model';

/**
 * Trunca el nombre del jugador si excede maxLength.
 * Agrega "…" al final si se trunca.
 */
export function truncatePlayerName(name: string, maxLength = 25): string {
  if (name.length > maxLength) {
    return name.slice(0, maxLength) + '…';
  }
  return name;
}

/**
 * Filtra solo jugadores titulares (is_starter === true).
 */
export function filterStarters(players: LineupPlayer[]): LineupPlayer[] {
  return players.filter((player) => player.is_starter === true);
}

/**
 * Filtra solo jugadores suplentes (is_starter === false).
 */
export function filterSubstitutes(players: LineupPlayer[]): LineupPlayer[] {
  return players.filter((player) => player.is_starter === false);
}

/**
 * Ordena jugadores por número de camiseta ascendente.
 * Retorna un nuevo array sin mutar el original.
 */
export function sortByJerseyNumber(players: LineupPlayer[]): LineupPlayer[] {
  return [...players].sort((a, b) => a.number - b.number);
}

// ─── Clasificación de posiciones ESPN ────────────────────────────────────────
// ESPN puede devolver abreviaturas como: G, GK, D, CB, RB, LB, RCB, LCB, RWB, LWB,
// M, CM, CDM, CAM, RM, LM, DM, AM, RCM, LCM, RAM, LAM, RDM, LDM,
// F, FW, CF, ST, RW, LW, RF, LF, SS, ATT, etc.
// También con sufijos como "-A", "-D", "-R", "-L" (e.g. "CM-A", "CD-R").

/**
 * Normaliza la posición: lowercase, quita sufijos con guión.
 */
function normalizePosition(position: string): string {
  return position.toLowerCase().split('-')[0].trim();
}

/** Categorías: 0=Portero, 1=Defensa, 2=Mediocampista, 3=Delantero */
export type PositionCategory = 0 | 1 | 2 | 3 | 4;

/**
 * Determina la categoría posicional de un jugador.
 * Usa lógica de patrones para cubrir cualquier abreviatura ESPN presente o futura.
 */
export function getPositionCategory(position: string): PositionCategory {
  const pos = normalizePosition(position);

  // Portero: G, GK, goalkeeper, portero
  if (pos === 'g' || pos === 'gk' || pos === 'goalkeeper' || pos === 'portero') return 0;

  // Defensa: cualquier cosa con B (back) o que sea D/CB/SW/defender/defensa
  // Patrón: contiene 'b' al final (rb, lb, cb, rwb, lwb, rcb, lcb) o es 'd', 'def', 'sw', 'cd'
  if (pos === 'd' || pos === 'def' || pos === 'defender' || pos === 'defensa' || pos === 'sw' || pos === 'cd') return 1;
  if (/(?:^[lr]?c?[rl]?(?:w?b)$)/.test(pos)) return 1; // rb, lb, cb, rwb, lwb, rcb, lcb, wb

  // Delantero: cualquier cosa con W (wing), F (forward), ST, SS, ATT
  // Debe ir ANTES de mediocampista porque LW/RW contienen letras que podrían confundirse
  if (pos === 'f' || pos === 'fw' || pos === 'fwd' || pos === 'forward' || pos === 'delantero' ||
      pos === 'att' || pos === 'attacker' || pos === 'st' || pos === 'ss' || pos === 'cf') return 3;
  if (/(?:^[lr]?[crl]?(?:w|f|st|ss)$)/.test(pos)) return 3; // rw, lw, rf, lf, rcf, lcf

  // Mediocampista: cualquier cosa con M (midfielder), DM, AM, CAM, CDM
  if (pos === 'm' || pos === 'mid' || pos === 'midfielder' || pos === 'medio' || pos === 'centrocampista') return 2;
  if (/m/.test(pos)) return 2; // cm, cdm, cam, rm, lm, dm, am, rcm, lcm, ram, lam, rdm, ldm

  return 4; // desconocido
}

/**
 * Determina el orden lateral de un jugador (izquierda → centro → derecha).
 * 0=izquierda, 1=centro-izquierda, 2=centro, 3=centro-derecha, 4=derecha.
 */
export function getLateralOrder(position: string): number {
  const pos = normalizePosition(position);

  // Comienza con L → izquierda
  if (pos.startsWith('l')) return 0;
  // Comienza con R → derecha
  if (pos.startsWith('r')) return 4;
  // Todo lo demás → centro
  return 2;
}

function getPositionOrder(position: string): number {
  return getPositionCategory(position);
}

/**
 * Ordena jugadores por posición: GK → DEF → MID → FWD.
 * Dentro de cada posición, por número de camiseta.
 */
export function sortByPosition(players: LineupPlayer[]): LineupPlayer[] {
  return [...players].sort((a, b) => {
    const posA = getPositionOrder(a.position);
    const posB = getPositionOrder(b.position);
    if (posA !== posB) return posA - posB;
    return a.number - b.number;
  });
}

/**
 * Traduce la posición a español abreviado.
 */
export function translatePosition(position: string): string {
  const cat = getPositionCategory(position);
  switch (cat) {
    case 0: return 'POR';
    case 1: return 'DEF';
    case 2: return 'MED';
    case 3: return 'DEL';
    default: return normalizePosition(position).slice(0, 3).toUpperCase();
  }
}
