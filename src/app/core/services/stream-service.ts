import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { MatchStream } from '../models/stream-model';
import { Observable, map, catchError, of, timeout } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StreamService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT_TOKEN);

  private readonly _streams = signal<MatchStream[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _activeStream = signal<MatchStream | null>(null);

  readonly streams = this._streams.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly activeStream = this._activeStream.asReadonly();

  fetchStreams(matchId: string): void {
    this._loading.set(true);
    this._error.set(null);

    // Primero intentar Supabase match_streams
    this.http.get<MatchStream[]>(`${this.env.supabaseUrl}/match_streams`, {
      params: { match_id: `eq.${matchId}`, select: '*' },
      headers: {
        'apikey': this.env.supabaseKey,
        'Authorization': `Bearer ${this.env.supabaseKey}`
      }
    }).pipe(
      timeout(15000),
      catchError(() => of([]))
    ).subscribe(streams => {
      if (streams.length > 0) {
        this._streams.set(streams);
        this._activeStream.set(streams[0]);
        this._loading.set(false);
      } else {
        // Fallback: obtener streams de lacancha.tv API
        this.fetchFromLaCancha(matchId);
      }
    });
  }

  /**
   * Obtiene streams de lacancha.tv via el proxy (local o Vercel serverless).
   */
  private fetchFromLaCancha(matchId: string): void {
    // En producción usa /api/streams (Vercel function)
    // En dev usa http://localhost:3001/api/streams (proxy local)
    const proxyUrl = this.env.production
      ? '/api/streams'
      : 'http://localhost:3001/api/streams';

    this.http.get<{ streams: MatchStream[]; count: number }>(
      proxyUrl,
      { params: { matchId, _t: Date.now().toString() } }
    ).pipe(
      timeout(10000),
      catchError(() => of({ streams: [] as MatchStream[], count: 0 }))
    ).subscribe(response => {
      const streams = response.streams || [];
      this._streams.set(streams);
      this._activeStream.set(streams.length > 0 ? streams[0] : null);
      this._loading.set(false);
    });
  }

  selectStream(stream: MatchStream): void {
    this._activeStream.set(stream);
  }

  checkAvailability(matchId: string): Observable<boolean> {
    // Siempre hay streams disponibles via lacancha.tv para partidos live
    return of(true);
  }
}
