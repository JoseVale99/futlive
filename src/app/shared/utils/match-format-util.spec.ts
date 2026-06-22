import { formatKickoffTime, formatScore, formatVenue, formatStageInfo } from './match-format-util';
import { describe, it, expect } from 'vitest';

describe('match-format-util', () => {
  describe('formatKickoffTime', () => {
    it('should format ISO string to HH:mm', () => {
      // Nota: El resultado puede variar según el locale del entorno de pruebas
      const formatted = formatKickoffTime('2026-06-22T18:30:00Z');
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should return empty string if input is empty', () => {
      expect(formatKickoffTime('')).toBe('');
    });
  });

  describe('formatScore', () => {
    it('should format score correctly', () => {
      expect(formatScore(2, 1)).toBe('2 - 1');
    });

    it('should return dashes if scores are null', () => {
      expect(formatScore(null, 1)).toBe('- - -');
      expect(formatScore(2, null)).toBe('- - -');
      expect(formatScore(null, null)).toBe('- - -');
    });
  });

  describe('formatVenue', () => {
    it('should format venue and city', () => {
      expect(formatVenue('Estadio Azteca', 'CDMX')).toBe('Estadio Azteca, CDMX');
    });

    it('should handle missing city', () => {
      expect(formatVenue('Estadio Azteca', '')).toBe('Estadio Azteca');
    });

    it('should handle missing venue', () => {
      expect(formatVenue('', 'CDMX')).toBe('CDMX');
    });
  });

  describe('formatStageInfo', () => {
    it('should include group name if provided', () => {
      expect(formatStageInfo('Group Stage', 'Group A')).toBe('Group Stage - Group A');
    });

    it('should only return stage if group name is missing', () => {
      expect(formatStageInfo('Final', null)).toBe('Final');
    });
  });
});
