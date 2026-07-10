import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { StandingsService } from '../../../core/services/standings-service';
import { StandingsTableComponent } from '../standings-table/standings-table';
import { BracketComponent } from '../../bracket/bracket-view';
import { Match } from '../../../core/models/match-model';
import { GroupStanding } from '../../../core/models/standings-model';

type TabId = 'grupos' | 'terceros' | 'cruces';

@Component({
  selector: 'app-standings-view',
  standalone: true,
  imports: [KeyValuePipe, StandingsTableComponent, BracketComponent],
  template: `
    <div class="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 pb-24">
      <div class="bg-gray-50 dark:bg-[#0a0e17] border-b border-gray-200 dark:border-white/5">
        <div class="max-w-7xl mx-auto px-4">
          <nav class="flex gap-1">
            <button (click)="activeTab.set('grupos')" [class]="activeTab() === 'grupos' ? 'px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-500' : 'px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent'">
              <span class="material-symbols-outlined text-sm align-middle mr-1">groups</span> Grupos
            </button>
            <button (click)="activeTab.set('terceros')" [class]="activeTab() === 'terceros' ? 'px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-500' : 'px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent'">
              <span class="material-symbols-outlined text-sm align-middle mr-1">format_list_numbered</span> Mejores Terceros
            </button>
            <button (click)="activeTab.set('cruces')" [class]="activeTab() === 'cruces' ? 'px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-500' : 'px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent'">
              <span class="material-symbols-outlined text-sm align-middle mr-1">account_tree</span> Fase Final
            </button>
          </nav>
        </div>
      </div>

      <div class="mx-auto px-4 py-8" [class]="activeTab() === 'cruces' ? 'max-w-[1600px]' : 'max-w-4xl'">
        @if (activeTab() === 'cruces') {
          <app-bracket />
        } @else if (standingsService.loading()) {
          <div class="space-y-8">
            @for (i of [1,2,3]; track i) {
              <div class="bg-white dark:bg-gray-800/60 rounded-2xl h-96 animate-pulse border border-gray-100 dark:border-gray-800"></div>
            }
          </div>
        } @else if (standingsService.error()) {
          <div class="text-center py-20 bg-white dark:bg-gray-800/60 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl">
            <h3 class="text-xl font-black text-gray-900 dark:text-white mb-2">¡Ups! Algo salió mal</h3>
            <p class="text-gray-500 dark:text-gray-400 font-medium mb-8">{{ standingsService.error() }}</p>
            <button (click)="standingsService.fetchStandings()" class="px-8 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black">Reintentar</button>
          </div>
        } @else if (activeTab() === 'grupos') {
          @for (group of standingsService.groupedStandings() | keyvalue; track group.key) {
            @if (group.key !== 'best-thirds') {
              <app-standings-table [groupName]="group.key" [standings]="group.value" />
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
        } @else if (activeTab() === 'terceros') {
          <div class="mb-4">
            <div class="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/20 rounded-2xl p-4">
              <p class="text-xs text-amber-700 dark:text-amber-300 font-medium">Los <strong>8 mejores terceros</strong> de los 12 grupos clasifican a los 16vos de Final. Se ordenan por puntos, diferencia de goles y goles a favor.</p>
            </div>
          </div>
          @if (getBestThirds().length > 0) {
            <app-standings-table [groupName]="'Mejores Terceros'" [standings]="getBestThirds()" [qualifyCount]="8" [useIndex]="true" />
          } @else {
            <div class="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">Datos no disponibles aún</div>
          }
        }
      </div>
    </div>
  `
})
export class StandingsViewComponent implements OnInit {
  readonly standingsService = inject(StandingsService);
  readonly activeTab = signal<TabId>('grupos');

  ngOnInit() {
    this.standingsService.fetchStandings();
  }

  getUpcomingForGroup(groupName: string): Match[] {
    return this.standingsService.upcomingByGroup().get(groupName) ?? [];
  }

  getBestThirds(): GroupStanding[] {
    const grouped = this.standingsService.groupedStandings();
    const fromDb = grouped.get('best-thirds') ?? [];
    if (fromDb.length > 0) return fromDb;
    return this.calculateAllThirds(grouped);
  }

  private calculateAllThirds(grouped: Map<string, GroupStanding[]>): GroupStanding[] {
    const thirds: GroupStanding[] = [];
    for (const [groupName, teams] of grouped) {
      if (groupName === 'best-thirds') continue;
      if (!groupName.startsWith('Group ')) continue;
      if (teams.length >= 3) {
        thirds.push(teams[2]);
      }
    }
    thirds.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
    return thirds;
  }

  formatMatchDate(kickoffAt: string): string {
    const date = new Date(kickoffAt);
    const day = date.getDate();
    const month = date.toLocaleDateString('es', { month: 'short' });
    const time = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${month} · ${time}`;
  }
}