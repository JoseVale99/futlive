import { Component, input } from '@angular/core';
import { GroupStanding } from '../../../core/models/standings-model';
import { getTeamFlagUrl, isQualifying } from '../../../shared/utils/standings-util';
import { translateTeamName } from '../../../shared/utils/team-name-util';
import { FormIndicatorComponent } from '../form-indicator/form-indicator';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-standings-table',
  standalone: true,
  imports: [CommonModule, FormIndicatorComponent],
  template: `
    <div class="mb-8 bg-white dark:bg-gray-800/60 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <div class="bg-linear-to-r from-blue-600/5 to-indigo-600/5 dark:from-blue-600/10 dark:to-indigo-600/10 px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
        <h2 class="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
          <span class="w-2 h-6 bg-blue-600 rounded-full"></span>
          {{ groupName() }}
        </h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-50/50 dark:bg-gray-900/30 font-black">
            <tr>
              <th class="px-4 py-4 text-center w-12">Pos</th>
              <th class="px-4 py-4 sticky left-0 bg-white dark:bg-gray-800 z-10 min-w-[160px]">Equipo</th>
              <th class="px-3 py-4 text-center">PJ</th>
              <th class="px-3 py-4 text-center">G</th>
              <th class="px-3 py-4 text-center">E</th>
              <th class="px-3 py-4 text-center">P</th>
              <th class="px-3 py-4 text-center hidden sm:table-cell">GF</th>
              <th class="px-3 py-4 text-center hidden sm:table-cell">GC</th>
              <th class="px-3 py-4 text-center">DG</th>
              <th class="px-4 py-4 text-center font-black">Pts</th>
              <th class="px-4 py-4 text-center">Forma</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-700/50">
            @for (team of standings(); track team.team) {
              <tr
                class="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group"
                [class.bg-green-50/50]="isQualifying(team)"
                [class.dark:bg-green-900/5]="isQualifying(team)"
              >
                <td class="px-4 py-4 text-center">
                  <span
                    class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                    [class.bg-blue-600]="team.rank <= qualifyCount()"
                    [class.text-white]="team.rank <= qualifyCount()"
                    [class.text-gray-400]="team.rank > qualifyCount()"
                  >
                    {{ team.rank }}
                  </span>
                </td>
                <td class="px-4 py-4 sticky left-0 bg-white dark:bg-gray-800 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/10 z-10">
                  <div class="flex items-center gap-3">
                    <img
                      [src]="getTeamFlagUrl(team.team_external_id)"
                      [alt]="team.team"
                      class="w-6 h-6 object-contain rounded-sm shadow-xs"
                      (error)="$any($event.target).src = 'assets/flags/placeholder.png'"
                    >
                    <div class="flex flex-col">
                      <span class="font-extrabold text-gray-900 dark:text-white truncate">{{ translateTeamName(team.team) }}</span>
                      @if (team.description) {
                        <span class="text-[9px] text-green-600 dark:text-green-400 font-bold uppercase tracking-tight">{{ team.description }}</span>
                      }
                    </div>
                  </div>
                </td>
                <td class="px-3 py-4 text-center font-medium">{{ team.played }}</td>
                <td class="px-3 py-4 text-center">{{ team.win }}</td>
                <td class="px-3 py-4 text-center">{{ team.draw }}</td>
                <td class="px-3 py-4 text-center">{{ team.lose }}</td>
                <td class="px-3 py-4 text-center hidden sm:table-cell text-gray-500">{{ team.gf }}</td>
                <td class="px-3 py-4 text-center hidden sm:table-cell text-gray-500">{{ team.ga }}</td>
                <td class="px-3 py-4 text-center font-bold" [class.text-green-600]="team.gd > 0" [class.text-red-600]="team.gd < 0">
                  {{ team.gd > 0 ? '+' : '' }}{{ team.gd }}
                </td>
                <td class="px-4 py-4 text-center font-black text-gray-900 dark:text-white">{{ team.points }}</td>
                <td class="px-4 py-4">
                  <div class="flex justify-center">
                    <app-form-indicator [form]="team.form" />
                  </div>
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
  qualifyCount = input<number>(2);

  getTeamFlagUrl = getTeamFlagUrl;
  isQualifying = isQualifying;
  translateTeamName = translateTeamName;
}
