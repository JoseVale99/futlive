import { describe, it, expect } from 'vitest';
import { groupByGroupName, getTeamFlagUrl, parseFormString, isQualifying } from './standings-util';
import { GroupStanding } from '../../core/models/standings-model';

describe('StandingsUtil', () => {
  describe('groupByGroupName', () => {
    it('should group standings by group name', () => {
      const standings: Partial<GroupStanding>[] = [
        { group_name: 'Group A', team: 'Team 1' },
        { group_name: 'Group A', team: 'Team 2' },
        { group_name: 'Group B', team: 'Team 3' },
      ];
      const result = groupByGroupName(standings as GroupStanding[]);
      expect(result.size).toBe(2);
      expect(result.get('Group A')?.length).toBe(2);
      expect(result.get('Group B')?.length).toBe(1);
    });

    it('should return empty map for empty array', () => {
      const result = groupByGroupName([]);
      expect(result.size).toBe(0);
    });
  });

  describe('getTeamFlagUrl', () => {
    it('should return correct URL pattern', () => {
      expect(getTeamFlagUrl(123)).toBe('https://media.api-sports.io/football/teams/123.png');
    });
  });

  describe('parseFormString', () => {
    it('should parse form string correctly', () => {
      expect(parseFormString('WDL')).toEqual(['W', 'D', 'L']);
      expect(parseFormString('wdl')).toEqual(['W', 'D', 'L']);
    });

    it('should return empty array for null or empty string', () => {
      expect(parseFormString(null)).toEqual([]);
      expect(parseFormString('')).toEqual([]);
    });

    it('should filter out invalid characters', () => {
      expect(parseFormString('WX D')).toEqual(['W', 'D']);
    });
  });

  describe('isQualifying', () => {
    it('should return true when description is present', () => {
      const standing: Partial<GroupStanding> = { description: 'Qualified' };
      expect(isQualifying(standing as GroupStanding)).toBe(true);
    });

    it('should return false when description is null, empty or whitespace', () => {
      expect(isQualifying({ description: null } as any)).toBe(false);
      expect(isQualifying({ description: '' } as any)).toBe(false);
      expect(isQualifying({ description: '  ' } as any)).toBe(false);
    });
  });
});
