import { Component, computed, input, signal } from '@angular/core';
import { MatchLineup } from '../../../core/models/live-data-model';
import { filterStarters, filterSubstitutes, sortByPosition, translatePosition } from '../../../shared/utils/player-util';

type LineupTab = 'titulares' | 'suplentes';

@Component({
  selector: 'app-alineaciones-tab',
  standalone: true,
  template: `
    @if (lineups().length > 0) {
      <!-- Sub-tabs: Titulares / Suplentes -->
      <div class="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
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

      <div class="grid grid-cols-2 gap-6">
        @for (lineup of currentLineups(); track lineup.team) {
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
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">Alineaciones no disponibles aún</p>
      </div>
    }
  `,
})
export class AlineacionesTabComponent {
  lineups = input<MatchLineup[]>([]);
  activeTab = signal<LineupTab>('titulares');

  readonly currentLineups = computed(() => {
    if (this.activeTab() === 'titulares') {
      return this.lineups().map((lineup) => ({
        ...lineup,
        players: sortByPosition(filterStarters(lineup.players)),
      }));
    } else {
      return this.lineups().map((lineup) => ({
        ...lineup,
        players: sortByPosition(filterSubstitutes(lineup.players)),
      }));
    }
  });

  translatePosition = translatePosition;

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
}
