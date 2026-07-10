import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { Match, MatchStatus, MatchEvent, MatchStats } from '../models/match-model';
import { catchError, finalize, map, Observable, of, retry, Subscription, switchMap, timeout, timer, shareReplay, tap } from 'rxjs';
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

  // Cache por id de partido (para fetchMatchById). 30s — cubre re-aperturas y
  // tabs duplicados sin chocar con el polling de 90s.
  private readonly matchByIdCache = new Map<string, CacheEntry<Match | null>>();
  private readonly MATCH_BY_ID_TTL = 30_000;

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
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
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

    const cached = this.matchByIdCache.get(matchId);
    if (cached && Date.now() - cached.timestamp < this.MATCH_BY_ID_TTL) {
      return of(cached.data);
    }

    const params = new HttpParams().set('id', matchId);

    return this.http.get<Match[]>(this.env.apiBase, { params }).pipe(
      timeout(10000),
      retry(1),
      map(matches => matches.length > 0 ? matches[0] : null),
      tap(match => this.matchByIdCache.set(matchId, { data: match, timestamp: Date.now() })),
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
   * Con ESPN, los eventos ya vienen en la respuesta del match.
   */
  fetchMatchEvents(matchId: string): Observable<MatchEvent[]> {
    // Intentar desde el match ya cargado en memoria
    const match = this._matches().find(m => m.id === matchId);
    if (match?.events) return of(match.events);

    // Fallback: pedir el match individual a ESPN
    return this.fetchMatchById(matchId).pipe(
      map(m => m?.events || [])
    );
  }

  /**
   * Obtiene datos en vivo (eventos + stats).
   * Con ESPN, ambos ya vienen incluidos en la respuesta del match.
   */
  private fetchLiveData(matchId: string): Observable<{ events: MatchEvent[]; stats: MatchStats[] }> {
    return this.fetchMatchById(matchId).pipe(
      map(match => ({
        events: match?.events || [],
        stats: match?.stats || [],
      }))
    );
  }

  /**
   * Obtiene partidos ya enriquecidos con eventos y stats desde ESPN.
   */
  fetchMatchesWithEvents(status?: MatchStatus, timeoutMs: number = 15000): Observable<Match[]> {
    return this.fetchMatches(status, timeoutMs).pipe(
      map(matches => {
        // ESPN ya devuelve events, stats y goals en la respuesta.
        // Solo aseguramos que goals esté derivado de events si no viene.
        return matches.map(match => {
          if (!match.goals && match.events) {
            return {
              ...match,
              goals: match.events
                .filter(e => e.type === 'goal' || e.type === 'own_goal' || e.type === 'penalty')
                .map(e => ({ team: e.team, scorer: e.player, minute: e.minute }))
            };
          }
          return match;
        });
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
    this.matchByIdCache.clear();
  }
}
