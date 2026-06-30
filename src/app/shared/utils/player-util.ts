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

/** Orden de posiciones: Portero → Defensa → Medio → Delantero */
const POSITION_ORDER: Record<string, number> = {
  // Portero
  goalkeeper: 0, gk: 0, portero: 0, g: 0,
  // Defensas (centrales y laterales)
  defender: 1, def: 1, defensa: 1, d: 1,
  cb: 1, rb: 1, lb: 1, rwb: 1, lwb: 1, sw: 1,
  // Mediocampistas (centrales, ofensivos, defensivos, laterales)
  midfielder: 2, mid: 2, medio: 2, m: 2, centrocampista: 2,
  cm: 2, cdm: 2, cam: 2, rm: 2, lm: 2, dm: 2, am: 2,
  // Delanteros (extremos, centrodelanteros, mediapunta ofensivo)
  forward: 3, fwd: 3, delantero: 3, f: 3, attacker: 3, att: 3,
  rw: 3, lw: 3, cf: 3, st: 3, ss: 3, lf: 3, rf: 3,
};

function getPositionOrder(position: string): number {
  return POSITION_ORDER[position.toLowerCase()] ?? 4;
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
  const key = position.toLowerCase();
  // Portero
  if (key === 'goalkeeper' || key === 'gk' || key === 'g' || key === 'portero') return 'POR';
  // Defensas (centrales y laterales)
  if (key === 'defender' || key === 'def' || key === 'd' || key === 'defensa' ||
      key === 'cb' || key === 'rb' || key === 'lb' || key === 'rwb' || key === 'lwb' || key === 'sw') return 'DEF';
  // Mediocampistas
  if (key === 'midfielder' || key === 'mid' || key === 'm' || key === 'medio' || key === 'centrocampista' ||
      key === 'cm' || key === 'cdm' || key === 'cam' || key === 'rm' || key === 'lm' || key === 'dm' || key === 'am') return 'MED';
  // Delanteros
  if (key === 'forward' || key === 'fwd' || key === 'f' || key === 'delantero' || key === 'attacker' || key === 'att' ||
      key === 'rw' || key === 'lw' || key === 'cf' || key === 'st' || key === 'ss' || key === 'lf' || key === 'rf') return 'DEL';
  return position.slice(0, 3).toUpperCase();
}
