import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { MatchStream } from '../models/stream-model';
import { Observable, catchError, of, timeout, shareReplay } from 'rxjs';

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

  // TTL cache alineado con s-maxage=30 del CDN. Cubre re-aperturas y tabs duplicados.
  private readonly streamsCache = new Map<string, { data: MatchStream[]; timestamp: number }>();
  private readonly STREAMS_TTL = 30_000;

  // Singleflight: un Observable compartido por matchId → N subscribers concurrentes
  // hacen UN solo fetch. windowTime=30s mantiene el valor en cache para re-aperturas.
  private readonly streams$ = new Map<string, Observable<{ streams: MatchStream[]; count: number }>>();

  private getStreams$(matchId: string): Observable<{ streams: MatchStream[]; count: number }> {
    let obs = this.streams$.get(matchId);
    if (!obs) {
      const proxyUrl = this.env.production
        ? '/api/streams'
        : 'http://localhost:3001/api/streams';
      obs = this.http.get<{ streams: MatchStream[]; count: number }>(
        proxyUrl,
        { params: { matchId } }
      ).pipe(
        timeout(10000),
        catchError(() => of({ streams: [] as MatchStream[], count: 0 })),
        shareReplay({ refCount: true, bufferSize: 1, windowTime: 30_000 })
      );
      this.streams$.set(matchId, obs);
    }
    return obs;
  }

  fetchStreams(matchId: string): void {
    this._loading.set(true);
    this._error.set(null);

    const cached = this.streamsCache.get(matchId);
    if (cached && Date.now() - cached.timestamp < this.STREAMS_TTL) {
      this._streams.set(cached.data);
      this._activeStream.set(this.preferHd(cached.data));
      this._loading.set(false);
      return;
    }

    this.getStreams$(matchId).subscribe(response => {
      const streams = response.streams ?? [];
      this.streamsCache.set(matchId, { data: streams, timestamp: Date.now() });
      this._streams.set(streams);
      this._activeStream.set(this.preferHd(streams));
      this._loading.set(false);
    });
  }

  /** Helper: pick first HD stream if any, else first, else null. */
  private preferHd(streams: MatchStream[]): MatchStream | null {
    if (streams.length === 0) return null;
    return streams.find(s => /hd|4k|1080|720|hevc/i.test(s.embed_name)) ?? streams[0];
  }

  selectStream(stream: MatchStream): void {
    this._activeStream.set(stream);
  }

  checkAvailability(matchId: string): Observable<boolean> {
    return of(true);
  }
}
