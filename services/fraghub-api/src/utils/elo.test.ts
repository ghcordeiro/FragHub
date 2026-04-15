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
      // Level 1: 100–500
      expect(levelFromEloRating(100)).toBe(1);
      expect(levelFromEloRating(300)).toBe(1);
      expect(levelFromEloRating(500)).toBe(1);

      // Level 2: 501–750
      expect(levelFromEloRating(501)).toBe(2);
      expect(levelFromEloRating(600)).toBe(2);
      expect(levelFromEloRating(750)).toBe(2);

      // Level 3: 751–900
      expect(levelFromEloRating(751)).toBe(3);
      expect(levelFromEloRating(825)).toBe(3);
      expect(levelFromEloRating(900)).toBe(3);

      // Level 4: 901–1050 (initial level for new players at 1000 ELO)
      expect(levelFromEloRating(901)).toBe(4);
      expect(levelFromEloRating(1000)).toBe(4);
      expect(levelFromEloRating(1050)).toBe(4);

      // Level 5: 1051–1200
      expect(levelFromEloRating(1051)).toBe(5);
      expect(levelFromEloRating(1125)).toBe(5);
      expect(levelFromEloRating(1200)).toBe(5);

      // Level 6: 1201–1350
      expect(levelFromEloRating(1201)).toBe(6);
      expect(levelFromEloRating(1275)).toBe(6);
      expect(levelFromEloRating(1350)).toBe(6);

      // Level 7: 1351–1530
      expect(levelFromEloRating(1351)).toBe(7);
      expect(levelFromEloRating(1440)).toBe(7);
      expect(levelFromEloRating(1530)).toBe(7);

      // Level 8: 1531–1750
      expect(levelFromEloRating(1531)).toBe(8);
      expect(levelFromEloRating(1640)).toBe(8);
      expect(levelFromEloRating(1750)).toBe(8);

      // Level 9: 1751–2000
      expect(levelFromEloRating(1751)).toBe(9);
      expect(levelFromEloRating(1875)).toBe(9);
      expect(levelFromEloRating(2000)).toBe(9);

      // Level 10: 2001+
      expect(levelFromEloRating(2001)).toBe(10);
      expect(levelFromEloRating(3000)).toBe(10);
      expect(levelFromEloRating(10000)).toBe(10);
    });

    it('returns null for ELO below minimum (< 100)', () => {
      // ELO below 100 is invalid (outside bracket range)
      expect(levelFromEloRating(50)).toBeNull();
      expect(levelFromEloRating(0)).toBeNull();
      // But ELO 100 is valid (minimum of Level 1)
      expect(levelFromEloRating(100)).toBe(1);
    });

    it('handles floating point ELO values correctly', () => {
      // Floating point values should work with lookup table brackets
      expect(levelFromEloRating(600.5)).toBe(2);
      expect(levelFromEloRating(1000.9)).toBe(4);
      expect(levelFromEloRating(1250.1)).toBe(6);
      expect(levelFromEloRating(1999.99)).toBe(9);
    });

    it('maintains consistent level mapping across ranges', () => {
      // Verify no gaps or overlaps in level ranges (only valid ELO values >= 100)
      const levelBoundaries = [100, 500, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500, 3000];
      levelBoundaries.forEach((elo) => {
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
      // Both should still map to valid levels using lookup table
      const winnerElo = 1100; // Level 5: 1051–1200
      const loserElo = 950;   // Level 4: 901–1050
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
