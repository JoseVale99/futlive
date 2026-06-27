import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { StandingsService } from '../../../core/services/standings-service';
import { StandingsTableComponent } from '../standings-table/standings-table';
import { CommonModule } from '@angular/common';
import { Match } from '../../../core/models/match-model';
import { GroupStanding } from '../../../core/models/standings-model';
import { formatKickoffTime } from '../../../shared/utils/match-format-util';
import { translateTeamName } from '../../../shared/utils/team-name-util';

type TabId = 'grupos' | 'terceros' | 'cruces';

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
  imports: [CommonModule, StandingsTableComponent],
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

      <div class="mx-auto px-4 py-8" [class]="activeTab() === 'cruces' ? 'max-w-7xl' : 'max-w-4xl'">
        @if (standingsService.loading()) {
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
            <app-standings-table [groupName]="'Mejores Terceros'" [standings]="getBestThirds()" [qualifyCount]="8" />
          } @else {
            <div class="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">Datos no disponibles aún</div>
          }
        } @else {
          <!-- BRACKET SIMÉTRICO PRO -->
          <div class="bg-white dark:bg-[#0a0e17] rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800 shadow-lg">
            <div class="flex items-center justify-center gap-2 mb-6">
              <span class="material-symbols-outlined text-blue-500 dark:text-blue-400 text-lg">trophy</span>
              <span class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Bracket Fase Final — Proyección en vivo</span>
            </div>

            <div class="overflow-x-auto pb-2">
              <div class="min-w-[1100px] grid grid-cols-[1fr_130px_120px_150px_120px_130px_1fr] gap-2 items-stretch">
                <!-- HEADERS -->
                <div class="text-center pb-3 border-b border-gray-200 dark:border-gray-700/50"><span class="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">16vos de Final</span></div>
                <div class="text-center pb-3 border-b border-gray-200 dark:border-gray-700/50"><span class="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Octavos</span></div>
                <div class="text-center pb-3 border-b border-gray-200 dark:border-gray-700/50"><span class="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">Cuartos</span></div>
                <div class="text-center pb-3 border-b border-gray-200 dark:border-gray-700/50"><span class="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Semis · Final</span></div>
                <div class="text-center pb-3 border-b border-gray-200 dark:border-gray-700/50"><span class="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">Cuartos</span></div>
                <div class="text-center pb-3 border-b border-gray-200 dark:border-gray-700/50"><span class="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Octavos</span></div>
                <div class="text-center pb-3 border-b border-gray-200 dark:border-gray-700/50"><span class="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">16vos de Final</span></div>

                <!-- LEFT R32 -->
                <div class="space-y-1.5 pt-3">
                  @for (m of leftBracket(); track m.matchNum) {
                    <div class="bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700/60 overflow-hidden hover:border-blue-500/40 transition-colors">
                      <div class="flex items-center gap-2 px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-700/40">
                        @if (m.team1Flag) { <img [src]="m.team1Flag" class="w-5 h-5 rounded object-cover shrink-0"> } @else { <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0"></div> }
                        <span class="text-[11px] font-bold text-gray-900 dark:text-white truncate flex-1">{{ m.team1Name }}</span>
                        <span class="text-[8px] text-gray-500 shrink-0">{{ m.team1Label }}</span>
                      </div>
                      <div class="flex items-center gap-2 px-2.5 py-1.5">
                        @if (m.team2Flag) { <img [src]="m.team2Flag" class="w-5 h-5 rounded object-cover shrink-0"> } @else { <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0"></div> }
                        <span class="text-[11px] font-bold text-gray-900 dark:text-white truncate flex-1">{{ m.team2Name }}</span>
                        <span class="text-[8px] text-gray-500 shrink-0">{{ m.team2Label }}</span>
                      </div>
                    </div>
                  }
                </div>

                <!-- LEFT R16 (Octavos) -->
                <div class="space-y-4 pt-6 flex flex-col justify-around">
                  @for (i of [1,2,3,4]; track i) {
                    <div class="bg-cyan-50/50 dark:bg-gray-800/50 rounded-lg border border-dashed border-cyan-300/50 dark:border-cyan-500/30 px-3 py-3 text-center">
                      <span class="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">Octavos {{ i }}</span>
                      <p class="text-[8px] text-gray-500 mt-0.5">Por definir</p>
                    </div>
                  }
                </div>

                <!-- LEFT CUARTOS -->
                <div class="space-y-6 pt-8 flex flex-col justify-around">
                  @for (i of [1,2]; track i) {
                    <div class="bg-violet-50/50 dark:bg-gray-800/50 rounded-lg border border-dashed border-violet-300/50 dark:border-violet-500/30 px-3 py-4 text-center">
                      <span class="text-[10px] font-bold text-violet-600 dark:text-violet-400">Cuarto {{ i }}</span>
                      <p class="text-[8px] text-gray-500 mt-0.5">Por definir</p>
                    </div>
                  }
                </div>

                <!-- CENTER: SEMIS + FINAL -->
                <div class="flex flex-col items-center justify-center gap-4 pt-6">
                  <div class="bg-emerald-50/50 dark:bg-gray-800/50 rounded-lg border border-dashed border-emerald-300/50 dark:border-emerald-500/30 px-3 py-3 text-center w-full">
                    <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Semifinal 1</span>
                    <p class="text-[8px] text-gray-500 mt-0.5">Por definir</p>
                  </div>
                  <div class="bg-linear-to-b from-amber-900/30 to-yellow-900/20 rounded-xl border border-amber-500/30 px-4 py-5 text-center w-full shadow-lg shadow-amber-500/5">
                    <span class="text-3xl">🏆</span>
                    <p class="text-xs font-black text-amber-400 mt-2">GRAN FINAL</p>
                    <p class="text-[9px] text-amber-500/70 mt-0.5">Jul 19 · MetLife Stadium</p>
                    <div class="mt-3 pt-2 border-t border-amber-600/20">
                      <p class="text-[10px] font-bold text-gray-400">Campeón 2026</p>
                      <p class="text-[9px] text-gray-500">Por definir</p>
                    </div>
                  </div>
                  <div class="bg-emerald-50/50 dark:bg-gray-800/50 rounded-lg border border-dashed border-emerald-300/50 dark:border-emerald-500/30 px-3 py-3 text-center w-full">
                    <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Semifinal 2</span>
                    <p class="text-[8px] text-gray-500 mt-0.5">Por definir</p>
                  </div>
                </div>

                <!-- RIGHT CUARTOS -->
                <div class="space-y-6 pt-8 flex flex-col justify-around">
                  @for (i of [3,4]; track i) {
                    <div class="bg-violet-50/50 dark:bg-gray-800/50 rounded-lg border border-dashed border-violet-300/50 dark:border-violet-500/30 px-3 py-4 text-center">
                      <span class="text-[10px] font-bold text-violet-600 dark:text-violet-400">Cuarto {{ i }}</span>
                      <p class="text-[8px] text-gray-500 mt-0.5">Por definir</p>
                    </div>
                  }
                </div>

                <!-- RIGHT R16 (Octavos) -->
                <div class="space-y-4 pt-6 flex flex-col justify-around">
                  @for (i of [5,6,7,8]; track i) {
                    <div class="bg-cyan-50/50 dark:bg-gray-800/50 rounded-lg border border-dashed border-cyan-300/50 dark:border-cyan-500/30 px-3 py-3 text-center">
                      <span class="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">Octavos {{ i }}</span>
                      <p class="text-[8px] text-gray-500 mt-0.5">Por definir</p>
                    </div>
                  }
                </div>

                <!-- RIGHT R32 -->
                <div class="space-y-1.5 pt-3">
                  @for (m of rightBracket(); track m.matchNum) {
                    <div class="bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700/60 overflow-hidden hover:border-blue-500/40 transition-colors">
                      <div class="flex items-center gap-2 px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-700/40">
                        @if (m.team1Flag) { <img [src]="m.team1Flag" class="w-5 h-5 rounded object-cover shrink-0"> } @else { <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0"></div> }
                        <span class="text-[11px] font-bold text-gray-900 dark:text-white truncate flex-1">{{ m.team1Name }}</span>
                        <span class="text-[8px] text-gray-500 shrink-0">{{ m.team1Label }}</span>
                      </div>
                      <div class="flex items-center gap-2 px-2.5 py-1.5">
                        @if (m.team2Flag) { <img [src]="m.team2Flag" class="w-5 h-5 rounded object-cover shrink-0"> } @else { <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0"></div> }
                        <span class="text-[11px] font-bold text-gray-900 dark:text-white truncate flex-1">{{ m.team2Name }}</span>
                        <span class="text-[8px] text-gray-500 shrink-0">{{ m.team2Label }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="mt-5 flex items-start gap-2 px-1 border-t border-gray-800 pt-4">
              <span class="material-symbols-outlined text-gray-600 text-sm shrink-0">info</span>
              <p class="text-[10px] text-gray-500">Los cruces se basan en el formato del torneo: 1° de grupo vs 2° de grupo según el cuadro oficial. Los 8 mejores terceros se distribuyen según tabla de combinaciones FIFA.</p>
            </div>
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

  private readonly BRACKET: { matchNum: number; date: string; team1: string; team2: string }[] = [
    // LEFT SIDE (8 matches)
    { matchNum: 74, date: 'Jun 29', team1: '1E', team2: '3ABCDF' },
    { matchNum: 77, date: 'Jun 30', team1: '1I', team2: '3CDFGH' },
    { matchNum: 73, date: 'Jun 28', team1: '2A', team2: '2B' },
    { matchNum: 75, date: 'Jun 30', team1: '1F', team2: '2C' },
    { matchNum: 79, date: 'Jul 1', team1: '1A', team2: '3CEFHI' },
    { matchNum: 80, date: 'Jul 1', team1: '1L', team2: '3EHIJK' },
    { matchNum: 78, date: 'Jun 30', team1: '2E', team2: '2I' },
    { matchNum: 76, date: 'Jun 29', team1: '1C', team2: '2F' },
    // RIGHT SIDE (8 matches)
    { matchNum: 84, date: 'Jul 2', team1: '1H', team2: '2J' },
    { matchNum: 83, date: 'Jul 3', team1: '2K', team2: '2L' },
    { matchNum: 81, date: 'Jul 2', team1: '1D', team2: '3BEFIJ' },
    { matchNum: 82, date: 'Jul 1', team1: '1G', team2: '3AEHIJ' },
    { matchNum: 86, date: 'Jul 3', team1: '1J', team2: '2H' },
    { matchNum: 88, date: 'Jul 3', team1: '2D', team2: '2G' },
    { matchNum: 85, date: 'Jul 3', team1: '1B', team2: '3EFGIJ' },
    { matchNum: 87, date: 'Jul 4', team1: '1K', team2: '3DEIJL' },
  ];

  readonly bracketMatches = computed((): BracketMatch[] => {
    const grouped = this.standingsService.groupedStandings();
    const usedThirds = new Set<string>();

    // Pre-calculate the assignment of thirds using FIFA combination table
    const thirdAssignment = this.assignThirdsToSlots(grouped);

    return this.BRACKET.map(b => ({
      matchNum: b.matchNum,
      date: b.date,
      ...this.resolveTeamWithAssignment(b.team1, grouped, thirdAssignment),
      ...this.resolveTeam2WithAssignment(b.team2, grouped, thirdAssignment),
    }));
  });

  readonly leftBracket = computed(() => this.bracketMatches().slice(0, 8));
  readonly rightBracket = computed(() => this.bracketMatches().slice(8, 16));

  /**
   * Assigns each qualifying 3rd-place team to a specific bracket slot.
   * Uses backtracking to find a valid assignment where all 8 slots are filled.
   */
  private assignThirdsToSlots(grouped: Map<string, GroupStanding[]>): Map<string, GroupStanding> {
    const assignment = new Map<string, GroupStanding>();

    let bestThirds = grouped.get('best-thirds') ?? [];
    if (bestThirds.length === 0) {
      bestThirds = this.calculateBestThirds(grouped);
    } else {
      bestThirds = bestThirds.slice(0, 8);
    }

    if (bestThirds.length === 0) return assignment;

    // Find which group each qualifying 3rd belongs to
    const thirdToGroup = new Map<string, string>();
    for (const third of bestThirds) {
      for (const [groupName, teams] of grouped) {
        if (!groupName.startsWith('Group ')) continue;
        if (teams.length >= 3 && teams[2].team === third.team) {
          thirdToGroup.set(third.team, groupName.replace('Group ', ''));
          break;
        }
      }
    }

    // Slot codes from BRACKET (order matters for bracket display)
    const slotCodes = ['3ABCDF', '3CDFGH', '3CEFHI', '3EHIJK', '3BEFIJ', '3AEHIJ', '3EFGIJ', '3DEIJL'];

    // Use backtracking to find valid assignment
    this.backtrackAssign(slotCodes, 0, bestThirds, thirdToGroup, new Set(), assignment);

    return assignment;
  }

  private backtrackAssign(
    slots: string[],
    idx: number,
    thirds: GroupStanding[],
    thirdToGroup: Map<string, string>,
    used: Set<string>,
    assignment: Map<string, GroupStanding>
  ): boolean {
    if (idx === slots.length) return true;

    const slot = slots[idx];
    const eligibleGroups = slot.slice(1).split('');

    for (const third of thirds) {
      if (used.has(third.team)) continue;
      const group = thirdToGroup.get(third.team);
      if (!group || !eligibleGroups.includes(group)) continue;

      used.add(third.team);
      assignment.set(slot, third);

      if (this.backtrackAssign(slots, idx + 1, thirds, thirdToGroup, used, assignment)) {
        return true;
      }

      used.delete(third.team);
      assignment.delete(slot);
    }
    return false;
  }

  private resolveTeamWithAssignment(code: string, grouped: Map<string, GroupStanding[]>, thirdAssignment: Map<string, GroupStanding>): { team1Label: string; team1Name: string; team1Flag: string } {
    const info = this.resolveSlotFinal(code, grouped, thirdAssignment);
    return { team1Label: info.label, team1Name: info.name, team1Flag: info.flag };
  }

  private resolveTeam2WithAssignment(code: string, grouped: Map<string, GroupStanding[]>, thirdAssignment: Map<string, GroupStanding>): { team2Label: string; team2Name: string; team2Flag: string } {
    const info = this.resolveSlotFinal(code, grouped, thirdAssignment);
    return { team2Label: info.label, team2Name: info.name, team2Flag: info.flag };
  }

  private resolveSlotFinal(code: string, grouped: Map<string, GroupStanding[]>, thirdAssignment: Map<string, GroupStanding>): { label: string; name: string; flag: string } {
    if (code.startsWith('3')) {
      const groups = code.slice(1).split('');
      const label = `3° ${groups.join('/')}`;
      const assigned = thirdAssignment.get(code);
      if (assigned) {
        return { label, name: translateTeamName(assigned.team), flag: assigned.team_logo || '' };
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
      return { label, name: translateTeamName(team.team), flag: team.team_logo || '' };
    }
    return { label, name: 'Por definir', flag: '' };
  }

  /**
   * Calcula los 8 mejores terceros a partir de los grupos reales.
   * Toma el 3° de cada grupo (rank index 2) y los ordena por puntos > GD > GF.
   */
  private calculateBestThirds(grouped: Map<string, GroupStanding[]>): GroupStanding[] {
    return this.calculateAllThirds(grouped).slice(0, 8);
  }

  /**
   * Calcula todos los 12 terceros ordenados para mostrar en tabla.
   */
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

  getUpcomingForGroup(groupName: string): Match[] {
    return this.standingsService.upcomingByGroup().get(groupName) ?? [];
  }

  getBestThirds(): GroupStanding[] {
    const grouped = this.standingsService.groupedStandings();
    const fromDb = grouped.get('best-thirds') ?? [];
    if (fromDb.length > 0) return fromDb;
    // Fallback: calculate all 12 thirds (not just 8) for the table display
    return this.calculateAllThirds(grouped);
  }

  formatMatchDate(kickoffAt: string): string {
    const date = new Date(kickoffAt);
    const day = date.getDate();
    const month = date.toLocaleDateString('es', { month: 'short' });
    const time = formatKickoffTime(kickoffAt);
    return `${day} ${month} · ${time}`;
  }
}
