import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatchCardComponent } from './match-card';
import { Match } from '../../../core/models/match-model';
import { describe, it, expect, beforeEach } from 'vitest';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ENVIRONMENT_TOKEN } from '../../../core/config/environment';

describe('MatchCardComponent', () => {
  let component: MatchCardComponent;
  let fixture: ComponentFixture<MatchCardComponent>;

  const mockMatch: Match = {
    id: '1',
    external_id: 'ext1',
    competition: 'World Cup',
    stage: 'Group Stage',
    group_name: 'Group A',
    home_team: 'Norway',
    away_team: 'Senegal',
    home_flag: 'norway.png',
    away_flag: 'senegal.png',
    kickoff_at: '2026-06-22T18:00:00Z',
    status: 'live',
    home_score: 2,
    away_score: 1,
    time_elapsed: 45,
    updated_at: '2026-06-22T18:45:00Z',
    venue_name: 'MetLife Stadium',
    venue_city: 'New York'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchCardComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: ENVIRONMENT_TOKEN, useValue: { supabaseUrl: '', supabaseKey: '' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MatchCardComponent);
    component = fixture.componentInstance;
  });

  it('should display team names and score for live match', () => {
    fixture.componentRef.setInput('match', mockMatch);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Norway');
    expect(compiled.textContent).toContain('Senegal');
    expect(compiled.textContent).toContain('2 - 1');
    expect(compiled.textContent).toContain("45'");
  });

  it('should display kickoff time for scheduled match', () => {
    fixture.componentRef.setInput('match', { ...mockMatch, status: 'scheduled' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    // Buscamos que aparezca un formato de hora (HH:mm)
    expect(compiled.querySelector('.tracking-tighter')?.textContent).toMatch(/^\d{2}:\d{2}$/);
  });
});
