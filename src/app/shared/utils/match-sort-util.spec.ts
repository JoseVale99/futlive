import { sortMatchesByKickoff } from './match-sort-util';
import { Match } from '../../core/models/match-model';
import { describe, it, expect } from 'vitest';

describe('match-sort-util', () => {
  const mockMatches: Partial<Match>[] = [
    { id: '1', kickoff_at: '2026-06-22T18:00:00Z' },
    { id: '2', kickoff_at: '2026-06-22T15:00:00Z' },
    { id: '3', kickoff_at: '2026-06-22T21:00:00Z' }
  ];

  it('should sort matches by kickoff time in ascending order', () => {
    const sorted = sortMatchesByKickoff(mockMatches as Match[], 'asc');
    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('1');
    expect(sorted[2].id).toBe('3');
  });

  it('should sort matches by kickoff time in descending order', () => {
    const sorted = sortMatchesByKickoff(mockMatches as Match[], 'desc');
    expect(sorted[0].id).toBe('3');
    expect(sorted[1].id).toBe('1');
    expect(sorted[2].id).toBe('2');
  });

  it('should not mutate the original array', () => {
    const original = [...mockMatches] as Match[];
    sortMatchesByKickoff(original, 'asc');
    expect(original[0].id).toBe('1');
  });
});
