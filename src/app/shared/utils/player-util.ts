import { LineupPlayer } from '../../core/models/live-data-model';

// ─── Position Intelligence ───────────────────────────────────────────────────
// ESPN position abbreviations follow a pattern: [Lateral][Core][Suffix]
// Lateral: L (left), R (right), C (center) or none
// Core: B (back), M (mid), W (wing), F (forward), etc.
// Suffix: sometimes -L, -R, -A, -D after a hyphen (ignored)

/** Category constants */
export type PositionCategory = 0 | 1 | 2 | 3 | 4;
const GK = 0 as const;
const DEF = 1 as const;
const MID = 2 as const;
const FWD = 3 as const;
const UNKNOWN = 4 as const;

/** Core token → category mapping */
const CORE_CATEGORY: Record<string, PositionCategory> = {
  // Goalkeeper
  g: GK, gk: GK, goalkeeper: GK, portero: GK,
  // Defense cores
  b: DEF, cb: DEF, wb: DEF, d: DEF, cd: DEF, sw: DEF,
  def: DEF, defender: DEF, defensa: DEF,
  // Midfield cores
  m: MID, cm: MID, dm: MID, am: MID, cdm: MID, cam: MID,
  mid: MID, midfielder: MID, medio: MID, centrocampista: MID,
  // Forward cores
  w: FWD, f: FWD, fw: FWD, cf: FWD, st: FWD, ss: FWD,
  fwd: FWD, forward: FWD, delantero: FWD, att: FWD, attacker: FWD,
};

/** Depth within category (defensive → offensive) */
const DEPTH: Record<string, number> = {
  // Defense depth
  cb: 0, cd: 0, sw: 0, d: 0, b: 1, wb: 1,
  // Midfield depth
  dm: 0, cdm: 0, cm: 1, m: 1, cam: 2, am: 2, lm: 2, rm: 2,
  // Forward depth
  cf: 0, st: 0, ss: 0, w: 1, f: 1, fw: 1,
};

// ─── Core utilities ──────────────────────────────────────────────────────────

/** Normalize: lowercase + strip hyphen suffix */
function normalize(position: string): string {
  return position.toLowerCase().split('-')[0].trim();
}

/** Strip lateral prefix (l/r) to get the positional core */
function extractCore(pos: string): string {
  return pos.replace(/^[lr](?=[a-z])/, '');
}

// ─── Exported functions ──────────────────────────────────────────────────────

export function getPositionCategory(position: string): PositionCategory {
  const pos = normalize(position);
  // Try full match first, then try without lateral prefix
  return CORE_CATEGORY[pos] ?? CORE_CATEGORY[extractCore(pos)] ?? UNKNOWN;
}

export function getDepthOrder(position: string): number {
  const pos = normalize(position);
  const core = extractCore(pos);
  // Buscar primero por posición completa (lm, rm), luego por core (dm, cm)
  return DEPTH[pos] ?? DEPTH[core] ?? 1;
}

export function getLateralOrder(position: string): number {
  const pos = normalize(position);
  if (pos.startsWith('l')) return 0;
  if (pos.startsWith('r')) return 4;
  return 2;
}

// ─── Player list operations ──────────────────────────────────────────────────

export function truncatePlayerName(name: string, maxLength = 25): string {
  return name.length > maxLength ? name.slice(0, maxLength) + '…' : name;
}

export function filterStarters(players: LineupPlayer[]): LineupPlayer[] {
  return players.filter(p => p.is_starter === true);
}

export function filterSubstitutes(players: LineupPlayer[]): LineupPlayer[] {
  return players.filter(p => p.is_starter === false);
}

export function sortByJerseyNumber(players: LineupPlayer[]): LineupPlayer[] {
  return [...players].sort((a, b) => a.number - b.number);
}

export function sortByPosition(players: LineupPlayer[]): LineupPlayer[] {
  return [...players].sort((a, b) => {
    const catDiff = getPositionCategory(a.position) - getPositionCategory(b.position);
    return catDiff !== 0 ? catDiff : a.number - b.number;
  });
}

export function translatePosition(position: string): string {
  const labels: Record<PositionCategory, string> = { 0: 'POR', 1: 'DEF', 2: 'MED', 3: 'DEL', 4: normalize(position).slice(0, 3).toUpperCase() };
  return labels[getPositionCategory(position)];
}
