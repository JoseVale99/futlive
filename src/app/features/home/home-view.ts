import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../../core/config/environment';
import { Match, MatchEvent } from '../../core/models/match-model';
import { forkJoin, of, catchError, timeout, Subscription, timer, switchMap } from 'rxjs';
import { formatKickoffTime } from '../../shared/utils/match-format-util';
import { APP_CONSTANTS } from '../../shared/constants/app-constants';

type TabId = 'today' | 'upcoming' | 'finished';

interface MatchGroup {
  label: string;
  matches: Match[];
  isLive: boolean;
}

@Component({
  selector: 'app-home-view',
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-[#0a0e17]">
      <!-- Tabs -->
      <div class="sticky top-[60px] z-10 bg-gray-50/95 dark:bg-[#0a0e17]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/5">
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
                              <span class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 text-center truncate max-w-full">{{ match.home_team }}</span>
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
                              <span class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 text-center truncate max-w-full">{{ match.away_team }}</span>
                            </div>
                          </div>

                          <!-- Goal scorers -->
                          @if (getGoals(match).length > 0) {
                            <div class="border-t border-gray-100 dark:border-white/5 pt-3 mb-4">
                              <div class="flex flex-col sm:flex-row gap-2 sm:gap-8 justify-center">
                                <!-- Home goals -->
                                <div class="flex-1 text-right">
                                  @for (goal of getHomeGoals(match); track goal.id) {
                                    <p class="text-xs text-gray-600 dark:text-gray-400">
                                      <span class="font-medium text-gray-800 dark:text-gray-200">{{ goal.player }}</span>
                                      <span class="text-gray-400 dark:text-gray-500 ml-1">{{ goal.minute }}'</span>
                                    </p>
                                  }
                                </div>
                                <!-- Divider -->
                                <div class="hidden sm:block w-px bg-gray-200 dark:bg-white/10"></div>
                                <!-- Away goals -->
                                <div class="flex-1 text-left">
                                  @for (goal of getAwayGoals(match); track goal.id) {
                                    <p class="text-xs text-gray-600 dark:text-gray-400">
                                      <span class="text-gray-400 dark:text-gray-500 mr-1">{{ goal.minute }}'</span>
                                      <span class="font-medium text-gray-800 dark:text-gray-200">{{ goal.player }}</span>
                                    </p>
                                  }
                                </div>
                              </div>
                            </div>
                          }

                          <!-- CTA Button -->
                          <button
                            (click)="goToMatch(match)"
                            class="w-full py-2.5 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold uppercase tracking-wide transition-colors cursor-pointer"
                          >
                            Ver en vivo
                          </button>
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
                            <span class="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">{{ match.home_team }}</span>
                            @if (match.status === 'finished') {
                              <span class="ml-auto text-sm font-bold text-gray-900 dark:text-white tabular-nums">{{ match.home_score }}</span>
                            }
                          </div>
                          <div class="flex items-center gap-2.5">
                            <img [src]="match.away_flag" [alt]="match.away_team" (error)="handleImgError($event)" class="w-5 h-5 rounded-sm object-cover">
                            <span class="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">{{ match.away_team }}</span>
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

  readonly tabs: { id: TabId; label: string }[] = [
    { id: 'today', label: 'Hoy' },
    { id: 'upcoming', label: 'Próximos' },
    { id: 'finished', label: 'Finalizados' },
  ];

  readonly activeTab = signal<TabId>('today');
  readonly allMatches = signal<Match[]>([]);
  readonly loading = signal(true);

  readonly activeGroups = computed(() => {
    const matches = this.allMatches();
    const tab = this.activeTab();

    if (tab === 'today') return this.buildTodayGroups(matches);
    if (tab === 'upcoming') return this.buildUpcomingGroups(matches);
    return this.buildFinishedGroups(matches);
  });

  ngOnInit() {
    this.fetchAllMatches();
    this.pollingSubscription = timer(30_000, 30_000).pipe(
      switchMap(() => this.fetchAll$())
    ).subscribe(matches => {
      if (matches.length > 0) this.allMatches.set(matches);
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
    return (match.events ?? []).filter(e => e.type === 'goal');
  }

  getHomeGoals(match: Match): MatchEvent[] {
    return this.getGoals(match).filter(e => e.team === 'home');
  }

  getAwayGoals(match: Match): MatchEvent[] {
    return this.getGoals(match).filter(e => e.team === 'away');
  }

  private buildTodayGroups(matches: Match[]): MatchGroup[] {
    const today = new Date().toISOString().slice(0, 10);
    const todayMatches = matches.filter(m => m.kickoff_at.startsWith(today));

    const live = todayMatches.filter(m => m.status === 'live');
    const scheduled = todayMatches.filter(m => m.status === 'scheduled');
    const finished = todayMatches.filter(m => m.status === 'finished');

    const groups: MatchGroup[] = [];

    if (live.length > 0) {
      groups.push({ label: 'En vivo', matches: live, isLive: true });
    }

    const byHour = new Map<string, Match[]>();
    for (const match of scheduled) {
      const time = formatKickoffTime(match.kickoff_at);
      const list = byHour.get(time) || [];
      list.push(match);
      byHour.set(time, list);
    }
    for (const [time, hourMatches] of byHour) {
      groups.push({ label: time, matches: hourMatches, isLive: false });
    }

    if (finished.length > 0) {
      groups.push({ label: 'Finalizados', matches: finished, isLive: false });
    }

    return groups;
  }

  private buildUpcomingGroups(matches: Match[]): MatchGroup[] {
    const scheduled = matches.filter(m => m.status === 'scheduled');
    if (scheduled.length === 0) return [];

    const byHour = new Map<string, Match[]>();
    for (const match of scheduled) {
      const time = formatKickoffTime(match.kickoff_at);
      const list = byHour.get(time) || [];
      list.push(match);
      byHour.set(time, list);
    }

    return Array.from(byHour.entries()).map(([time, hourMatches]) => ({
      label: time, matches: hourMatches, isLive: false
    }));
  }

  private buildFinishedGroups(matches: Match[]): MatchGroup[] {
    const finished = matches.filter(m => m.status === 'finished');
    if (finished.length === 0) return [];
    return [{ label: 'Resultados', matches: finished, isLive: false }];
  }

  private fetchAllMatches() {
    this.loading.set(true);
    this.fetchAll$().subscribe(matches => {
      this.allMatches.set(matches);
      this.loading.set(false);
    });
  }

  private fetchAll$() {
    const headers = new HttpHeaders({
      apikey: this.env.supabaseKey,
      Authorization: `Bearer ${this.env.supabaseKey}`,
    });
    const base = `${this.env.supabaseUrl}/matches`;

    const live$ = this.http.get<Match[]>(base, {
      params: new HttpParams().set('status', 'eq.live'),
      headers
    }).pipe(timeout(10000), catchError(() => of([])));

    const scheduled$ = this.http.get<Match[]>(base, {
      params: new HttpParams().set('status', 'eq.scheduled').set('order', 'kickoff_at.asc'),
      headers
    }).pipe(timeout(10000), catchError(() => of([])));

    const finished$ = this.http.get<Match[]>(base, {
      params: new HttpParams().set('status', 'eq.finished').set('order', 'kickoff_at.desc').set('limit', '10'),
      headers
    }).pipe(timeout(10000), catchError(() => of([])));

    return forkJoin([live$, scheduled$, finished$]).pipe(
      switchMap(([live, scheduled, finished]) => of([...live, ...scheduled, ...finished]))
    );
  }
}
