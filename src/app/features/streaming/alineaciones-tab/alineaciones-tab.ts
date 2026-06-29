import { Component, computed, input, signal } from '@angular/core';
import { MatchLineup, LineupPlayer } from '../../../core/models/live-data-model';
import { filterStarters, filterSubstitutes, sortByPosition, translatePosition } from '../../../shared/utils/player-util';

type LineupTab = 'cancha' | 'suplentes';

interface PositionRow {
  players: LineupPlayer[];
}

@Component({
  selector: 'app-alineaciones-tab',
  standalone: true,
  template: `
    @if (lineups().length > 0) {
      <!-- Sub-tabs: Cancha / Suplentes -->
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
          (click)="activeTab.set('suplentes')"
          [class]="activeTab() === 'suplentes'
            ? 'px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
            : 'px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-700'"
        >
          Suplentes
        </button>
      </div>

      @if (activeTab() === 'cancha') {
        <!-- Vista de cancha con suplentes a los lados -->
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

        <!-- Mobile: solo cancha centrada -->
        <div class="block md:hidden">
          <div class="mx-auto w-full max-w-xs">
            <div class="relative w-full rounded-lg overflow-hidden" style="aspect-ratio: 3/4; background: linear-gradient(180deg, #1a6b35 0%, #1f7a3e 10%, #1a6b35 10%, #1a6b35 20%, #1f7a3e 20%, #1f7a3e 30%, #1a6b35 30%, #1a6b35 40%, #1f7a3e 40%, #1f7a3e 50%, #1a6b35 50%, #1a6b35 60%, #1f7a3e 60%, #1f7a3e 70%, #1a6b35 70%, #1a6b35 80%, #1f7a3e 80%, #1f7a3e 90%, #1a6b35 90%);">
              <div class="absolute inset-1 border border-white/40 rounded-sm"></div>
              <div class="absolute left-1 right-1 top-1/2 h-px bg-white/40"></div>
              <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/40 rounded-full"></div>
              <div class="absolute top-1 left-1/2 -translate-x-1/2 w-[50%] h-[12%] border border-white/30 border-t-0"></div>
              <div class="absolute top-1 left-1/2 -translate-x-1/2 w-[22%] h-[5%] border border-white/30 border-t-0"></div>
              <div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-[50%] h-[12%] border border-white/30 border-b-0"></div>
              <div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-[22%] h-[5%] border border-white/30 border-b-0"></div>

              @if (homeRows().length > 0) {
                <div class="absolute top-[3%] left-0 right-0 bottom-[51%] flex flex-col justify-around px-1">
                  @for (row of homeRows(); track $index) {
                    <div class="flex justify-center gap-0.5">
                      @for (player of row.players; track player.number) {
                        <div class="flex flex-col items-center w-7">
                          <div class="rounded-full bg-white/90 flex items-center justify-center text-[7px] font-bold text-gray-800 shadow-sm" style="width:18px;height:18px;">
                            {{ player.number }}
                          </div>
                          <span class="text-[6px] text-white font-medium text-center leading-none truncate w-full drop-shadow-sm mt-px">
                            {{ shortName(player.name) }}
                          </span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              @if (awayRows().length > 0) {
                <div class="absolute top-[51%] left-0 right-0 bottom-[3%] flex flex-col justify-around px-1">
                  @for (row of awayRows(); track $index) {
                    <div class="flex justify-center gap-0.5">
                      @for (player of row.players; track player.number) {
                        <div class="flex flex-col items-center w-7">
                          <div class="rounded-full bg-yellow-300/90 flex items-center justify-center text-[7px] font-bold text-gray-800 shadow-sm" style="width:18px;height:18px;">
                            {{ player.number }}
                          </div>
                          <span class="text-[6px] text-white font-medium text-center leading-none truncate w-full drop-shadow-sm mt-px">
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
        </div>

        <!-- Desktop: cancha con suplentes a los lados -->
        <div class="hidden md:flex gap-3 items-start">
          <!-- Suplentes Local (izquierda) -->
          <div class="flex-1 min-w-0">
            @if (homeSubstitutes().length > 0) {
              <h5 class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 text-center">Suplentes</h5>
              <ul class="space-y-0.5">
                @for (player of homeSubstitutes(); track player.number) {
                  <li class="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <span class="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                      {{ player.number }}
                    </span>
                    <span class="truncate text-[11px]">{{ player.name }}</span>
                  </li>
                }
              </ul>
            }
          </div>

          <!-- Cancha (centro) -->
          <div class="w-64 shrink-0">
            <div class="relative w-full rounded-lg overflow-hidden" style="aspect-ratio: 3/4; background: linear-gradient(180deg, #1a6b35 0%, #1f7a3e 10%, #1a6b35 10%, #1a6b35 20%, #1f7a3e 20%, #1f7a3e 30%, #1a6b35 30%, #1a6b35 40%, #1f7a3e 40%, #1f7a3e 50%, #1a6b35 50%, #1a6b35 60%, #1f7a3e 60%, #1f7a3e 70%, #1a6b35 70%, #1a6b35 80%, #1f7a3e 80%, #1f7a3e 90%, #1a6b35 90%);">
              <div class="absolute inset-1 border border-white/40 rounded-sm"></div>
              <div class="absolute left-1 right-1 top-1/2 h-px bg-white/40"></div>
              <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/40 rounded-full"></div>
              <div class="absolute top-1 left-1/2 -translate-x-1/2 w-[50%] h-[12%] border border-white/30 border-t-0"></div>
              <div class="absolute top-1 left-1/2 -translate-x-1/2 w-[22%] h-[5%] border border-white/30 border-t-0"></div>
              <div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-[50%] h-[12%] border border-white/30 border-b-0"></div>
              <div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-[22%] h-[5%] border border-white/30 border-b-0"></div>

              @if (homeRows().length > 0) {
                <div class="absolute top-[3%] left-0 right-0 bottom-[51%] flex flex-col justify-around px-1">
                  @for (row of homeRows(); track $index) {
                    <div class="flex justify-center gap-0.5">
                      @for (player of row.players; track player.number) {
                        <div class="flex flex-col items-center w-6">
                          <div class="rounded-full bg-white/90 flex items-center justify-center text-[7px] font-bold text-gray-800 shadow-sm" style="width:18px;height:18px;">
                            {{ player.number }}
                          </div>
                          <span class="text-[6px] text-white font-medium text-center leading-none truncate w-full drop-shadow-sm mt-px">
                            {{ shortName(player.name) }}
                          </span>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              @if (awayRows().length > 0) {
                <div class="absolute top-[51%] left-0 right-0 bottom-[3%] flex flex-col justify-around px-1">
                  @for (row of awayRows(); track $index) {
                    <div class="flex justify-center gap-0.5">
                      @for (player of row.players; track player.number) {
                        <div class="flex flex-col items-center w-6">
                          <div class="rounded-full bg-yellow-300/90 flex items-center justify-center text-[7px] font-bold text-gray-800 shadow-sm" style="width:18px;height:18px;">
                            {{ player.number }}
                          </div>
                          <span class="text-[6px] text-white font-medium text-center leading-none truncate w-full drop-shadow-sm mt-px">
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

          <!-- Suplentes Visitante (derecha) -->
          <div class="flex-1 min-w-0">
            @if (awaySubstitutes().length > 0) {
              <h5 class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 text-center">Suplentes</h5>
              <ul class="space-y-0.5">
                @for (player of awaySubstitutes(); track player.number) {
                  <li class="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                    <span class="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                      {{ player.number }}
                    </span>
                    <span class="truncate text-[11px]">{{ player.name }}</span>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      } @else {
        <!-- Suplentes -->
        <div class="grid grid-cols-2 gap-6">
          @for (lineup of substitutesLineups(); track lineup.team) {
            <div>
              <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                {{ lineup.team_name }}
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
    // Away se invierte para que el equipo mire hacia arriba
    return this.buildFormationRows(away).reverse();
  });

  readonly homeSubstitutes = computed(() => {
    const home = this.lineups().find(l => l.team === 'home');
    if (!home) return [];
    return sortByPosition(filterSubstitutes(home.players));
  });

  readonly awaySubstitutes = computed(() => {
    const away = this.lineups().find(l => l.team === 'away');
    if (!away) return [];
    return sortByPosition(filterSubstitutes(away.players));
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
    // Apellido o último nombre
    return parts[parts.length - 1];
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

  /**
   * Convierte la formación (ej: "4-3-3") y los titulares en filas para la cancha.
   * Cada fila es un grupo de jugadores en esa línea.
   */
  private buildFormationRows(lineup: MatchLineup): PositionRow[] {
    const starters = filterStarters(lineup.players);
    const formation = lineup.formation;

    if (!formation || starters.length === 0) {
      // Fallback: agrupar por posición
      return this.buildRowsByPosition(starters);
    }

    // Parsear formación: "4-3-3" → [4, 3, 3]
    const lines = formation.split('-').map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n > 0);
    if (lines.length === 0) return this.buildRowsByPosition(starters);

    // Separar portero
    const gk = starters.filter(p => this.isGoalkeeper(p));
    const outfield = starters.filter(p => !this.isGoalkeeper(p));

    const rows: PositionRow[] = [];

    // Portero siempre primera fila
    if (gk.length > 0) {
      rows.push({ players: gk });
    }

    // Distribuir jugadores de campo según la formación
    let idx = 0;
    for (const count of lines) {
      const rowPlayers = outfield.slice(idx, idx + count);
      if (rowPlayers.length > 0) {
        rows.push({ players: rowPlayers });
      }
      idx += count;
    }

    // Si sobran jugadores (formación no cuadra), agregar al final
    if (idx < outfield.length) {
      rows.push({ players: outfield.slice(idx) });
    }

    return rows;
  }

  private buildRowsByPosition(starters: LineupPlayer[]): PositionRow[] {
    const gk = starters.filter(p => this.isGoalkeeper(p));
    const def = starters.filter(p => this.isDefender(p));
    const mid = starters.filter(p => this.isMidfielder(p));
    const fwd = starters.filter(p => this.isForward(p));

    const rows: PositionRow[] = [];
    if (gk.length > 0) rows.push({ players: gk });
    if (def.length > 0) rows.push({ players: def });
    if (mid.length > 0) rows.push({ players: mid });
    if (fwd.length > 0) rows.push({ players: fwd });
    return rows;
  }

  private isGoalkeeper(p: LineupPlayer): boolean {
    const pos = p.position.toLowerCase();
    return pos === 'goalkeeper' || pos === 'gk' || pos === 'g' || pos === 'portero';
  }

  private isDefender(p: LineupPlayer): boolean {
    const pos = p.position.toLowerCase();
    return pos === 'defender' || pos === 'def' || pos === 'd' || pos === 'defensa';
  }

  private isMidfielder(p: LineupPlayer): boolean {
    const pos = p.position.toLowerCase();
    return pos === 'midfielder' || pos === 'mid' || pos === 'm' || pos === 'medio' || pos === 'centrocampista';
  }

  private isForward(p: LineupPlayer): boolean {
    const pos = p.position.toLowerCase();
    return pos === 'forward' || pos === 'fwd' || pos === 'f' || pos === 'delantero' || pos === 'attacker' || pos === 'att';
  }
}
