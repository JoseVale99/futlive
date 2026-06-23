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
    live: 0, // No cacheamos partidos en vivo, siempre pedimos frescos
    scheduled: 5 * 60 * 1000, // 5 minutos
    finished: 30 * 60 * 1000 // 30 minutos
  };

  /**
   * Obtiene los partidos desde la API de Supabase.
   * @param status Filtro por estado del partido.
   * @param timeoutMs Tiempo máximo de espera en milisegundos.
   */
  fetchMatches(status?: MatchStatus, timeoutMs: number = 15000): Observable<Match[]> {
    // Si no hay estado, no cacheamos
    if (!status) return this.fetchMatchesFromApi(status, timeoutMs);

    // Verificamos si tenemos cache válido
    const cachedEntry = this.matchesCache.get(status);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < this.CACHE_TTL[status]) {
      return of(cachedEntry.data);
    }

    // Si no hay cache válido, pedimos a la API
    return this.fetchMatchesFromApi(status, timeoutMs).pipe(
      map(matches => {
        // Guardamos en cache
        this.matchesCache.set(status, {
          data: matches,
          timestamp: Date.now()
        });
        return matches;
      })
    );
  }

  /**
   * Obtiene partidos directamente desde la API (sin cache).
   */
  private fetchMatchesFromApi(status?: MatchStatus, timeoutMs: number = 15000): Observable<Match[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', `eq.${status}`);
    }

    return this.http.get<Match[]>(`${this.env.supabaseUrl}/matches`, {
      params,
      headers: {
        'apikey': this.env.supabaseKey,
        'Authorization': `Bearer ${this.env.supabaseKey}`
      }
    }).pipe(
      timeout(timeoutMs),
      retry(1),
      shareReplay({ refCount: true, bufferSize: 1, windowTime: 5000 }), // Cache rápido para duplicados
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
   * Primero busca en el signal de matches en memoria.
   * Si no está, hace request a Supabase con id=eq.{matchId}.
   */
  fetchMatchById(matchId: string): Observable<Match | null> {
    const found = this._matches().find(m => m.id === matchId);
    if (found) {
      return of(found);
    }

    const params = new HttpParams().set('id', `eq.${matchId}`);
    return this.http.get<Match[]>(`${this.env.supabaseUrl}/matches`, {
      params,
      headers: {
        'apikey': this.env.supabaseKey,
        'Authorization': `Bearer ${this.env.supabaseKey}`
      }
    }).pipe(
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
    return this.http.get<MatchEvent[]>(`${this.env.supabaseUrl}/match_events`, {
      params: { match_id: `eq.${matchId}`, select: '*', order: 'minute.asc' },
      headers: {
        'apikey': this.env.supabaseKey,
        'Authorization': `Bearer ${this.env.supabaseKey}`
      }
    }).pipe(
      timeout(10000),
      catchError(() => of([]))
    );
  }

  /**
   * Obtiene datos en vivo desde lacancha.tv API (eventos + stats reales).
   * Si falla (CORS u otro), cae a Supabase match_events.
   */
  private fetchLiveData(matchId: string): Observable<{ events: MatchEvent[]; stats: MatchStats[] }> {
    return this.http.get<{
      match: { status: string; home_score: number; away_score: number; time_elapsed: string };
      events: MatchEvent[];
      stats: MatchStats[];
    }>(`https://lacancha.tv/api/match/${matchId}/live`).pipe(
      timeout(8000),
      map(res => ({ events: res.events || [], stats: res.stats || [] })),
      catchError(() => {
        // Fallback a Supabase si lacancha.tv falla (CORS, timeout, etc)
        return this.fetchMatchEvents(matchId).pipe(
          map(events => ({ events, stats: [] as MatchStats[] }))
        );
      })
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
          // Para partidos LIVE: usar lacancha.tv API para datos en tiempo real
          if (match.status === 'live') {
            return this.fetchLiveData(match.id).pipe(
              map(({ events, stats }) => ({
                ...match,
                events,
                stats,
                goals: events
                  .filter(e => e.type === 'goal')
                  .map(e => ({ team: e.team, scorer: e.player, minute: e.minute }))
              }))
            );
          }

          // Si el partido está finalizado y tenemos sus eventos en cache, usamos el cache
          if (match.status === 'finished' && this.finishedEventsCache.has(match.id)) {
            const cachedEvents = this.finishedEventsCache.get(match.id)!;
            return of({
              ...match,
              events: cachedEvents,
              goals: cachedEvents
                .filter(e => e.type === 'goal')
                .map(e => ({ team: e.team, scorer: e.player, minute: e.minute }))
            });
          }

          // Para scheduled/finished sin cache: pedir a Supabase
          return this.fetchMatchEvents(match.id).pipe(
            map(events => {
              if (match.status === 'finished') {
                this.finishedEventsCache.set(match.id, events);
              }
              return {
                ...match,
                events,
                goals: events
                  .filter(e => e.type === 'goal')
                  .map(e => ({ team: e.team, scorer: e.player, minute: e.minute }))
              };
            })
          );
        });

        return forkJoin(matchesWithEvents$);
      })
    );
  }

  /**
   * Aplica el ordenamiento adecuado según el estado del partido.
   */
  private applySorting(matches: Match[], status: MatchStatus): Match[] {
    if (status === 'scheduled') {
      return sortMatchesByKickoff(matches, 'asc');
    } else if (status === 'finished') {
      return sortMatchesByKickoff(matches, 'desc');
    }
    return matches;
  }

  /**
   * Cambia el estado activo y reinicia el polling si es necesario.
   * @param status Nuevo estado a filtrar.
   */
  setStatus(status: MatchStatus) {
    this._activeStatus.set(status);
    this.stopPolling();
    this._error.set(null);

    if (status === 'live') {
      this.startPolling();
    } else {
      this._loading.set(true);
      this.fetchMatchesWithEvents(status).pipe(
        finalize(() => {
          this._loading.set(false);
        })
      ).subscribe(matches => {
        this._matches.set(this.applySorting(matches, status));
      });
    }
  }

  /**
   * Inicia el ciclo de polling cada 120 segundos (2 minutos) para partidos en vivo.
   */
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

  /**
   * Detiene el ciclo de polling.
   */
  stopPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  /**
   * Limpia toda la cache manualmente (si es necesario).
   */
  clearCache() {
    this.matchesCache.clear();
    this.finishedEventsCache.clear();
  }
}
