import { describe, it, expect } from 'vitest';
import { truncatePlayerName, filterStarters, sortByJerseyNumber } from './player-util';
import { LineupPlayer } from '../../core/models/live-data-model';

describe('truncatePlayerName', () => {
  it('should return name unchanged if length <= maxLength', () => {
    expect(truncatePlayerName('Messi')).toBe('Messi');
  });

  it('should truncate and add ellipsis if length > maxLength', () => {
    const longName = 'A'.repeat(30);
    const result = truncatePlayerName(longName);
    expect(result).toBe('A'.repeat(25) + '…');
    expect(result.length).toBe(26);
  });

  it('should respect custom maxLength', () => {
    expect(truncatePlayerName('Alexander', 5)).toBe('Alexa…');
  });

  it('should not truncate when length equals maxLength', () => {
    const name = 'A'.repeat(25);
    expect(truncatePlayerName(name)).toBe(name);
  });

  it('should handle empty string', () => {
    expect(truncatePlayerName('')).toBe('');
  });
});

describe('filterStarters', () => {
  const players: LineupPlayer[] = [
    { name: 'Player A', number: 1, position: 'GK', is_starter: true },
    { name: 'Player B', number: 7, position: 'FW', is_starter: false },
    { name: 'Player C', number: 10, position: 'MF', is_starter: true },
  ];

  it('should return only players with is_starter === true', () => {
    const result = filterStarters(players);
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.is_starter === true)).toBe(true);
  });

  it('should return empty array when no starters', () => {
    const subs: LineupPlayer[] = [
      { name: 'Sub', number: 12, position: 'DF', is_starter: false },
    ];
    expect(filterStarters(subs)).toHaveLength(0);
  });

  it('should return all when all are starters', () => {
    const starters: LineupPlayer[] = [
      { name: 'A', number: 1, position: 'GK', is_starter: true },
      { name: 'B', number: 2, position: 'DF', is_starter: true },
    ];
    expect(filterStarters(starters)).toHaveLength(2);
  });
});

describe('sortByJerseyNumber', () => {
  it('should sort players by number ascending', () => {
    const players: LineupPlayer[] = [
      { name: 'C', number: 10, position: 'MF', is_starter: true },
      { name: 'A', number: 1, position: 'GK', is_starter: true },
      { name: 'B', number: 7, position: 'FW', is_starter: true },
    ];
    const result = sortByJerseyNumber(players);
    expect(result.map((p) => p.number)).toEqual([1, 7, 10]);
  });

  it('should not mutate the original array', () => {
    const players: LineupPlayer[] = [
      { name: 'B', number: 9, position: 'FW', is_starter: true },
      { name: 'A', number: 1, position: 'GK', is_starter: true },
    ];
    const original = [...players];
    sortByJerseyNumber(players);
    expect(players).toEqual(original);
  });

  it('should handle empty array', () => {
    expect(sortByJerseyNumber([])).toEqual([]);
  });
});
