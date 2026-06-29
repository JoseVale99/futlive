import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StandingsService } from './standings-service';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { GroupStanding } from '../models/standings-model';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const mockEnv = {
  production: false,
  apiBase: '/api/v1',
};

describe('StandingsService', () => {
  let service: StandingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StandingsService,
        { provide: ENVIRONMENT_TOKEN, useValue: mockEnv }
      ]
    });
    service = TestBed.inject(StandingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchStandings', () => {
    it('should fetch standings and update signals', () => {
      const mockStandings: Partial<GroupStanding>[] = [
        { group_name: 'Group A', team: 'Team 1', rank: 1 },
        { group_name: 'Group A', team: 'Team 2', rank: 2 },
        { group_name: 'Group B', team: 'Team 3', rank: 1 }
      ];

      service.fetchStandings();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(r => r.url.includes('/api/standings'));
      req.flush(mockStandings);

      expect(service.loading()).toBe(false);
      expect(service.standings().length).toBe(3);
      expect(service.groupedStandings().size).toBe(2);
    });

    it('should handle errors', () => {
      service.fetchStandings();
      const req = httpMock.expectOne(r => r.url.includes('/api/standings'));
      req.error(new ErrorEvent('API Error'));

      expect(service.loading()).toBe(false);
      expect(service.standings()).toEqual([]);
    });
  });
});
