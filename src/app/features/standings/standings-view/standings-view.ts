import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StandingsService } from '../../../core/services/standings-service';
import { StandingsTableComponent } from '../standings-table/standings-table';
import { CommonModule } from '@angular/common';
import { Match } from '../../../core/models/match-model';
import { GroupStanding } from '../../../core/models/standings-model';
import { formatKickoffTime } from '../../../shared/utils/match-format-util';

@Component({
  selector: 'app-standings-view',
  standalone: true,
  imports: [CommonModule, RouterLink, StandingsTableComponent],
  template: `
    <div class="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 pb-24">
      <!-- Header -->
      <div class="sticky top-0 z-30 backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div class="max-w-4xl mx-auto flex items-center gap-4">
          <a routerLink="/" class="p-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:scale-105 transition-transform">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path>
            </svg>
          </a>
          <div>
            <h1 class="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Posiciones</h1>
            <p class="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Fase de Grupos</p>
          </div>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 py-8">
        @if (standingsService.loading()) {
          <!-- Loading Skeletons -->
          <div class="space-y-8">
            @for (i of [1,2,3]; track i) {
              <div class="bg-white dark:bg-gray-800/60 rounded-2xl h-96 animate-pulse border border-gray-100 dark:border-gray-800"></div>
            }
          </div>
        } @else if (standingsService.error()) {
          <div class="text-center py-20 bg-white dark:bg-gray-800/60 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl">
            <div class="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-xl font-black text-gray-900 dark:text-white mb-2">¡Ups! Algo salió mal</h3>
            <p class="text-gray-500 dark:text-gray-400 font-medium mb-8">{{ standingsService.error() }}</p>
            <button
              (click)="standingsService.fetchStandings()"
              class="px-8 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/25 hover:scale-105 transition-transform"
            >
              Reintentar ahora
            </button>
          </div>
        } @else {
          <!-- Grupos regulares (A-L) -->
          @for (group of standingsService.groupedStandings() | keyvalue; track group.key) {
            @if (group.key !== 'best-thirds') {
              <app-standings-table
                [groupName]="group.key"
                [standings]="group.value"
              />
              <!-- Próximos enfrentamientos del grupo -->
              @if (getUpcomingForGroup(group.key).length > 0) {
                <div class="mb-8 -mt-4 px-2">
                  <h4 class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-3">Próximos enfrentamientos</h4>
                  <div class="space-y-2">
                    @for (match of getUpcomingForGroup(group.key); track match.id) {
                      <div class="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/30">
                        <div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
                          <span class="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{{ match.home_team }}</span>
                          <img [src]="match.home_flag" [alt]="match.home_team" class="w-5 h-5 rounded-sm object-cover shrink-0">
                        </div>
                        <div class="flex flex-col items-center shrink-0">
                          <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500">vs</span>
                          <span class="text-[9px] text-gray-400 dark:text-gray-500">{{ formatMatchDate(match.kickoff_at) }}</span>
                        </div>
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                          <img [src]="match.away_flag" [alt]="match.away_team" class="w-5 h-5 rounded-sm object-cover shrink-0">
                          <span class="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{{ match.away_team }}</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          }

          <!-- Mejores terceros -->
          @if (getBestThirds().length > 0) {
            <div class="mt-12 mb-8">
              <div class="flex items-center gap-3 mb-4 px-1">
                <span class="text-xs font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">🏆 Clasificación</span>
                <div class="flex-1 h-px bg-amber-200 dark:bg-amber-800/30"></div>
              </div>
              <div class="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/20 rounded-2xl p-4 mb-4">
                <p class="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  Los <strong>8 mejores terceros</strong> de los 12 grupos también clasifican a la Ronda de 32. A continuación el ranking actual de terceros.
                </p>
              </div>
              <app-standings-table
                [groupName]="'Mejores Terceros'"
                [standings]="getBestThirds()"
              />
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

  getUpcomingForGroup(groupName: string): Match[] {
    return this.standingsService.upcomingByGroup().get(groupName) ?? [];
  }

  getBestThirds(): GroupStanding[] {
    return this.standingsService.groupedStandings().get('best-thirds') ?? [];
  }

  formatMatchDate(kickoffAt: string): string {
    const date = new Date(kickoffAt);
    const day = date.getDate();
    const month = date.toLocaleDateString('es', { month: 'short' });
    const time = formatKickoffTime(kickoffAt);
    return `${day} ${month} · ${time}`;
  }
}
