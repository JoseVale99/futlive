import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { LEAGUE_LIST, League } from '../../shared/constants/leagues';
import { environment } from '../../../environments/environment';
import { Match } from '../../core/models/match-model';
import { catchError, forkJoin, map, of, timeout } from 'rxjs';

interface LeagueCardData {
  league: League;
  liveCount: number;
  scheduledCount: number;
  loading: boolean;
}

@Component({
  selector: 'app-leagues-landing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-[#0a0e17] pb-24">
      <!-- Header -->
      <div class="bg-gray-50 dark:bg-[#0a0e17] border-b border-gray-200 dark:border-white/5">
        <div class="max-w-6xl mx-auto px-4 pt-8 pb-6">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Mejores ligas</span>
            <div class="flex-1 h-px bg-gray-200 dark:bg-white/10"></div>
          </div>
          <h1 class="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Ligas del mundo</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">Partidos, posiciones y goleadores de las competiciones más importantes. Tocá una liga para ver todo.</p>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 py-6">
        @if (initialLoading()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (i of [1,2,3,4,5,6,7,8,9]; track i) {
              <div class="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-2xl p-5 animate-pulse h-44"></div>
            }
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (card of cards(); track card.league.slug) {
              <button
                type="button"
                (click)="openLeague(card.league)"
                [class]="card.league.featured
                  ? 'group relative overflow-hidden rounded-2xl sm:col-span-2 lg:col-span-3 bg-linear-to-br from-amber-500/10 via-yellow-500/5 to-transparent dark:from-amber-500/15 dark:via-yellow-500/8 border-2 border-amber-400/40 dark:border-amber-500/30 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-0.5 transition-all duration-200 text-left cursor-pointer'
                  : 'group relative overflow-hidden rounded-2xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 hover:border-blue-400 dark:hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all duration-200 text-left cursor-pointer'"
              >
                <!-- Gradient header strip -->
                <div [class]="'h-1.5 w-full bg-linear-to-r ' + card.league.accent"></div>

                <div class="p-5">
                  <!-- League badge + name -->
                  <div class="flex items-start justify-between gap-3 mb-4">
                    <div class="flex items-center gap-3 min-w-0">
                      <div [class]="card.league.featured
                        ? 'shrink-0 w-14 h-14 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg ring-2 ring-amber-400/40 ' + card.league.iconBg
                        : 'shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-lg ' + card.league.iconBg">
                        @if (card.league.featured) {
                          <span class="text-xl">🏆</span>
                        } @else {
                          {{ card.league.shortName.slice(0, 3) }}
                        }
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <h2 class="text-base font-black text-gray-900 dark:text-white truncate">{{ card.league.name }}</h2>
                          @if (card.league.featured) {
                            <span class="shrink-0 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15 px-1.5 py-0.5 rounded">Destacado</span>
                          }
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ card.league.country }}</p>
                      </div>
                    </div>
                    <svg class="w-5 h-5 text-gray-400 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>

                  <!-- Live indicator + counts -->
                  @if (card.loading) {
                    <div class="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      <div class="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                      Cargando…
                    </div>
                  } @else if (card.liveCount > 0) {
                    <div class="flex items-center gap-2 mb-2">
                      <span class="relative flex h-2 w-2">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <span class="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider">{{ card.liveCount }} en vivo</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>{{ card.scheduledCount }} programados</span>
                    </div>
                  } @else {
                    <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                      <span>{{ card.scheduledCount }} programados</span>
                    </div>
                  }
                </div>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class LeaguesLandingComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly cards = signal<LeagueCardData[]>([]);
  readonly initialLoading = signal(true);

  ngOnInit() {
    const seed = LEAGUE_LIST.map(l => ({ league: l, liveCount: 0, scheduledCount: 0, loading: true }));
    this.cards.set(seed);
    this.initialLoading.set(false);

    for (const league of LEAGUE_LIST) {
      this.fetchCounts(league.slug);
    }
  }

  private fetchCounts(slug: string) {
    const live$ = this.http.get<Match[]>(environment.apiBase, {
      params: new HttpParams().set('league', slug).set('status', 'live'),
    }).pipe(timeout(10000), catchError(() => of([] as Match[])));

    const scheduled$ = this.http.get<Match[]>(environment.apiBase, {
      params: new HttpParams().set('league', slug).set('status', 'scheduled'),
    }).pipe(timeout(10000), catchError(() => of([] as Match[])));

    forkJoin([live$, scheduled$]).pipe(
      map(([live, scheduled]) => ({ slug, liveCount: live.length, scheduledCount: scheduled.length }))
    ).subscribe(({ slug, liveCount, scheduledCount }) => {
      this.cards.update(prev => prev.map(c =>
        c.league.slug === slug ? { ...c, liveCount, scheduledCount, loading: false } : c
      ));
    });
  }

  openLeague(league: League) {
    this.router.navigate(['/ligas', league.slug]);
  }
}