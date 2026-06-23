import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StandingsService } from '../../../core/services/standings-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-standings-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div class="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div class="max-w-4xl mx-auto flex items-center gap-4">
          <a routerLink="/" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg class="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </a>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Tablas de Posiciones</h1>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 py-6">
        @if (standingsService.loading()) {
          <div class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        } @else if (standingsService.error()) {
          <div class="text-center py-12">
            <p class="text-red-600 dark:text-red-400 font-semibold">{{ standingsService.error() }}</p>
            <button (click)="standingsService.fetchStandings()" class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl">Reintentar</button>
          </div>
        } @else {
          @for (groupEntry of standingsService.groupedStandings() | keyvalue; track groupEntry.key) {
            <div class="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div class="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h2 class="font-bold text-gray-900 dark:text-white">{{ groupEntry.key }}</h2>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                  <thead class="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800/50">
                    <tr>
                      <th class="px-4 py-3">Pos</th>
                      <th class="px-4 py-3">Equipo</th>
                      <th class="px-4 py-3 text-center">PJ</th>
                      <th class="px-4 py-3 text-center">G</th>
                      <th class="px-4 py-3 text-center">E</th>
                      <th class="px-4 py-3 text-center">P</th>
                      <th class="px-4 py-3 text-center">DG</th>
                      <th class="px-4 py-3 text-center font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                    @for (item of groupEntry.value; track item.team) {
                      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td class="px-4 py-3 font-medium text-gray-400">{{ item.rank }}</td>
                        <td class="px-4 py-3 font-bold text-gray-900 dark:text-white">{{ item.team }}</td>
                        <td class="px-4 py-3 text-center">{{ item.played }}</td>
                        <td class="px-4 py-3 text-center">{{ item.won }}</td>
                        <td class="px-4 py-3 text-center">{{ item.drawn }}</td>
                        <td class="px-4 py-3 text-center">{{ item.lost }}</td>
                        <td class="px-4 py-3 text-center" [class.text-green-600]="item.goal_difference > 0" [class.text-red-600]="item.goal_difference < 0">
                          {{ item.goal_difference > 0 ? '+' : '' }}{{ item.goal_difference }}
                        </td>
                        <td class="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">{{ item.points }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `
})
export class StandingsViewComponent implements OnInit {
  readonly standingsService = inject(StandingsService);

  ngOnInit() {
    this.standingsService.fetchStandings();
  }
}
