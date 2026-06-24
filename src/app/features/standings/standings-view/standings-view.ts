import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StandingsService } from '../../../core/services/standings-service';
import { StandingsTableComponent } from '../standings-table/standings-table';
import { CommonModule } from '@angular/common';
import { Match } from '../../../core/models/match-model';
import { GroupStanding } from '../../../core/models/standings-model';
import { formatKickoffTime } from '../../../shared/utils/match-format-util';
import { translateTeamName } from '../../../shared/utils/team-name-util';

type TabId = 'grupos' | 'cruces';

interface BracketMatch {
  matchNum: number;
  date: string;
  team1Label: string;
  team1Name: string;
  team1Flag: string;
  team2Label: string;
  team2Name: string;
  team2Flag: string;
}

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
            <p class="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Mundial 2026</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="sticky top-[72px] z-20 bg-gray-50/95 dark:bg-[#0a0e17]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/5">
        <div class="max-w-4xl mx-auto px-4">
          <nav class="flex gap-1">
            <button
              (click)="activeTab.set('grupos')"
              [class]="activeTab() === 'grupos'
                ? 'px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-500 transition-colors'
                : 'px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-b-2 border-transparent transition-colors'"
            >
              Grupos
            </button>
            <button
              (click)="activeTab.set('cruces')"
              [class]="activeTab() === 'cruces'
                ? 'px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-500 transition-colors'
                : 'px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-b-2 border-transparent transition-colors'"
            >
              Posibles Cruces
            </button>
          </nav>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 py-8">
        @if (standingsService.loading()) {
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
        } @else if (activeTab() === 'grupos') {
          <!-- TAB: Grupos -->
          @for (group of standingsService.groupedStandings() | keyvalue; track group.key) {
            @if (group.key !== 'best-thirds') {
              <app-standings-table
                [groupName]="group.key"
                [standings]="group.value"
              />
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
        } @else {
          <!-- TAB: Posibles Cruces -->
          <div class="space-y-6">
            <div class="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-700/20 rounded-2xl p-4">
              <p class="text-xs text-blue-700 dark:text-blue-300 font-medium">
                ⚽ Cruces proyectados según las <strong>posiciones actuales</strong>. Se actualizan en tiempo real conforme terminan los partidos de fase de grupos.
              </p>
            </div>

            @for (match of bracketMatches(); track match.matchNum) {
              <div class="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                <div class="px-4 py-2 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700/30 flex items-center justify-between">
                  <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Match {{ match.matchNum }}</span>
                  <span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{{ match.date }}</span>
                </div>
                <div class="px-4 py-4 flex items-center gap-3">
                  <!-- Team 1 -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 justify-end">
                      <div class="text-right min-w-0">
                        <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ match.team1Name }}</p>
                        <p class="text-[9px] text-gray-400 dark:text-gray-500">{{ match.team1Label }}</p>
                      </div>
                      @if (match.team1Flag) {
                        <img [src]="match.team1Flag" [alt]="match.team1Name" class="w-8 h-8 rounded object-cover shrink-0">
                      } @else {
                        <div class="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                          <span class="text-[10px] text-gray-400">?</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- VS -->
                  <div class="shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <span class="text-xs font-black text-gray-500 dark:text-gray-400">VS</span>
                  </div>

                  <!-- Team 2 -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      @if (match.team2Flag) {
                        <img [src]="match.team2Flag" [alt]="match.team2Name" class="w-8 h-8 rounded object-cover shrink-0">
                      } @else {
                        <div class="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                          <span class="text-[10px] text-gray-400">?</span>
                        </div>
                      }
                      <div class="min-w-0">
                        <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ match.team2Name }}</p>
                        <p class="text-[9px] text-gray-400 dark:text-gray-500">{{ match.team2Label }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
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

  // Bracket oficial FIFA — Ronda de 32
  private readonly BRACKET: { matchNum: number; date: string; team1: string; team2: string }[] = [
    { matchNum: 73, date: 'Jun 28', team1: '2A', team2: '2B' },
    { matchNum: 76, date: 'Jun 29', team1: '1C', team2: '2F' },
    { matchNum: 74, date: 'Jun 29', team1: '1E', team2: '3ABCDF' },
    { matchNum: 75, date: 'Jun 30', team1: '1F', team2: '2C' },
    { matchNum: 78, date: 'Jun 30', team1: '2E', team2: '2I' },
    { matchNum: 77, date: 'Jun 30', team1: '1I', team2: '3CDFGH' },
    { matchNum: 79, date: 'Jul 1', team1: '1A', team2: '3CEFHI' },
    { matchNum: 80, date: 'Jul 1', team1: '1L', team2: '3EHIJK' },
    { matchNum: 82, date: 'Jul 1', team1: '1G', team2: '3AEHIJ' },
    { matchNum: 81, date: 'Jul 2', team1: '1D', team2: '3BEFIJ' },
    { matchNum: 84, date: 'Jul 2', team1: '1H', team2: '2J' },
    { matchNum: 83, date: 'Jul 3', team1: '2K', team2: '2L' },
    { matchNum: 85, date: 'Jul 3', team1: '1B', team2: '3EFGIJ' },
    { matchNum: 88, date: 'Jul 3', team1: '2D', team2: '2G' },
    { matchNum: 86, date: 'Jul 3', team1: '1J', team2: '2H' },
    { matchNum: 87, date: 'Jul 4', team1: '1K', team2: '3DEIJL' },
  ];

  readonly bracketMatches = computed((): BracketMatch[] => {
    const grouped = this.standingsService.groupedStandings();
    const usedThirds = new Set<string>();

    return this.BRACKET.map(b => ({
      matchNum: b.matchNum,
      date: b.date,
      ...this.resolveTeam(b.team1, grouped, usedThirds),
      ...this.resolveTeam2(b.team2, grouped, usedThirds),
    }));
  });

  private resolveTeam(code: string, grouped: Map<string, GroupStanding[]>, usedThirds: Set<string>): { team1Label: string; team1Name: string; team1Flag: string } {
    const info = this.resolveSlot(code, grouped, usedThirds);
    return { team1Label: info.label, team1Name: info.name, team1Flag: info.flag };
  }

  private resolveTeam2(code: string, grouped: Map<string, GroupStanding[]>, usedThirds: Set<string>): { team2Label: string; team2Name: string; team2Flag: string } {
    const info = this.resolveSlot(code, grouped, usedThirds);
    return { team2Label: info.label, team2Name: info.name, team2Flag: info.flag };
  }

  private resolveSlot(code: string, grouped: Map<string, GroupStanding[]>, usedThirds: Set<string>): { label: string; name: string; flag: string } {
    if (code.startsWith('3')) {
      const groups = code.slice(1).split('');
      const label = `3° Grupo ${groups.join('/')}`;
      const bestThirds = grouped.get('best-thirds') ?? [];

      // Find the best-ranked third from one of the eligible groups that hasn't been used
      const candidate = bestThirds.find(t => {
        if (usedThirds.has(t.team)) return false;
        for (const g of groups) {
          const groupTeams = grouped.get(`Group ${g}`) ?? [];
          const thirdPlace = groupTeams[2];
          if (thirdPlace && thirdPlace.team === t.team) return true;
        }
        return false;
      });

      if (candidate) {
        usedThirds.add(candidate.team);
        return { label, name: translateTeamName(candidate.team), flag: this.getFlag(candidate.team_external_id) };
      }
      return { label, name: 'Por definir', flag: '' };
    }

    const rank = parseInt(code[0]);
    const groupLetter = code[1];
    const groupName = `Group ${groupLetter}`;
    const groupTeams = grouped.get(groupName) ?? [];
    const team = groupTeams[rank - 1];

    const label = rank === 1 ? `1° Grupo ${groupLetter}` : `2° Grupo ${groupLetter}`;

    if (team) {
      return { label, name: translateTeamName(team.team), flag: this.getFlag(team.team_external_id) };
    }
    return { label, name: 'Por definir', flag: '' };
  }

  private getFlag(externalId: number): string {
    if (!externalId) return '';
    return `https://media.api-sports.io/football/teams/${externalId}.png`;
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
