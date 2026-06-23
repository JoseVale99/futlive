import { Component, input } from '@angular/core';
import { MatchLineup } from '../../../core/models/live-data-model';

@Component({
  selector: 'app-alineaciones-tab',
  standalone: true,
  template: `
    @if (lineups().length > 0) {
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        @for (lineup of lineups(); track lineup.team) {
          <div>
            <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              {{ lineup.team_name }}
            </h4>
            <ul class="space-y-1.5">
              @for (player of lineup.players; track player.number) {
                <li class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span class="text-xs font-mono text-gray-400 w-6 text-right">{{ player.number }}</span>
                  <span [class]="player.is_starter ? 'font-medium' : 'text-gray-500 dark:text-gray-400'">
                    {{ player.name }}
                  </span>
                  @if (!player.is_starter) {
                    <span class="text-[10px] text-gray-400">(SUP)</span>
                  }
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
}
