import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { Match, MatchStatus } from '../models/match-model';
import { catchError, Observable, of, retry, Subscription, switchMap, timer } from 'rxjs';

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
   */
  fetchMatches(status?: MatchStatus): Observable<Match[]> {
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
      retry(1),
      catchError(err => {
        this._error.set(`Error al obtener partidos: ${err.message || 'Error desconocido'}`);
        return of([]);
      })
    );
  }

  /**
   * Cambia el estado activo y reinicia el polling si es necesario.
   * @param status Nuevo estado a filtrar.
   */
  setStatus(status: MatchStatus) {
    this._activeStatus.set(status);
    this.stopPolling();
    
    if (status === 'live') {
      this.startPolling();
    } else {
      this._loading.set(true);
      this.fetchMatches(status).subscribe(matches => {
        this._matches.set(matches);
        this._loading.set(false);
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
        switchMap(() => this.fetchMatches('live')),
        catchError(err => {
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
