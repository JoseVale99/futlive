import { Component, computed, input } from '@angular/core';
import { MatchLineup } from '../../../core/models/live-data-model';
import { filterStarters, sortByJerseyNumber } from '../../../shared/utils/player-util';

@Component({
  selector: 'app-alineaciones-tab',
  standalone: true,
  template: `
    @if (starterLineups().length > 0) {
      <div class="grid grid-cols-2 gap-6">
        @for (lineup of starterLineups(); track lineup.team) {
          <div>
            <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              {{ lineup.team_name }}
            </h4>
            <ul class="space-y-1.5">
              @for (player of lineup.players; track player.number) {
                <li class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                    {{ player.number }}
                  </span>
                  <span class="font-medium">{{ player.name }}</span>
                </li>
              }
            </ul>
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

  starterLineups = computed(() =>
    this.lineups().map((lineup) => ({
      ...lineup,
      players: sortByJerseyNumber(filterStarters(lineup.players)).slice(0, 11),
    }))
  );
}
