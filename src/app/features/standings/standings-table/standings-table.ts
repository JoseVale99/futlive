import { Component, input } from '@angular/core';
import { GroupStanding } from '../../core/models/standings-model';
import { getTeamFlagUrl, isQualifying } from '../../shared/utils/standings-util';
import { FormIndicatorComponent } from '../form-indicator/form-indicator';
import { APP_CONSTANTS } from '../../shared/constants/app-constants';

@Component({
  selector: 'app-standings-table',
  standalone: true,
  imports: [FormIndicatorComponent],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
      <!-- Group Header -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
        <h3 class="text-white font-bold text-lg flex items-center gap-2">
          ⚽ {{ groupName() }}
        </h3>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr class="text-xs font-semibold text-gray-600 dark:text-gray-300">
              <th class="px-3 py-3 text-left">Pos</th>
              <th class="px-3 py-3 text-left sticky left-0 bg-gray-50 dark:bg-gray-700">Equipo</th>
              <th class="px-3 py-3 text-center">PJ</th>
              <th class="px-3 py-3 text-center">G</th>
              <th class="px-3 py-3 text-center">E</th>
              <th class="px-3 py-3 text-center">P</th>
              <th class="px-3 py-3 text-center">GF</th>
              <th class="px-3 py-3 text-center">GC</th>
              <th class="px-3 py-3 text-center">DG</th>
              <th class="px-3 py-3 text-center">Pts</th>
              <th class="px-3 py-3 text-center">Forma</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            @for (team of standings(); track team.id) {
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" [class.bg-green-50/70 dark:bg-green-900/20]="isQualifying(team)">
                <td class="px-3 py-3 text-sm font-bold text-gray-700 dark:text-gray-200">
                  @if (team.rank <= 2) {
                    <span class="text-blue-600 dark:text-blue-400">{{ team.rank }}</span>
                  } @else {
                    {{ team.rank }}
                  }
                </td>
                <td class="px-3 py-3 text-left sticky left-0 bg-white dark:bg-gray-800 group-hover:bg-gray-50 dark:group-hover:bg-gray-700/50">
                  <div class="flex items-center gap-2">
                    <img
                      [src]="getTeamFlagUrl(team.team_external_id)"
                      [alt]="team.team"
                      (error)="handleImageError($event)"
                      class="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-gray-600 shadow-sm"
                    />
                    <div class="flex flex-col">
                      <span class="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">
                        {{ team.team }}
                      </span>
                      @if (team.description) {
                        <span class="text-[10px] text-green-600 dark:text-green-400 font-semibold">
                          {{ team.description }}
                        </span>
                      }
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3 text-sm text-gray-700 dark:text-gray-200 text-center">{{ team.played }}</td>
                <td class="px-3 py-3 text-sm text-gray-700 dark:text-gray-200 text-center">{{ team.win }}</td>
                <td class="px-3 py-3 text-sm text-gray-700 dark:text-gray-200 text-center">{{ team.draw }}</td>
                <td class="px-3 py-3 text-sm text-gray-700 dark:text-gray-200 text-center">{{ team.lose }}</td>
                <td class="px-3 py-3 text-sm text-gray-700 dark:text-gray-200 text-center">{{ team.gf }}</td>
                <td class="px-3 py-3 text-sm text-gray-700 dark:text-gray-200 text-center">{{ team.ga }}</td>
                <td class="px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white text-center" [class.text-green-600 dark:text-green-400]="team.gd > 0" [class.text-red-600 dark:text-red-400]="team.gd < 0">
                  {{ team.gd > 0 ? '+' : '' }}{{ team.gd }}
                </td>
                <td class="px-3 py-3 text-sm font-bold text-gray-900 dark:text-white text-center">{{ team.points }}</td>
                <td class="px-3 py-3 text-center">
                  <app-form-indicator [form]="team.form" />
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class StandingsTableComponent {
  groupName = input.required<string>();
  standings = input.required<GroupStanding[]>();

  getTeamFlagUrl = getTeamFlagUrl;
  isQualifying = isQualifying;

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = APP_CONSTANTS.IMAGES.FLAG_PLACEHOLDER;
  }
}
