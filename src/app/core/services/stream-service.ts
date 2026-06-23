import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { MatchStream } from '../models/stream-model';
import { catchError, finalize, map, Observable, of, timeout } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StreamService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT_TOKEN);

  private readonly _streams = signal<MatchStream[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly streams = this._streams.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly activeStream = signal<MatchStream | null>(null);

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
      catchError((err: HttpErrorResponse) => {
        this._error.set(`Error al cargar transmisiones: ${err.statusText || err.message}`);
        return of([]);
      }),
      finalize(() => this._loading.set(false))
    ).subscribe(streams => {
      this._streams.set(streams);
      if (streams.length > 0 && !this.activeStream()) {
        this.activeStream.set(streams[0]);
      }
    });
  }

  selectStream(stream: MatchStream): void {
    this.activeStream.set(stream);
  }

  checkAvailability(matchId: string): Observable<boolean> {
    return this.http.get<{ id: string }[]>(`${this.env.supabaseUrl}/match_streams`, {
      params: { match_id: `eq.${matchId}`, select: 'id' },
      headers: {
        'apikey': this.env.supabaseKey,
        'Authorization': `Bearer ${this.env.supabaseKey}`
      }
    }).pipe(
      timeout(5000),
      map(streams => streams.length > 0),
      catchError(() => of(false))
    );
  }
}
