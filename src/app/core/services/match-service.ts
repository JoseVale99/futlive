import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { Match, MatchStatus } from '../models/match-model';
import { catchError, finalize, Observable, of, retry, Subscription, switchMap, timeout, timer } from 'rxjs';
import { sortMatchesByKickoff } from '../../shared/utils/match-sort-util';

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

  /**
   * Obtiene los partidos desde la API de Supabase.
   * @param status Filtro por estado del partido.
   * @param timeoutMs Tiempo máximo de espera en milisegundos.
   */
  fetchMatches(status?: MatchStatus, timeoutMs: number = 15000): Observable<Match[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', `eq.${status}`);
    }

    return this.http.get<Match[]>(`${this.env.supabaseUrl}/rest/v1/matches`, {
      params,
      headers: {
        'apikey': this.env.supabaseKey,
        'Authorization': `Bearer ${this.env.supabaseKey}`
      }
    }).pipe(
      timeout(timeoutMs),
      retry(1),
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
      this.fetchMatches(status).pipe(
        finalize(() => {
          this._loading.set(false);
        })
      ).subscribe(matches => {
        this._matches.set(this.applySorting(matches, status));
      });
    }
  }

  /**
   * Inicia el ciclo de polling cada 30 segundos para partidos en vivo.
   */
  startPolling() {
    if (this.pollingSubscription) return;

    this._loading.set(true);
    this.pollingSubscription = timer(0, 30000)
      .pipe(
        switchMap(() => this.fetchMatches('live', 10000)),
        catchError((err: unknown) => {
          console.error('Error en polling:', err);
          return of(this._matches()); // Mantener los datos anteriores en caso de error
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
}
