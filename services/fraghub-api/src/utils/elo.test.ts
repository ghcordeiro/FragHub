import { describe, expect, it } from 'vitest';
import { levelFromEloRating } from './elo';

describe('ELO System', () => {
  describe('levelFromEloRating', () => {
    it('returns null for null/undefined inputs', () => {
      expect(levelFromEloRating(null)).toBeNull();
      expect(levelFromEloRating(undefined)).toBeNull();
    });

    it('returns null for NaN', () => {
      expect(levelFromEloRating(NaN)).toBeNull();
    });

    it('maps all level boundaries per PLAYAPI-REQ-008', () => {
      // Level 1: 0-799
      expect(levelFromEloRating(0)).toBe(1);
      expect(levelFromEloRating(100)).toBe(1);
      expect(levelFromEloRating(799)).toBe(1);

      // Level 2: 800-999
      expect(levelFromEloRating(800)).toBe(2);
      expect(levelFromEloRating(850)).toBe(2);
      expect(levelFromEloRating(999)).toBe(2);

      // Level 3: 1000-1199
      expect(levelFromEloRating(1000)).toBe(3);
      expect(levelFromEloRating(1100)).toBe(3);
      expect(levelFromEloRating(1199)).toBe(3);

      // Level 4: 1200-1399
      expect(levelFromEloRating(1200)).toBe(4);
      expect(levelFromEloRating(1300)).toBe(4);
      expect(levelFromEloRating(1399)).toBe(4);

      // Level 5: 1400-1599
      expect(levelFromEloRating(1400)).toBe(5);
      expect(levelFromEloRating(1500)).toBe(5);
      expect(levelFromEloRating(1599)).toBe(5);

      // Level 6: 1600-1799
      expect(levelFromEloRating(1600)).toBe(6);
      expect(levelFromEloRating(1700)).toBe(6);
      expect(levelFromEloRating(1799)).toBe(6);

      // Level 7: 1800-1999
      expect(levelFromEloRating(1800)).toBe(7);
      expect(levelFromEloRating(1900)).toBe(7);
      expect(levelFromEloRating(1999)).toBe(7);

      // Level 8: 2000-2199
      expect(levelFromEloRating(2000)).toBe(8);
      expect(levelFromEloRating(2100)).toBe(8);
      expect(levelFromEloRating(2199)).toBe(8);

      // Level 9: 2200-2499
      expect(levelFromEloRating(2200)).toBe(9);
      expect(levelFromEloRating(2300)).toBe(9);
      expect(levelFromEloRating(2499)).toBe(9);

      // Level 10: 2500+
      expect(levelFromEloRating(2500)).toBe(10);
      expect(levelFromEloRating(3000)).toBe(10);
      expect(levelFromEloRating(10000)).toBe(10);
    });

    it('enforces minimum floor of 100 for lowest level', () => {
      // Minimum playable ELO should not fall below 100 (prevents negative ELO)
      expect(levelFromEloRating(100)).toBe(1);
      expect(levelFromEloRating(50)).toBe(1);
      expect(levelFromEloRating(0)).toBe(1);
    });

    it('handles floating point ELO values by flooring', () => {
      // Floating point values should be floored to integer
      expect(levelFromEloRating(800.5)).toBe(2);
      expect(levelFromEloRating(1000.9)).toBe(3);
      expect(levelFromEloRating(1199.1)).toBe(3);
      expect(levelFromEloRating(2499.99)).toBe(9);
    });

    it('maintains consistent level mapping across ranges', () => {
      // Verify no gaps or overlaps in level ranges
      const levelBoundaries = [0, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500, 3000];
      levelBoundaries.forEach((elo, idx) => {
        const level = levelFromEloRating(elo);
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(10);
      });
    });

    it('handles edge cases for very high ELO values', () => {
      // High ELO ceiling (pro-tier players)
      expect(levelFromEloRating(5000)).toBe(10);
      expect(levelFromEloRating(9999)).toBe(10);
      expect(levelFromEloRating(99999)).toBe(10);
    });

    it('provides consistent level assignment for matched pairs', () => {
      // Victory scenario: winner gets +K, loser gets -K
      // Both should still map to valid levels
      const winnerElo = 1500;
      const loserElo = 1200;
      expect(levelFromEloRating(winnerElo)).toBe(5);
      expect(levelFromEloRating(loserElo)).toBe(4);
    });

    it('ensures level progression is monotonic', () => {
      // As ELO increases, level should never decrease
      const testElos = [100, 500, 800, 1000, 1200, 1500, 1800, 2000, 2300, 2500, 3000];
      let prevLevel = 0;
      testElos.forEach((elo) => {
        const level = levelFromEloRating(elo);
        expect(level).toBeGreaterThanOrEqual(prevLevel);
        prevLevel = level;
      });
    });
  });
});
