import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StreamService } from './stream-service';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { MatchStream } from '../models/stream-model';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('StreamService', () => {
  let service: StreamService;
  let httpMock: HttpTestingController;
  const mockEnv = {
    supabaseUrl: 'https://mock.supabase.co',
    supabaseKey: 'mock-key'
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
        { id: '1', embed_name: 'Stream 1' },
        { id: '2', embed_name: 'Stream 2' }
      ];

      service.fetchStreams('match-123');
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(req => req.url.includes('/match_streams'));
      expect(req.request.params.get('match_id')).toBe('eq.match-123');
      expect(req.request.headers.get('apikey')).toBe('mock-key');

      req.flush(mockStreams);

      expect(service.loading()).toBe(false);
      expect(service.streams().length).toBe(2);
      expect(service.activeStream()?.id).toBe('1');
    });

    it('should handle errors correctly', () => {
      service.fetchStreams('match-123');
      const req = httpMock.expectOne(req => req.url.includes('/match_streams'));
      req.error(new ErrorEvent('Network error'), { status: 500, statusText: 'Internal Server Error' });

      expect(service.loading()).toBe(false);
      expect(service.error()).toContain('Internal Server Error');
      expect(service.streams()).toEqual([]);
    });
  });

  describe('checkAvailability', () => {
    it('should return true if streams exist', () => {
      service.checkAvailability('match-123').subscribe(available => {
        expect(available).toBe(true);
      });

      const req = httpMock.expectOne(req => req.url.includes('/match_streams'));
      req.flush([{ id: '1' }]);
    });

    it('should return false if no streams exist', () => {
      service.checkAvailability('match-123').subscribe(available => {
        expect(available).toBe(false);
      });

      const req = httpMock.expectOne(req => req.url.includes('/match_streams'));
      req.flush([]);
    });

    it('should return false on error', () => {
      service.checkAvailability('match-123').subscribe(available => {
        expect(available).toBe(false);
      });

      const req = httpMock.expectOne(req => req.url.includes('/match_streams'));
      req.error(new ErrorEvent('Timeout'));
    });
  });
});
