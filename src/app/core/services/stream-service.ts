import { Injectable, inject, signal, computed } from '@angular/core';
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

  // Mapa para cachear streams por partido
  private _streamsCache = signal<Map<string, MatchStream[]>>(new Map());

  readonly streams = this._streams.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly activeStream = this._activeStream.asReadonly();

  getStreamsForMatch(matchId: string) {
    return computed(() => this._streamsCache().get(matchId) || []);
  }

  fetchStreams(matchId: string): void {
    this._loading.set(true);
    this._error.set(null);

    this.http.get<MatchStream[]>(`${this.env.supabaseUrl}/match_streams`, {
      params: { match_id: `eq.${matchId}`, select: '*' },
      headers: {
        'apikey': this.env.supabaseKey,
        'Authorization': `Bearer ${this.env.supabaseKey}`
      }
    }).pipe(
      timeout(15000),
      catchError(err => {
        this._error.set('Error al cargar transmisiones');
        this._loading.set(false);
        return of([]);
      })
    ).subscribe(streams => {
      this._streams.set(streams);
      this._activeStream.set(streams.length > 0 ? streams[0] : null);

      // Actualizar cache
      const newCache = new Map(this._streamsCache());
      newCache.set(matchId, streams);
      this._streamsCache.set(newCache);

      this._loading.set(false);
    });
  }

  selectStream(stream: MatchStream): void {
    this._activeStream.set(stream);
  }

  checkAvailability(matchId: string): Observable<boolean> {
    return this.http.get<{ id: string }[]>(`${this.env.supabaseUrl}/match_streams`, {
      params: { match_id: `eq.${matchId}`, select: 'id', limit: '1' },
      headers: {
        'apikey': this.env.supabaseKey,
        'Authorization': `Bearer ${this.env.supabaseKey}`
      }
    }).pipe(
      timeout(5000),
      map(result => result.length > 0),
      catchError(() => of(false))
    );
  }
}
