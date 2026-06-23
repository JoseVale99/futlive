import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StandingsService } from './standings-service';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { GroupStanding } from '../models/standings-model';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('StandingsService', () => {
  let service: StandingsService;
  let httpMock: HttpTestingController;
  const mockEnv = {
    supabaseUrl: 'https://mock.supabase.co',
    supabaseKey: 'mock-key'
  };

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
    it('should fetch standings and update signals including groupedStandings', () => {
      const mockStandings: Partial<GroupStanding>[] = [
        { group_name: 'Group A', team: 'Team 1', rank: 1 },
        { group_name: 'Group A', team: 'Team 2', rank: 2 },
        { group_name: 'Group B', team: 'Team 3', rank: 1 }
      ];

      service.fetchStandings();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(req => req.url.includes('/group_standings'));
      expect(req.request.params.get('order')).toBe('group_name.asc,rank.asc');
      
      req.flush(mockStandings);

      expect(service.loading()).toBe(false);
      expect(service.standings().length).toBe(3);
      expect(service.groupedStandings().size).toBe(2);
      expect(service.groupedStandings().get('Group A')?.length).toBe(2);
    });

    it('should handle errors and update error signal', () => {
      service.fetchStandings();
      const req = httpMock.expectOne(req => req.url.includes('/group_standings'));
      req.error(new ErrorEvent('API Error'), { status: 404, statusText: 'Not Found' });

      expect(service.loading()).toBe(false);
      expect(service.error()).toContain('Not Found');
      expect(service.standings()).toEqual([]);
      expect(service.groupedStandings().size).toBe(0);
    });
  });
});
