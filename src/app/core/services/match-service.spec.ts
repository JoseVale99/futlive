import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatchService } from './match-service';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { MatchStatus } from '../models/match-model';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('MatchService', () => {
  let service: MatchService;
  let httpMock: HttpTestingController;

  const mockEnv = {
    production: false,
    apiBase: '/api/v1',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        MatchService,
        { provide: ENVIRONMENT_TOKEN, useValue: mockEnv }
      ]
    });

    service = TestBed.inject(MatchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.stopPolling();
    const pendingRequests = httpMock.match(() => true);
    pendingRequests.forEach(req => req.flush([]));
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch matches with status filter', () => {
    const status: MatchStatus = 'live';

    service.fetchMatches(status).subscribe(matches => {
      expect(matches.length).toBe(1);
    });

    const req = httpMock.expectOne(request =>
      request.url.includes('/api/v1') &&
      request.params.get('status') === status
    );

    req.flush([{ id: '1' }]);
  });

  it('should set active status', () => {
    service.setStatus('scheduled');
    expect(service.activeStatus()).toBe('scheduled');

    const req = httpMock.expectOne(request => request.url.includes('/api/v1'));
    req.flush([]);
  });
});
