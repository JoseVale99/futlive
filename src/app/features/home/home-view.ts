import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../../core/config/environment';
import { Match } from '../../core/models/match-model';
import { forkJoin, of, catchError, timeout, Subscription, timer, switchMap } from 'rxjs';
import { formatKickoffTime, formatScore } from '../../shared/utils/match-format-util';
import { APP_CONSTANTS } from '../../shared/constants/app-constants';

interface MatchGroup {
  label: string;
  matches: Match[];
  isLive: boolean;
}

@Component({
  selector: 'app-home-view',
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div class="max-w-4xl mx-auto px-4 pt-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Programación del día</h2>
          <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">{{ todayFormatted() }}</span>
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-20">
            <div class="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 dark:border-gray-700 border-b-blue-600"></div>
          </div>
        } @else if (groups().length === 0) {
          <div class="text-center py-20">
            <p class="text-gray-500 dark:text-gray-400 text-lg">No hay partidos programados para hoy</p>
          </div>
        } @else {
          <div class="space-y-6">
            @for (group of groups(); track group.label) {
              <!-- Time Group -->
              <div>
                <div class="flex items-center gap-3 mb-3">
                  @if (group.isLive) {
                    <span class="flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-full">
                      <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      EN VIVO
                    </span>
                  } @else {
                    <span class="text-sm font-bold text-gray-600 dark:text-gray-300">{{ group.label }}</span>
                  }
                </div>
                <div class="space-y-2">
                  @for (match of group.matches; track match.id) {
                    <button
                      (click)="goToMatch(match)"
                      class="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer text-left"
                    >
                      <!-- Time / Status -->
                      <div class="w-14 text-center shrink-0">
                        @if (match.status === 'live') {
                          <span class="text-xs font-bold text-red-500">{{ match.time_elapsed }}'</span>
                        } @else if (match.status === 'finished') {
                          <span class="text-xs font-medium text-gray-400">FIN</span>
                        } @else {
                          <span class="text-sm font-bold text-gray-700 dark:text-gray-200">{{ formatTime(match.kickoff_at) }}</span>
                        }
                      </div>

                      <!-- Teams -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <img [src]="match.home_flag" [alt]="match.home_team" (error)="handleImgError($event)" class="w-5 h-5 rounded-full object-cover">
                          <span class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ match.home_team }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <img [src]="match.away_flag" [alt]="match.away_team" (error)="handleImgError($event)" class="w-5 h-5 rounded-full object-cover">
                          <span class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ match.away_team }}</span>
                        </div>
                      </div>

                      <!-- Score -->
                      @if (match.status !== 'scheduled') {
                        <div class="shrink-0 text-right">
                          <div class="text-sm font-bold text-gray-900 dark:text-white">{{ match.home_score }}</div>
                          <div class="text-sm font-bold text-gray-900 dark:text-white">{{ match.away_score }}</div>
                        </div>
                      }

                      <!-- Arrow -->
                      <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </button>
                  }
                </div>
              </div>
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

  readonly allMatches = signal<Match[]>([]);
  readonly loading = signal(true);

  readonly groups = computed(() => {
    const matches = this.allMatches();
    if (matches.length === 0) return [];

    const liveMatches = matches.filter(m => m.status === 'live');
    const scheduledMatches = matches.filter(m => m.status === 'scheduled');
    const finishedMatches = matches.filter(m => m.status === 'finished');

    const groups: MatchGroup[] = [];

    // Live matches first
    if (liveMatches.length > 0) {
      groups.push({ label: 'EN VIVO', matches: liveMatches, isLive: true });
    }

    // Scheduled grouped by hour
    const byHour = new Map<string, Match[]>();
    for (const match of scheduledMatches) {
      const time = formatKickoffTime(match.kickoff_at);
      const list = byHour.get(time) || [];
      list.push(match);
      byHour.set(time, list);
    }
    for (const [time, hourMatches] of byHour) {
      groups.push({ label: time, matches: hourMatches, isLive: false });
    }

    // Finished at the end
    if (finishedMatches.length > 0) {
      groups.push({ label: 'Finalizados', matches: finishedMatches, isLive: false });
    }

    return groups;
  });

  readonly todayFormatted = computed(() => {
    const now = new Date();
    return now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  });

  ngOnInit() {
    this.fetchAllMatches();
    // Polling every 60s to catch status changes (scheduled → live → finished)
    this.pollingSubscription = timer(60_000, 60_000).pipe(
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
