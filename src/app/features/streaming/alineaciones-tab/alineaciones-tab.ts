import { Component, computed, input, signal } from '@angular/core';
import { MatchLineup, LineupPlayer } from '../../../core/models/live-data-model';
import { filterStarters, filterSubstitutes, sortByPosition, translatePosition, getPositionCategory, getLateralOrder, getDepthOrder } from '../../../shared/utils/player-util';

type LineupTab = 'cancha' | 'titulares' | 'suplentes';

interface PositionRow {
  players: LineupPlayer[];
}

@Component({
  selector: 'app-alineaciones-tab',
  standalone: true,
  template: `
    @if (lineups().length > 0) {
      <!-- Sub-tabs -->
      <div class="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          (click)="activeTab.set('cancha')"
          [class]="activeTab() === 'cancha'
            ? 'px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
            : 'px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-700'"
        >
          Cancha
        </button>
        <button
          (click)="activeTab.set('titulares')"
          [class]="activeTab() === 'titulares'
            ? 'px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
            : 'px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-700'"
        >
          Titulares
        </button>
        <button
          (click)="activeTab.set('suplentes')"
          [class]="activeTab() === 'suplentes'
            ? 'px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
            : 'px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-700'"
        >
          Suplentes
        </button>
      </div>

      @if (activeTab() === 'cancha') {
        <!-- Formaciones header -->
        <div class="grid grid-cols-2 gap-2 mb-3">
          @for (lineup of lineups(); track lineup.team) {
            <div class="flex flex-col items-center">
              <span class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {{ lineup.team_name }}
              </span>
              @if (lineup.formation) {
                <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ lineup.formation }}</span>
              }
            </div>
          }
        </div>

        <!-- Cancha centrada -->
        <div class="mx-auto w-full max-w-lg">
          <div class="relative w-full rounded-lg overflow-hidden" style="aspect-ratio: 5/7; background: linear-gradient(180deg, #1a6b35 0%, #1f7a3e 10%, #1a6b35 10%, #1a6b35 20%, #1f7a3e 20%, #1f7a3e 30%, #1a6b35 30%, #1a6b35 40%, #1f7a3e 40%, #1f7a3e 50%, #1a6b35 50%, #1a6b35 60%, #1f7a3e 60%, #1f7a3e 70%, #1a6b35 70%, #1a6b35 80%, #1f7a3e 80%, #1f7a3e 90%, #1a6b35 90%);">
            <div class="absolute inset-1.5 border border-white/40 rounded-sm"></div>
            <div class="absolute left-1.5 right-1.5 top-1/2 h-px bg-white/40"></div>
            <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-white/40 rounded-full"></div>
            <div class="absolute top-1.5 left-1/2 -translate-x-1/2 w-[45%] h-[9%] border border-white/30 border-t-0"></div>
            <div class="absolute top-1.5 left-1/2 -translate-x-1/2 w-[20%] h-[3.5%] border border-white/30 border-t-0"></div>
            <div class="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[45%] h-[9%] border border-white/30 border-b-0"></div>
            <div class="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[20%] h-[3.5%] border border-white/30 border-b-0"></div>

            @if (homeRows().length > 0) {
              <div class="absolute top-[3%] left-0 right-0 bottom-[51%] flex flex-col justify-around px-1 sm:px-4">
                @for (row of homeRows(); track $index) {
                  <div class="flex justify-around items-start">
                    @for (player of row.players; track player.number) {
                      <div class="flex flex-col items-center min-w-0 flex-1 max-w-[70px]">
                        <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/95 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-gray-800 shadow-md">
                          {{ player.number }}
                        </div>
                        <span class="text-[10px] sm:text-[11px] text-white font-semibold text-center leading-tight truncate w-full drop-shadow-md mt-0.5">
                          {{ shortName(player.name) }}
                        </span>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            @if (awayRows().length > 0) {
              <div class="absolute top-[51%] left-0 right-0 bottom-[3%] flex flex-col justify-around px-1 sm:px-4">
                @for (row of awayRows(); track $index) {
                  <div class="flex justify-around items-start">
                    @for (player of row.players; track player.number) {
                      <div class="flex flex-col items-center min-w-0 flex-1 max-w-[70px]">
                        <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-yellow-300/95 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-gray-800 shadow-md">
                          {{ player.number }}
                        </div>
                        <span class="text-[10px] sm:text-[11px] text-white font-semibold text-center leading-tight truncate w-full drop-shadow-md mt-0.5">
                          {{ shortName(player.name) }}
                        </span>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      } @else if (activeTab() === 'titulares') {
        <!-- Titulares en lista -->
        <div class="grid grid-cols-2 gap-6">
          @for (lineup of startersLineups(); track lineup.team) {
            <div>
              <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                {{ lineup.team === 'home' ? 'Local' : 'Visitante' }}
              </h4>
              @if (lineup.players.length > 0) {
                <ul class="space-y-1">
                  @for (player of lineup.players; track player.number) {
                    <li class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 py-0.5">
                      <span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {{ player.number }}
                      </span>
                      <span class="font-medium truncate flex-1">{{ player.name }}</span>
                      @if (player.position) {
                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                          [class]="getPositionClass(player.position)">
                          {{ translatePosition(player.position) }}
                        </span>
                      }
                    </li>
                  }
                </ul>
              } @else {
                <p class="text-xs text-gray-400 py-4 text-center">No disponible</p>
              }
            </div>
          }
        </div>
      } @else {
        <!-- Suplentes en lista -->
        <div class="grid grid-cols-2 gap-6">
          @for (lineup of substitutesLineups(); track lineup.team) {
            <div>
              <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                {{ lineup.team === 'home' ? 'Local' : 'Visitante' }}
              </h4>
              @if (lineup.players.length > 0) {
                <ul class="space-y-1">
                  @for (player of lineup.players; track player.number) {
                    <li class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 py-0.5">
                      <span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {{ player.number }}
                      </span>
                      <span class="font-medium truncate flex-1">{{ player.name }}</span>
                      @if (player.position) {
                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                          [class]="getPositionClass(player.position)">
                          {{ translatePosition(player.position) }}
                        </span>
                      }
                    </li>
                  }
                </ul>
              } @else {
                <p class="text-xs text-gray-400 py-4 text-center">No disponible</p>
              }
            </div>
          }
        </div>
      }
    } @else {
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">Alineaciones no disponibles aún</p>
      </div>
    }
  `,
})
export class AlineacionesTabComponent {
  lineups = input<MatchLineup[]>([]);
  activeTab = signal<LineupTab>('cancha');

