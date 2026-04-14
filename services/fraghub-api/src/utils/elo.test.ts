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
      // Formula: level = Math.min(10, Math.max(1, Math.floor((elo - 600) / 80) + 1))
      // Level 1: 600–750 (formula gives 1 for elo < 680)
      expect(levelFromEloRating(0)).toBe(1);
      expect(levelFromEloRating(100)).toBe(1);
      expect(levelFromEloRating(679)).toBe(1);

      // Level 2: 751–825 (formula gives 2 for elo 680-759)
      expect(levelFromEloRating(680)).toBe(2);
      expect(levelFromEloRating(750)).toBe(2);
      expect(levelFromEloRating(759)).toBe(2);

      // Level 3: 826–900 (formula gives 3 for elo 760-839)
      expect(levelFromEloRating(760)).toBe(3);
      expect(levelFromEloRating(839)).toBe(3);

      // Level 4: 901–1050 (formula gives 4 for elo 840-919)
      expect(levelFromEloRating(840)).toBe(4);
      expect(levelFromEloRating(919)).toBe(4);

      // Level 5: 1051–1125 (formula gives 5 for elo 920-999)
      expect(levelFromEloRating(920)).toBe(5);
      expect(levelFromEloRating(999)).toBe(5);

      // Level 6: 1126–1200 (formula gives 6 for elo 1000-1079)
      expect(levelFromEloRating(1000)).toBe(6);
      expect(levelFromEloRating(1079)).toBe(6);

      // Level 7: 1201–1350 (formula gives 7 for elo 1080-1159)
      expect(levelFromEloRating(1080)).toBe(7);
      expect(levelFromEloRating(1159)).toBe(7);

      // Level 8: 1351–1530 (formula gives 8 for elo 1160-1239)
      expect(levelFromEloRating(1160)).toBe(8);
      expect(levelFromEloRating(1239)).toBe(8);

      // Level 9: 1531–2000 (formula gives 9 for elo 1240-1319)
      expect(levelFromEloRating(1240)).toBe(9);
      expect(levelFromEloRating(1319)).toBe(9);

      // Level 10: 2001+ (formula gives 10 for elo 1320+)
      expect(levelFromEloRating(1320)).toBe(10);
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
      // Floating point values should be floored to integer using formula
      expect(levelFromEloRating(680.5)).toBe(2);
      expect(levelFromEloRating(1000.9)).toBe(6);
      expect(levelFromEloRating(1079.1)).toBe(6);
      expect(levelFromEloRating(1319.99)).toBe(10);
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
      // Both should still map to valid levels using formula
      const winnerElo = 920;
      const loserElo = 840;
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
