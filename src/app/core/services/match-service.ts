import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { Match, MatchStatus, Goal, MatchEvent, MatchStats } from '../models/match-model';
import { catchError, finalize, forkJoin, map, Observable, of, retry, Subscription, switchMap, timeout, timer, shareReplay } from 'rxjs';
import { sortMatchesByKickoff } from '../../shared/utils/match-sort-util';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT_TOKEN);

  // Signals para el estado
  private readonly _matches = signal<Match[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _activeStatus = signal<MatchStatus>('live');

  // Exposición pública de signals
  readonly matches = computed(() => this._matches());
  readonly loading = computed(() => this._loading());
  readonly error = computed(() => this._error());
  readonly activeStatus = computed(() => this._activeStatus());

  private pollingSubscription?: Subscription;

  // Cache para eventos de partidos finalizados (no cambian más)
  private readonly finishedEventsCache = new Map<string, MatchEvent[]>();

  // Cache para partidos por estado con tiempos de expiración
  private readonly matchesCache = new Map<MatchStatus, CacheEntry<Match[]>>();

  // Tiempos de expiración en milisegundos
  private readonly CACHE_TTL: Record<MatchStatus, number> = {
    live: 0,
    scheduled: 5 * 60 * 1000,
    finished: 30 * 60 * 1000
  };

  /**
   * Obtiene los partidos desde la API proxy.
   */
  fetchMatches(status?: MatchStatus, timeoutMs: number = 15000): Observable<Match[]> {
    if (!status) return this.fetchMatchesFromApi(status, timeoutMs);

    const cachedEntry = this.matchesCache.get(status);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < this.CACHE_TTL[status]) {
      return of(cachedEntry.data);
    }

    return this.fetchMatchesFromApi(status, timeoutMs).pipe(
      map(matches => {
        this.matchesCache.set(status, { data: matches, timestamp: Date.now() });
        return matches;
      })
    );
  }

  private fetchMatchesFromApi(status?: MatchStatus, timeoutMs: number = 15000): Observable<Match[]> {
    let params = new HttpParams().set('table', 'matches');
    if (status) {
      params = params.set('status', `eq.${status}`);
    }

    return this.http.get<Match[]>(this.env.apiBase, { params }).pipe(
      timeout(timeoutMs),
      retry(1),
      shareReplay({ refCount: true, bufferSize: 1, windowTime: 5000 }),
      catchError((err: unknown) => {
        let errorMsg = 'Error al obtener partidos';
        if (err instanceof HttpErrorResponse) {
          errorMsg = `${errorMsg} (${err.status}: ${err.statusText})`;
        } else if (err instanceof Error) {
          errorMsg = `${errorMsg}: ${err.message}`;
        }
        this._error.set(errorMsg);
        return of([]);
      })
    );
  }

  /**
   * Obtiene un partido individual por ID.
   */
  fetchMatchById(matchId: string): Observable<Match | null> {
    const found = this._matches().find(m => m.id === matchId);
    if (found) return of(found);

    const params = new HttpParams()
      .set('table', 'matches')
      .set('id', `eq.${matchId}`);

    return this.http.get<Match[]>(this.env.apiBase, { params }).pipe(
      timeout(10000),
      retry(1),
      map(matches => matches.length > 0 ? matches[0] : null),
      catchError((err: unknown) => {
        let errorMsg = 'Error al obtener el partido';
        if (err instanceof HttpErrorResponse) {
          errorMsg = `${errorMsg} (${err.status}: ${err.statusText})`;
        } else if (err instanceof Error) {
          errorMsg = `${errorMsg}: ${err.message}`;
        }
        this._error.set(errorMsg);
        return of(null);
      })
    );
  }

  /**
   * Obtiene los eventos de un partido específico.
   */
  fetchMatchEvents(matchId: string): Observable<MatchEvent[]> {
    const params = new HttpParams()
      .set('table', 'match_events')
      .set('match_id', `eq.${matchId}`)
      .set('select', '*')
      .set('order', 'minute.asc');

    return this.http.get<MatchEvent[]>(this.env.apiBase, { params }).pipe(
      timeout(10000),
      catchError(() => of([]))
    );
  }

  /**
   * Obtiene datos en vivo (eventos + stats).
   */
  private fetchLiveData(matchId: string): Observable<{ events: MatchEvent[]; stats: MatchStats[] }> {
    const eventsParams = new HttpParams()
      .set('table', 'match_events')
      .set('match_id', `eq.${matchId}`)
      .set('select', '*')
      .set('order', 'minute.asc');

    const statsParams = new HttpParams()
      .set('table', 'match_stats')
      .set('match_id', `eq.${matchId}`)
      .set('select', '*');

    const events$ = this.http.get<MatchEvent[]>(this.env.apiBase, { params: eventsParams }).pipe(
      timeout(10000), catchError(() => of([] as MatchEvent[]))
    );
    const stats$ = this.http.get<MatchStats[]>(this.env.apiBase, { params: statsParams }).pipe(
      timeout(10000), catchError(() => of([] as MatchStats[]))
    );

    return forkJoin([events$, stats$]).pipe(
      map(([events, stats]) => ({ events, stats }))
    );
  }

  /**
   * Obtiene partidos y enriquece con eventos (goles, tarjetas, subs).
   */
  fetchMatchesWithEvents(status?: MatchStatus, timeoutMs: number = 15000): Observable<Match[]> {
    return this.fetchMatches(status, timeoutMs).pipe(
      switchMap(matches => {
        if (matches.length === 0) return of([]);

        const matchesWithEvents$ = matches.map(match => {
          if (match.status === 'live') {
            return this.fetchLiveData(match.id).pipe(
              map(({ events, stats }) => ({
                ...match,
                events,
                stats,
                goals: events
                  .filter(e => e.type === 'goal' || e.type === 'own_goal')
                  .map(e => ({ team: e.team, scorer: e.player, minute: e.minute }))
              }))
            );
          }

          if (match.status === 'finished' && this.finishedEventsCache.has(match.id)) {
            const cachedEvents = this.finishedEventsCache.get(match.id)!;
            return of({
              ...match,
              events: cachedEvents,
              goals: cachedEvents
                .filter(e => e.type === 'goal' || e.type === 'own_goal')
                .map(e => ({ team: e.team, scorer: e.player, minute: e.minute }))
            });
          }

          return this.fetchMatchEvents(match.id).pipe(
            map(events => {
              if (match.status === 'finished') {
                this.finishedEventsCache.set(match.id, events);
              }
              return {
                ...match,
                events,
                goals: events
                  .filter(e => e.type === 'goal' || e.type === 'own_goal')
                  .map(e => ({ team: e.team, scorer: e.player, minute: e.minute }))
              };
            })
          );
        });

        return forkJoin(matchesWithEvents$);
      })
    );
  }

  private applySorting(matches: Match[], status: MatchStatus): Match[] {
    if (status === 'scheduled') return sortMatchesByKickoff(matches, 'asc');
    if (status === 'finished') return sortMatchesByKickoff(matches, 'desc');
    return matches;
  }

  setStatus(status: MatchStatus) {
    this._activeStatus.set(status);
    this.stopPolling();
    this._error.set(null);

    if (status === 'live') {
      this.startPolling();
    } else {
      this._loading.set(true);
      this.fetchMatchesWithEvents(status).pipe(
        finalize(() => this._loading.set(false))
      ).subscribe(matches => {
        this._matches.set(this.applySorting(matches, status));
      });
    }
  }

  startPolling() {
    if (this.pollingSubscription) return;

    this._loading.set(true);
    this.pollingSubscription = timer(0, 120000)
      .pipe(
        switchMap(() => this.fetchMatchesWithEvents('live', 10000)),
        catchError((err: unknown) => {
          console.error('Error en polling:', err);
          return of(this._matches());
        })
      )
      .subscribe(matches => {
        this._matches.set(matches);
        this._loading.set(false);
        this._error.set(null);
      });
  }

  stopPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  clearCache() {
    this.matchesCache.clear();
    this.finishedEventsCache.clear();
  }
}
