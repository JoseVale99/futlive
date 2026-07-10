import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StreamService } from './stream-service';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { MatchStream } from '../models/stream-model';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('StreamService', () => {
  let service: StreamService;
  let httpMock: HttpTestingController;
  const mockEnv = {
    production: false,
    apiBase: '/api/v1',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StreamService,
        { provide: ENVIRONMENT_TOKEN, useValue: mockEnv }
      ]
    });
    service = TestBed.inject(StreamService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchStreams', () => {
    it('should fetch streams and update signals', () => {
      const mockStreams: Partial<MatchStream>[] = [
        { id: '1', embed_name: 'Stream 1', embed_url: 'https://example.com/1' },
        { id: '2', embed_name: 'Stream 2', embed_url: 'https://example.com/2' }
      ];

      service.fetchStreams('match-123');
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(r => r.url.includes('streams') && r.params.get('matchId') === 'match-123');
      req.flush({ streams: mockStreams, count: 2 });

      expect(service.loading()).toBe(false);
      expect(service.streams().length).toBe(2);
      expect(service.activeStream()?.id).toBe('1');
    });

    it('should handle errors gracefully', () => {
      service.fetchStreams('match-123');
      const req = httpMock.expectOne(r => r.url.includes('streams'));
      req.error(new ErrorEvent('Network error'));

      expect(service.loading()).toBe(false);
      expect(service.streams()).toEqual([]);
    });

    it('should serve from cache within TTL without a new HTTP request', () => {
      const mockStreams: Partial<MatchStream>[] = [
        { id: '1', embed_name: 'Stream 1', embed_url: 'https://example.com/1' },
      ];

      service.fetchStreams('match-123');
      httpMock.expectOne(r => r.url.includes('streams')).flush({ streams: mockStreams, count: 1 });

      // Segunda llamada dentro del TTL → no debe hacer otra petición HTTP
      service.fetchStreams('match-123');
      httpMock.expectNone(r => r.url.includes('streams'));

      expect(service.streams().length).toBe(1);
      expect(service.activeStream()?.id).toBe('1');
    });
  });
});