  readonly homeRows = computed(() => {
    const home = this.lineups().find(l => l.team === 'home');
    if (!home) return [];
    return this.buildFormationRows(home);
  });

  readonly awayRows = computed(() => {
    const away = this.lineups().find(l => l.team === 'away');
    if (!away) return [];
    // Invertir filas (portero abajo, delanteros arriba), lateral se mantiene igual
    return this.buildFormationRows(away).reverse();
  });

  readonly startersLineups = computed(() => {
    return this.lineups().map(lineup => ({
      ...lineup,
      players: sortByPosition(filterStarters(lineup.players)),
    }));
  });

  readonly substitutesLineups = computed(() => {
    return this.lineups().map(lineup => ({
      ...lineup,
      players: sortByPosition(filterSubstitutes(lineup.players)),
    }));
  });

  translatePosition = translatePosition;

  shortName(fullName: string): string {
    const parts = fullName.split(' ');
    if (parts.length <= 1) return fullName;
    return parts[parts.length - 1];
  }

  /** Más jugadores en fila = menos gap para que se distribuyan bien */
  getRowGap(playerCount: number): number {
    if (playerCount <= 2) return 24;
    if (playerCount <= 3) return 16;
    if (playerCount <= 4) return 10;
    return 6;
  }

  getPositionClass(position: string): string {
    const pos = translatePosition(position);
    switch (pos) {
      case 'POR': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'DEF': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'MED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'DEL': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  }

  private buildFormationRows(lineup: MatchLineup): PositionRow[] {
    const starters = filterStarters(lineup.players);
    const formation = lineup.formation;

    if (!formation || starters.length === 0) {
      return this.buildRowsByPosition(starters);
    }

    const lines = formation.split('-').map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n > 0);
    if (lines.length === 0) return this.buildRowsByPosition(starters);

    const gk = starters.filter(p => getPositionCategory(p.position) === 0);
    const def = this.sortLateral(starters.filter(p => getPositionCategory(p.position) === 1));
    const mid = this.sortLateral(starters.filter(p => getPositionCategory(p.position) === 2));
    const fwd = this.sortLateral(starters.filter(p => getPositionCategory(p.position) === 3));
    const unknown = starters.filter(p => getPositionCategory(p.position) === 4);
    const outfield = [...def, ...mid, ...fwd, ...unknown];

    const rows: PositionRow[] = [];
    if (gk.length > 0) rows.push({ players: gk });

    let idx = 0;
    for (const count of lines) {
      const rowPlayers = outfield.slice(idx, idx + count);
      if (rowPlayers.length > 0) {
        // Re-ordenar cada fila lateralmente (izq → centro → der) para la visualización
        const sorted = [...rowPlayers].sort((a, b) => getLateralOrder(a.position) - getLateralOrder(b.position));
        rows.push({ players: sorted });
      }
      idx += count;
    }

    if (idx < outfield.length) rows.push({ players: outfield.slice(idx) });
    return rows;
  }

  private sortLateral(players: LineupPlayer[]): LineupPlayer[] {
    return [...players].sort((a, b) => {
      const depthA = getDepthOrder(a.position);
      const depthB = getDepthOrder(b.position);
      if (depthA !== depthB) return depthA - depthB;
      return getLateralOrder(a.position) - getLateralOrder(b.position);
    });
  }

  private buildRowsByPosition(starters: LineupPlayer[]): PositionRow[] {
    const gk = starters.filter(p => getPositionCategory(p.position) === 0);
    const def = this.sortLateral(starters.filter(p => getPositionCategory(p.position) === 1));
    const mid = this.sortLateral(starters.filter(p => getPositionCategory(p.position) === 2));
    const fwd = this.sortLateral(starters.filter(p => getPositionCategory(p.position) === 3));

    const rows: PositionRow[] = [];
    if (gk.length > 0) rows.push({ players: gk });
    if (def.length > 0) rows.push({ players: def });
    if (mid.length > 0) rows.push({ players: mid });
    if (fwd.length > 0) rows.push({ players: fwd });
    return rows;
  }
}
