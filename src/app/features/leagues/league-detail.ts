import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { getLeague, leagueHttpParams } from '../../shared/constants/leagues';
import { Match } from '../../core/models/match-model';
import { GroupStanding } from '../../core/models/standings-model';
import { catchError, forkJoin, map, of, Subscription, timeout } from 'rxjs';
import { APP_CONSTANTS } from '../../shared/constants/app-constants';
import { translateTeamName } from '../../shared/utils/team-name-util';

type TabId = 'matches' | 'standings' | 'scorers';
type MatchStatus = 'live' | 'scheduled' | 'finished';

interface ScorerRow {
  rank: number;
  name: string;
  team: string;
  teamCode: string;
  photo: string;
  value: number;
}

@Component({
  selector: 'app-league-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-[#0a0e17] pb-24">
      @if (league()) {
        <!-- Header strip with league branding -->
        <div class="relative overflow-hidden">
          <div [class]="'absolute inset-0 bg-linear-to-br ' + league()!.accent + ' opacity-90'"></div>
          <div class="absolute inset-0 bg-black/10"></div>

          <div class="relative max-w-6xl mx-auto px-4 py-8">
            <button
              type="button"
              (click)="goBack()"
              class="mb-4 inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              Todas las ligas
            </button>

            <div class="flex items-center gap-4">
              <div [class]="'shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-white text-xl sm:text-2xl shadow-2xl bg-white/20 backdrop-blur-sm'">
                {{ league()!.shortName.slice(0, 4) }}
              </div>
              <div class="min-w-0">
                <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">{{ league()!.name }}</h1>
                <p class="text-sm text-white/80">{{ league()!.country }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="bg-gray-50 dark:bg-[#0a0e17] border-b border-gray-200 dark:border-white/5 sticky top-0 z-20 backdrop-blur-md">
          <div class="max-w-6xl mx-auto px-4">
            <nav class="flex gap-1">
              <button
                (click)="activeTab.set('matches')"
                [class]="activeTab() === 'matches'
                  ? 'px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-500 transition-colors'
                  : 'px-5 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-b-2 border-transparent transition-colors cursor-pointer'"
              >
                Partidos
              </button>
              <button
                (click)="activeTab.set('standings')"
                [class]="activeTab() === 'standings'
                  ? 'px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-500 transition-colors'
                  : 'px-5 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-b-2 border-transparent transition-colors cursor-pointer'"
              >
                Posiciones
              </button>
              <button
                (click)="activeTab.set('scorers')"
                [class]="activeTab() === 'scorers'
                  ? 'px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-500 transition-colors'
                  : 'px-5 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-b-2 border-transparent transition-colors cursor-pointer'"
              >
                Goleadores
              </button>
            </nav>
          </div>
        </div>
      }

      <!-- Content -->
      <div class="max-w-6xl mx-auto px-4 py-6">
        @if (loading() && !matches().length) {
          <div class="flex items-center justify-center py-32">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-gray-700 border-t-blue-500"></div>
          </div>
        } @else if (activeTab() === 'matches') {
          <!-- Match status sub-tabs -->
          <div class="flex gap-1 mb-4 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-lg p-1">
            @for (st of matchStatusTabs; track st.id) {
              <button
                type="button"
                (click)="matchStatus.set(st.id)"
                [class]="matchStatus() === st.id
                  ? 'flex-1 px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-white/5 rounded-md transition-all'
                  : 'flex-1 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md transition-all cursor-pointer'"
              >
                {{ st.label }}
                @if (countByStatus()[st.id] > 0) {
                  <span class="ml-1 text-[10px] text-gray-400 dark:text-gray-500">({{ countByStatus()[st.id] }})</span>
                }
              </button>
            }
          </div>

          @if (filteredMatches().length === 0) {
            <div class="text-center py-20">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg class="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <p class="text-gray-400 dark:text-gray-500 text-sm">No hay partidos en este estado</p>
            </div>
          } @else {
            <div class="space-y-2">
              @for (match of filteredMatches(); track match.id) {
                @if (match.status === 'live') {
                  <div class="relative rounded-xl border border-red-500/30 dark:border-red-500/20 bg-white dark:bg-[#111827] overflow-hidden shadow-lg shadow-red-500/5">
                    <div class="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-red-500 via-orange-500 to-yellow-500"></div>
                    <div class="p-4">
                      <div class="flex items-center justify-center gap-2 mb-3">
                        <span class="relative flex h-2 w-2">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span class="text-[10px] font-bold text-red-500 uppercase tracking-wider">En vivo</span>
                        @if (match.time_elapsed != null) {
                          <span class="text-[10px] font-bold text-red-500">{{ match.time_elapsed }}'</span>
                        }
                      </div>
                      <button type="button" (click)="goToMatch(match)" class="w-full flex items-center gap-3 cursor-pointer">
                        <div class="flex flex-col items-center gap-1 flex-1 min-w-0">
                          <img [src]="match.home_flag" [alt]="match.home_team" (error)="handleImgError($event)" class="w-9 h-9 rounded-lg object-cover">
                          <span class="text-xs font-semibold text-gray-900 dark:text-white text-center truncate max-w-full">{{ t(match.home_team) }}</span>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          <span class="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{{ match.home_score ?? 0 }}</span>
                          <span class="text-base text-gray-400 font-light">-</span>
                          <span class="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{{ match.away_score ?? 0 }}</span>
                        </div>
                        <div class="flex flex-col items-center gap-1 flex-1 min-w-0">
                          <img [src]="match.away_flag" [alt]="match.away_team" (error)="handleImgError($event)" class="w-9 h-9 rounded-lg object-cover">
                          <span class="text-xs font-semibold text-gray-900 dark:text-white text-center truncate max-w-full">{{ t(match.away_team) }}</span>
                        </div>
                      </button>
                    </div>
                  </div>
                } @else {
                  <button
                    type="button"
                    (click)="goToMatch(match)"
                    class="group w-full bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-[#1a2236] border border-gray-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/30 rounded-lg p-3.5 flex items-center gap-3 transition-all duration-200 cursor-pointer text-left"
                  >
                    <div class="w-12 text-center shrink-0">
                      @if (match.status === 'finished') {
                        <div class="text-[9px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase">Fin</div>
                      } @else {
                        <div class="text-[11px] font-bold text-gray-700 dark:text-gray-300">{{ formatTime(match.kickoff_at) }}</div>
                      }
                    </div>
                    <div class="flex-1 min-w-0 space-y-1">
                      <div class="flex items-center gap-2">
                        <img [src]="match.home_flag" [alt]="match.home_team" (error)="handleImgError($event)" class="w-4 h-4 rounded-sm object-cover shrink-0">
                        <span class="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">{{ t(match.home_team) }}</span>
                        @if (match.status === 'finished') {
                          <span class="ml-auto text-sm font-bold text-gray-900 dark:text-white tabular-nums">{{ match.home_score }}</span>
                        }
                      </div>
                      <div class="flex items-center gap-2">
                        <img [src]="match.away_flag" [alt]="match.away_team" (error)="handleImgError($event)" class="w-4 h-4 rounded-sm object-cover shrink-0">
                        <span class="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">{{ t(match.away_team) }}</span>
                        @if (match.status === 'finished') {
                          <span class="ml-auto text-sm font-bold text-gray-900 dark:text-white tabular-nums">{{ match.away_score }}</span>
                        }
                      </div>
                    </div>
                    <svg class="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                }
              }
            </div>
          }
        } @else if (activeTab() === 'standings') {
          @if (standings().length === 0) {
            <div class="text-center py-20 bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-white/5">
              <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span class="material-symbols-outlined text-gray-400 text-2xl">leaderboard</span>
              </div>
              <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">Esta competición no tiene tabla de posiciones</p>
              <p class="text-gray-400 dark:text-gray-500 text-xs mt-1">Las copas internacionales (Champions, Libertadores) se juegan por fases</p>
            </div>
          } @else {
            <!-- Standings table grouped by group/zone -->
            @for (group of groupedStandings(); track group.label) {
              <div class="mb-4 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden">
                @if (group.label) {
                  <div class="px-4 py-2.5 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/2">
                    <h3 class="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">{{ group.label }}</h3>
                  </div>
                }
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/5">
                        <th class="px-3 py-2 text-left w-8">#</th>
                        <th class="px-3 py-2 text-left">Equipo</th>
                        <th class="px-2 py-2 text-center w-9">PJ</th>
                        <th class="px-2 py-2 text-center w-9">G</th>
                        <th class="px-2 py-2 text-center w-9">E</th>
                        <th class="px-2 py-2 text-center w-9">P</th>
                        <th class="px-2 py-2 text-center w-9">GF</th>
                        <th class="px-2 py-2 text-center w-9">GC</th>
                        <th class="px-2 py-2 text-center w-9">DG</th>
                        <th class="px-3 py-2 text-center w-12 font-black">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of group.rows; track row.team_external_id) {
                        <tr class="border-b border-gray-50 dark:border-white/2 last:border-0 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                          <td class="px-3 py-2.5">
                            <span [class]="row.rank <= qualifyCutoff() ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black' : 'text-xs font-bold text-gray-500 dark:text-gray-400'">
                              {{ row.rank }}
                            </span>
                          </td>
                          <td class="px-3 py-2.5">
                            <div class="flex items-center gap-2 min-w-0">
                              @if (row.team_logo) {
                                <img [src]="row.team_logo" [alt]="row.team" class="w-5 h-5 rounded object-cover shrink-0">
                              }
                              <span class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ translateTeam(row.team) }}</span>
                            </div>
                          </td>
                          <td class="px-2 py-2.5 text-center text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ row.played }}</td>
                          <td class="px-2 py-2.5 text-center text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ row.win }}</td>
                          <td class="px-2 py-2.5 text-center text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ row.draw }}</td>
                          <td class="px-2 py-2.5 text-center text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ row.lose }}</td>
                          <td class="px-2 py-2.5 text-center text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ row.gf }}</td>
                          <td class="px-2 py-2.5 text-center text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ row.ga }}</td>
                          <td class="px-2 py-2.5 text-center text-xs tabular-nums" [class]="row.gd > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : row.gd < 0 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'">
                            {{ row.gd > 0 ? '+' : '' }}{{ row.gd }}
                          </td>
                          <td class="px-3 py-2.5 text-center">
                            <span class="text-sm font-black text-gray-900 dark:text-white tabular-nums">{{ row.points }}</span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          }
        } @else {
          <!-- Scorers tab -->
          @if (scorers().length === 0 && !loading()) {
            <div class="text-center py-20 bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-white/5">
              <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span class="material-symbols-outlined text-gray-400 text-2xl">sports_soccer</span>
              </div>
              <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">Sin goleadores todavía</p>
              <p class="text-gray-400 dark:text-gray-500 text-xs mt-1">Los datos aparecen cuando arranca la temporada</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              @for (scorer of scorers(); track scorer.rank + '-' + scorer.name) {
                <div [class]="scorer.rank === 1
                  ? 'flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-xl border-l-4'
                  : 'flex items-center gap-3 p-3 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl'">
                  <span class="text-base font-black text-gray-400 dark:text-gray-500 tabular-nums w-6 text-center">{{ scorer.rank }}</span>
                  @if (scorer.photo) {
                    <img [src]="scorer.photo" [alt]="scorer.name" class="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-800 shrink-0" (error)="handleImgError($event)">
                  } @else {
                    <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                  }
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ scorer.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ scorer.team }}</p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-lg font-black text-gray-900 dark:text-white tabular-nums leading-none">{{ scorer.value }}</p>
                    <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">goles</p>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `
})
export class LeagueDetailComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly slug = signal<string>('');
  readonly league = computed(() => getLeague(this.slug()));
  readonly t = translateTeamName;

  readonly activeTab = signal<TabId>('matches');
  readonly matchStatus = signal<MatchStatus>('live');
  readonly loading = signal(true);

  readonly matches = signal<Match[]>([]);
  readonly standings = signal<GroupStanding[]>([]);
  readonly scorers = signal<ScorerRow[]>([]);

  readonly matchStatusTabs: { id: MatchStatus; label: string }[] = [
    { id: 'live', label: 'En vivo' },
    { id: 'scheduled', label: 'Próximos' },
    { id: 'finished', label: 'Resultados' },
  ];

  readonly filteredMatches = computed(() => {
    const status = this.matchStatus();
    return this.matches().filter(m => m.status === status);
  });

  readonly countByStatus = computed(() => {
    const matches = this.matches();
    return {
      live: matches.filter(m => m.status === 'live').length,
      scheduled: matches.filter(m => m.status === 'scheduled').length,
      finished: matches.filter(m => m.status === 'finished').length,
    };
  });

  readonly groupedStandings = computed(() => {
    const all = this.standings();
    if (all.length === 0) return [];
    const byGroup = new Map<string, GroupStanding[]>();
    for (const s of all) {
      const key = s.group_name || '';
      const list = byGroup.get(key) ?? [];
      list.push(s);
      byGroup.set(key, list);
    }
    return Array.from(byGroup.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, rows]) => ({ label, rows: rows.sort((a, b) => a.rank - b.rank) }));
  });

  private routeSub?: Subscription;

  ngOnInit() {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const slug = params.get('slug') ?? '';
      this.slug.set(slug);
      if (slug && getLeague(slug)) {
        this.fetchAll();
      }
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  private fetchAll() {
    const slug = this.slug();
    if (!slug) return;

    this.loading.set(true);

    const live$ = this.http.get<Match[]>(environment.apiBase, {
      params: leagueHttpParams(slug, { status: 'live' }),
    }).pipe(timeout(10000), catchError(() => of([] as Match[])));

    const scheduled$ = this.http.get<Match[]>(environment.apiBase, {
      params: leagueHttpParams(slug, { status: 'scheduled' }),
    }).pipe(timeout(10000), catchError(() => of([] as Match[])));

    const finished$ = this.http.get<Match[]>(environment.apiBase, {
      params: leagueHttpParams(slug, { status: 'finished' }),
    }).pipe(timeout(10000), catchError(() => of([] as Match[])));

    const standings$ = this.http.get<GroupStanding[]>('/api/standings', {
      params: new HttpParams().set('league', slug),
    }).pipe(timeout(10000), catchError(() => of([] as GroupStanding[])));

    const scorers$ = this.http.get<{ players: any[] }>('/api/scorers', {
      params: new HttpParams().set('league', slug),
    }).pipe(
      timeout(10000),
      map(res => this.normalizeScorers(res.players ?? [])),
      catchError(() => of([] as ScorerRow[]))
    );

    forkJoin([live$, scheduled$, finished$, standings$, scorers$]).subscribe(
      ([live, scheduled, finished, standings, scorers]) => {
        // Ordenar scheduled por fecha asc, finished por fecha desc
        const sortedScheduled = [...scheduled].sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime());
        const sortedFinished = [...finished].sort((a, b) => new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime());

        this.matches.set([...live, ...sortedScheduled, ...sortedFinished]);
        this.standings.set(standings);
        this.scorers.set(scorers);
        this.loading.set(false);
      }
    );
  }

  private normalizeScorers(players: any[]): ScorerRow[] {
    const goals = players.filter(p => p.category === 'goals');
    return goals
      .sort((a, b) => a.rank - b.rank)
      .map(p => ({
        rank: p.rank,
        name: p.player_name,
        team: p.team,
        teamCode: p.team_code,
        photo: p.player_photo,
        value: p.value,
      }));
  }

  qualifyCutoff(): number {
    return 4;
  }

  translateTeam(name: string): string {
    return translateTeamName(name);
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  handleImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = APP_CONSTANTS.IMAGES.FLAG_PLACEHOLDER;
  }

  goToMatch(match: Match) {
    this.router.navigate(['/stream', match.id]);
  }

  goBack() {
    this.router.navigate(['/ligas']);
  }
}