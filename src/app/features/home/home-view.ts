import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../../core/config/environment';
import { Match, MatchEvent } from '../../core/models/match-model';
import { forkJoin, of, catchError, timeout, Subscription, timer, switchMap, map } from 'rxjs';
import { formatKickoffTime, formatKickoffWithDate } from '../../shared/utils/match-format-util';
import { applyEffectiveStatus } from '../../shared/utils/match-status-util';
import { translateTeamName } from '../../shared/utils/team-name-util';
import { APP_CONSTANTS } from '../../shared/constants/app-constants';
import { buildStatBars, StatBar } from '../streaming/estadisticas-tab/estadisticas-tab';

type TabId = 'today' | 'upcoming' | 'finished';

interface MatchGroup {
  label: string;
  matches: Match[];
  isLive: boolean;
}

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-[#0a0e17] pb-24">
      <!-- Tabs -->
      <div class="bg-gray-50 dark:bg-[#0a0e17] border-b border-gray-200 dark:border-white/5">
        <div class="max-w-5xl mx-auto px-4">
          <nav class="flex gap-1">
            @for (tab of tabs; track tab.id) {
              <button
                (click)="activeTab.set(tab.id)"
                [class]="activeTab() === tab.id
                  ? 'px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-500 transition-colors'
                  : 'px-5 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-b-2 border-transparent transition-colors'"
              >
                {{ tab.label }}
              </button>
            }
          </nav>
        </div>
      </div>

      <!-- Content -->
      <div class="max-w-5xl mx-auto px-4 py-6">
        @if (loading()) {
          <div class="flex items-center justify-center py-32">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-gray-700 border-t-blue-500"></div>
          </div>
        } @else if (activeGroups().length === 0) {
          <div class="text-center py-32">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg class="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <p class="text-gray-400 dark:text-gray-500 text-sm">No hay partidos disponibles</p>
          </div>
        } @else {
          <div class="space-y-8">
            @for (group of activeGroups(); track group.label) {
              <section>
                <!-- Group Header -->
                <div class="flex items-center gap-3 mb-3 px-1">
                  @if (group.isLive) {
                    <div class="flex items-center gap-2">
                      <span class="relative flex h-2.5 w-2.5">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                      <span class="text-xs font-bold text-red-400 uppercase tracking-wider">En vivo</span>
                    </div>
                  } @else {
                    <span class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{{ group.label }}</span>
                  }
                  <div class="flex-1 h-px bg-gray-200 dark:bg-white/5"></div>
                </div>

                <!-- Live Expanded Cards -->
                @if (group.isLive) {
                  <div class="grid grid-cols-1 gap-4">
                    @for (match of group.matches; track match.id) {
                      <div class="relative rounded-xl border border-red-500/30 dark:border-red-500/20 bg-white dark:bg-[#111827] overflow-hidden shadow-lg shadow-red-500/5">
                        <!-- Gradient accent top border -->
                        <div class="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-red-500 via-orange-500 to-yellow-500"></div>

                        <div class="p-5 pt-6">
                          <!-- Live badge -->
                          <div class="flex items-center justify-center gap-2 mb-4">
                            <span class="relative flex h-2.5 w-2.5">
                              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                            <span class="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider">En vivo</span>
                            <span class="text-xs font-bold text-red-500 dark:text-red-400">· {{ match.time_elapsed }}'</span>
                          </div>

                          <!-- Scoreboard -->
                          <div class="flex items-center justify-center gap-4 sm:gap-8 mb-4">
                            <!-- Home team -->
                            <div class="flex flex-col items-center gap-2 flex-1 min-w-0">
                              <img [src]="match.home_flag" [alt]="match.home_team" (error)="handleImgError($event)" class="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover shadow-sm">
                              <span class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 text-center truncate max-w-full">{{ t(match.home_team) }}</span>
                            </div>

                            <!-- Score -->
                            <div class="flex items-center gap-3">
                              <span class="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tabular-nums">{{ match.home_score ?? 0 }}</span>
                              <span class="text-xl text-gray-400 dark:text-gray-600 font-light">-</span>
                              <span class="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tabular-nums">{{ match.away_score ?? 0 }}</span>
                            </div>

                            <!-- Away team -->
                            <div class="flex flex-col items-center gap-2 flex-1 min-w-0">
                              <img [src]="match.away_flag" [alt]="match.away_team" (error)="handleImgError($event)" class="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover shadow-sm">
                              <span class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 text-center truncate max-w-full">{{ t(match.away_team) }}</span>
                            </div>
                          </div>

                          <!-- Goal scorers -->
                          @if (getGoals(match).length > 0) {
                            <div class="border-t border-gray-100 dark:border-white/5 pt-3 mb-4">
                              <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
                                <!-- Home goals -->
                                <div class="text-right">
                                  @for (group of getGroupedHomeGoals(match); track group.player) {
                                    <p class="text-xs text-gray-600 dark:text-gray-400">
                                      <span class="font-medium text-gray-800 dark:text-gray-200">{{ group.player }}</span>
                                      <span class="text-gray-400 dark:text-gray-500 ml-1">{{ group.minutes.join("', ") }}'</span>
                                      @if (group.isOwnGoal) {
                                        <span class="text-red-400 dark:text-red-500 ml-0.5 text-[10px]">(GEC)</span>
                                      }
                                    </p>
                                  }
                                </div>
                                <!-- Divider -->
                                <div class="w-px min-h-4 bg-gray-200 dark:bg-white/10 mx-2"></div>
                                <!-- Away goals -->
                                <div class="text-left">
                                  @for (group of getGroupedAwayGoals(match); track group.player) {
                                    <p class="text-xs text-gray-600 dark:text-gray-400">
                                      <span class="text-gray-400 dark:text-gray-500 mr-1">{{ group.minutes.join("', ") }}'</span>
                                      <span class="font-medium text-gray-800 dark:text-gray-200">{{ group.player }}</span>
                                      @if (group.isOwnGoal) {
                                        <span class="text-red-400 dark:text-red-500 ml-0.5 text-[10px]">(GEC)</span>
                                      }
                                    </p>
                                  }
                                </div>
                              </div>
                            </div>
                          }

                          <!-- CTA Button -->
                          <div class="flex gap-2">
                            <button
                              (click)="goToMatch(match)"
                              class="flex-1 py-2.5 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold uppercase tracking-wide transition-colors cursor-pointer"
                            >
                              Ver en vivo
                            </button>
                            @if (hasEvents(match)) {
                              <button
                                (click)="toggleExpanded(match.id)"
                                class="py-2.5 px-3 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 text-sm font-medium transition-colors cursor-pointer"
                              >
                                <svg [class]="'w-4 h-4 transition-transform ' + (expandedMatchId() === match.id ? 'rotate-180' : '')" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                              </button>
                            }
                          </div>

                          <!-- Expandable Details -->
                          @if (expandedMatchId() === match.id) {
                            <div class="mt-4 border-t border-gray-100 dark:border-white/5 pt-4 space-y-4 motion-safe:animate-fade-in">
                              <!-- Cards & Subs -->
                              @if (getCards(match).length > 0 || getSubs(match).length > 0) {
                                <div class="space-y-3">
                                  <!-- Yellow/Red Cards -->
                                  @if (getCards(match).length > 0) {
                                    <div>
                                      <h5 class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Tarjetas</h5>
                                      <div class="space-y-1">
                                        @for (card of getCards(match); track card.id) {
                                          <div class="flex items-center gap-2 text-xs">
                                            <span>{{ card.type === 'yellow' ? '🟨' : '🟥' }}</span>
                                            <span class="font-medium text-gray-800 dark:text-gray-200">{{ card.player }}</span>
                                            <span class="text-gray-400 dark:text-gray-500">{{ card.minute }}'</span>
                                            <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">{{ card.team === 'home' ? t(match.home_team) : t(match.away_team) }}</span>
                                          </div>
                                        }
                                      </div>
                                    </div>
                                  }

                                  <!-- Substitutions -->
                                  @if (getSubs(match).length > 0) {
                                    <div>
                                      <h5 class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">Cambios</h5>
                                      <div class="space-y-1">
                                        @for (sub of getSubs(match); track sub.id) {
                                          <div class="flex items-center gap-2 text-xs">
                                            <span>🔄</span>
                                            <span class="font-medium text-gray-800 dark:text-gray-200">{{ sub.player }}</span>
                                            <span class="text-gray-400 dark:text-gray-500">{{ sub.minute }}'</span>
                                            <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">{{ sub.team === 'home' ? t(match.home_team) : t(match.away_team) }}</span>
                                          </div>
                                        }
                                      </div>
                                    </div>
                                  }
                                </div>
                              }

                              <!-- Stats -->
                              @if (getMatchStatBars(match).length > 0) {
                                <div>
                                  <h5 class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Estadísticas</h5>
                                  <div class="space-y-2">
                                    @for (stat of getMatchStatBars(match); track stat.label) {
                                      <div class="space-y-0.5">
                                        <div class="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                                          <span class="font-semibold text-gray-900 dark:text-white">{{ stat.homeValue }}</span>
                                          <span class="font-medium">{{ stat.label }}</span>
                                          <span class="font-semibold text-gray-900 dark:text-white">{{ stat.awayValue }}</span>
                                        </div>
                                        <div class="flex h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                                          <div class="bg-blue-500 rounded-l-full" [style.width.%]="stat.homeWidth"></div>
                                          <div class="bg-red-500 rounded-r-full ml-auto" [style.width.%]="stat.awayWidth"></div>
                                        </div>
                                      </div>
                                    }
                                  </div>
                                </div>
                              }
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <!-- Compact cards (scheduled/finished) -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    @for (match of group.matches; track match.id) {
                      <button
                        (click)="goToMatch(match)"
                        class="group relative bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-[#1a2236] border border-gray-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/30 rounded-lg p-4 flex items-center gap-4 transition-all duration-200 cursor-pointer text-left w-full"
                      >
                        <!-- Time -->
                        <div class="w-12 text-center shrink-0">
                          @if (match.status === 'finished') {
                            <div class="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded uppercase">Fin</div>
                          } @else {
                            <div class="text-xs font-bold text-gray-700 dark:text-gray-300">{{ formatTime(match.kickoff_at) }}</div>
                          }
                        </div>

                        <!-- Teams -->
                        <div class="flex-1 min-w-0 space-y-1.5">
                          <div class="flex items-center gap-2.5">
                            <img [src]="match.home_flag" [alt]="match.home_team" (error)="handleImgError($event)" class="w-5 h-5 rounded-sm object-cover">
                            <span class="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">{{ t(match.home_team) }}</span>
                            @if (match.status === 'finished') {
                              <span class="ml-auto text-sm font-bold text-gray-900 dark:text-white tabular-nums">{{ match.home_score }}</span>
                            }
                          </div>
                          <div class="flex items-center gap-2.5">
                            <img [src]="match.away_flag" [alt]="match.away_team" (error)="handleImgError($event)" class="w-5 h-5 rounded-sm object-cover">
                            <span class="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">{{ t(match.away_team) }}</span>
                            @if (match.status === 'finished') {
                              <span class="ml-auto text-sm font-bold text-gray-900 dark:text-white tabular-nums">{{ match.away_score }}</span>
                            }
                          </div>
                        </div>

                        <!-- Chevron -->
                        <svg class="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    }
                  </div>
                }
              </section>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class HomeViewComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT_TOKEN);
  private readonly router = inject(Router);

  private pollingSubscription?: Subscription;
  private readonly eventsCache = new Map<string, MatchEvent[]>();

  readonly t = translateTeamName;

  readonly tabs: { id: TabId; label: string }[] = [
    { id: 'today', label: 'Hoy' },
    { id: 'upcoming', label: 'Próximos' },
    { id: 'finished', label: 'Finalizados' },
  ];

  readonly activeTab = signal<TabId>('today');
  readonly allMatches = signal<Match[]>([]);
  readonly loading = signal(true);
  readonly expandedMatchId = signal<string | null>(null);

  readonly activeGroups = computed(() => {
    const matches = this.allMatches();
    const tab = this.activeTab();

    if (tab === 'today') return this.buildTodayGroups(matches);
    if (tab === 'upcoming') return this.buildUpcomingGroups(matches);
    return this.buildFinishedGroups(matches);
  });

  ngOnInit() {
    this.fetchAndEnrich();
    // Polling solo si hay partidos live
    this.pollingSubscription = timer(120_000, 120_000).pipe(
      switchMap(() => {
        const hasLive = this.allMatches().some(m => m.status === 'live');
        if (!hasLive) return of([]);
        return this.fetchAll$();
      })
    ).subscribe(matches => {
      if (matches.length > 0) {
        const enriched = matches.map(applyEffectiveStatus).map(m => this.enrichFromCache(m));
        this.allMatches.set(enriched);
        this.fetchEventsForLive(enriched.filter(m => m.status === 'live'));
      }
    });
  }

  ngOnDestroy() {
    this.pollingSubscription?.unsubscribe();
  }

  goToMatch(match: Match) {
    this.router.navigate(['/stream', match.id]);
  }

  formatTime(isoString: string): string {
    return formatKickoffTime(isoString);
  }

  handleImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = APP_CONSTANTS.IMAGES.FLAG_PLACEHOLDER;
  }

  getGoals(match: Match): MatchEvent[] {
    return (match.events ?? []).filter(e => e.type === 'goal' || e.type === 'own_goal');
  }

  getHomeGoals(match: Match): MatchEvent[] {
    return this.getGoals(match).filter(e => e.team === 'home');
  }

  getAwayGoals(match: Match): MatchEvent[] {
    return this.getGoals(match).filter(e => e.team === 'away');
  }

  getGroupedHomeGoals(match: Match): { player: string; minutes: number[]; isOwnGoal: boolean }[] {
    return this.groupGoalsByPlayer(this.getHomeGoals(match));
  }

  getGroupedAwayGoals(match: Match): { player: string; minutes: number[]; isOwnGoal: boolean }[] {
    return this.groupGoalsByPlayer(this.getAwayGoals(match));
  }

  private groupGoalsByPlayer(goals: MatchEvent[]): { player: string; minutes: number[]; isOwnGoal: boolean }[] {
    const map = new Map<string, { minutes: number[]; isOwnGoal: boolean }>();
    for (const g of goals) {
      const key = `${g.player}_${g.type}`;
      const existing = map.get(key) ?? { minutes: [], isOwnGoal: g.type === 'own_goal' };
      existing.minutes.push(g.minute);
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .map(([key, { minutes, isOwnGoal }]) => ({
        player: key.replace(/_goal$|_own_goal$/, ''),
        minutes: minutes.sort((a, b) => a - b),
        isOwnGoal
      }))
      .sort((a, b) => a.minutes[0] - b.minutes[0]);
  }

  getCards(match: Match): MatchEvent[] {
    return (match.events ?? []).filter(e => e.type === 'yellow' || e.type === 'red').sort((a, b) => a.minute - b.minute);
  }

  getSubs(match: Match): MatchEvent[] {
    return (match.events ?? []).filter(e => e.type === 'sub').sort((a, b) => a.minute - b.minute);
  }

  hasEvents(match: Match): boolean {
    const events = match.events ?? [];
    const hasNonGoalEvents = events.some(e => e.type !== 'goal' && e.type !== 'own_goal');
    const hasStats = (match.stats ?? []).length > 0;
    return hasNonGoalEvents || hasStats;
  }

  getMatchStatBars(match: Match): StatBar[] {
    return buildStatBars(match.stats ?? []);
  }

  toggleExpanded(matchId: string) {
    this.expandedMatchId.set(this.expandedMatchId() === matchId ? null : matchId);
  }

  private buildTodayGroups(matches: Match[]): MatchGroup[] {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');

    // Los partidos live siempre van en "Hoy" sin importar fecha de kickoff
    const live = matches.filter(m => m.status === 'live');

    // Para scheduled/finished, usar fecha local del kickoff
    const todayMatches = matches.filter(m => {
      if (m.status === 'live') return false; // ya los separamos
      const kickoffLocal = new Date(m.kickoff_at);
      const kickoffStr = kickoffLocal.getFullYear() + '-' + String(kickoffLocal.getMonth() + 1).padStart(2, '0') + '-' + String(kickoffLocal.getDate()).padStart(2, '0');
      return kickoffStr === todayStr;
    });

    const tomorrowMatches = matches.filter(m => {
      if (m.status !== 'scheduled') return false;
      const kickoffLocal = new Date(m.kickoff_at);
      const kickoffStr = kickoffLocal.getFullYear() + '-' + String(kickoffLocal.getMonth() + 1).padStart(2, '0') + '-' + String(kickoffLocal.getDate()).padStart(2, '0');
      return kickoffStr === tomorrowStr;
    });

    const scheduledToday = todayMatches.filter(m => m.status === 'scheduled');
    const finished = todayMatches.filter(m => m.status === 'finished');

    const groups: MatchGroup[] = [];

    if (live.length > 0) {
      groups.push({ label: 'En vivo', matches: live, isLive: true });
    }

    // Today's scheduled (solo hora)
    const byLabel = new Map<string, Match[]>();
    for (const match of scheduledToday) {
      const label = formatKickoffTime(match.kickoff_at);
      const list = byLabel.get(label) || [];
      list.push(match);
      byLabel.set(label, list);
    }
    for (const [label, hourMatches] of byLabel) {
      groups.push({ label, matches: hourMatches, isLive: false });
    }

    // Tomorrow's scheduled (con fecha)
    const byLabelTomorrow = new Map<string, Match[]>();
    for (const match of tomorrowMatches) {
      const label = formatKickoffWithDate(match.kickoff_at);
      const list = byLabelTomorrow.get(label) || [];
      list.push(match);
      byLabelTomorrow.set(label, list);
    }
    for (const [label, hourMatches] of byLabelTomorrow) {
      groups.push({ label, matches: hourMatches, isLive: false });
    }

    if (finished.length > 0) {
      groups.push({ label: 'Finalizados', matches: finished, isLive: false });
    }

    return groups;
  }

  private buildUpcomingGroups(matches: Match[]): MatchGroup[] {
    const scheduled = matches.filter(m => m.status === 'scheduled');
    if (scheduled.length === 0) return [];

    const byGroup = new Map<string, Match[]>();
    for (const match of scheduled) {
      const label = formatKickoffWithDate(match.kickoff_at);
      const list = byGroup.get(label) || [];
      list.push(match);
      byGroup.set(label, list);
    }

    return Array.from(byGroup.entries()).map(([label, hourMatches]) => ({
      label, matches: hourMatches, isLive: false
    }));
  }

  private buildFinishedGroups(matches: Match[]): MatchGroup[] {
    const finished = matches.filter(m => m.status === 'finished');
    if (finished.length === 0) return [];
    return [{ label: 'Resultados', matches: finished, isLive: false }];
  }

  private fetchAndEnrich() {
    this.loading.set(true);
    this.fetchAll$().pipe(
      switchMap(matches => {
        const enriched = matches.map(applyEffectiveStatus);
        const needEvents = enriched.filter(m => m.status === 'live' || m.status === 'finished');

        if (needEvents.length === 0) {
          return of(enriched);
        }

        // UNA sola petición batch: match_id=in.(id1,id2,...)
        const ids = needEvents.map(m => m.id).join(',');
        return this.http.get<MatchEvent[]>(this.env.apiBase, {
          params: new HttpParams()
            .set('table', 'match_events')
            .set('match_id', `in.(${ids})`)
            .set('select', '*')
            .set('order', 'minute.asc')
        }).pipe(
          timeout(10000),
          catchError(() => of([] as MatchEvent[])),
          map(allEvents => {
            // Agrupar eventos por match_id
            const byMatch = new Map<string, MatchEvent[]>();
            for (const ev of allEvents) {
              const list = byMatch.get(ev.match_id) ?? [];
              list.push(ev);
              byMatch.set(ev.match_id, list);
            }
            // Guardar en cache y enriquecer
            for (const [matchId, events] of byMatch) {
              this.eventsCache.set(matchId, events);
            }
            return enriched.map(m => this.enrichFromCache(m));
          })
        );
      })
    ).subscribe(matches => {
      this.allMatches.set(matches);
      this.loading.set(false);
    });
  }

  /** Re-fetch solo eventos de partidos live (ligero, para actualizar goles en poll) */
  private fetchEventsForLive(liveMatches: Match[]) {
    if (liveMatches.length === 0) return;
    const ids = liveMatches.map(m => m.id).join(',');
    this.http.get<MatchEvent[]>(this.env.apiBase, {
      params: new HttpParams()
        .set('table', 'match_events')
        .set('match_id', `in.(${ids})`)
        .set('select', '*')
        .set('order', 'minute.asc')
    }).pipe(timeout(8000), catchError(() => of([] as MatchEvent[]))).subscribe(events => {
      const byMatch = new Map<string, MatchEvent[]>();
      for (const ev of events) {
        const list = byMatch.get(ev.match_id) ?? [];
        list.push(ev);
        byMatch.set(ev.match_id, list);
      }
      for (const [matchId, evts] of byMatch) {
        this.eventsCache.set(matchId, evts);
      }
      // Actualizar señal con eventos frescos
      this.allMatches.update(current => current.map(m => this.enrichFromCache(m)));
    });
  }

  /** Enriquece un match con eventos del cache */
  private enrichFromCache(match: Match): Match {
    const events = this.eventsCache.get(match.id);
    if (!events || events.length === 0) return match;
    return {
      ...match,
      events,
      goals: events
        .filter(e => e.type === 'goal' || e.type === 'own_goal')
        .map(e => ({ team: e.team, scorer: e.player, minute: e.minute }))
    };
  }

  private fetchAll$() {
    const live$ = this.http.get<Match[]>(this.env.apiBase, {
      params: new HttpParams().set('table', 'matches').set('status', 'eq.live'),
    }).pipe(timeout(10000), catchError(() => of([] as Match[])));

    const scheduled$ = this.http.get<Match[]>(this.env.apiBase, {
      params: new HttpParams().set('table', 'matches').set('status', 'eq.scheduled').set('order', 'kickoff_at.asc'),
    }).pipe(timeout(10000), catchError(() => of([] as Match[])));

    const finished$ = this.http.get<Match[]>(this.env.apiBase, {
      params: new HttpParams().set('table', 'matches').set('status', 'eq.finished').set('order', 'kickoff_at.desc').set('limit', '10'),
    }).pipe(timeout(10000), catchError(() => of([] as Match[])));

    return forkJoin([live$, scheduled$, finished$]).pipe(
      map(([live, scheduled, finished]) => [...live, ...scheduled, ...finished])
    );
  }
}
