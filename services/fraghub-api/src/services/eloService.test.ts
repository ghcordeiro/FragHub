import { describe, it, expect } from 'vitest';
import { calculateEloChange, getLevelFromElo } from './eloService';

describe('ELO Service', () => {
  describe('calculateEloChange', () => {
    it('should calculate positive ELO change for a win against equal opponent', () => {
      // Player at 1000 ELO beats opponent at 1000 ELO
      // Expected probability = 0.5, delta = K * (1 - 0.5) = K/2
      const delta = calculateEloChange(1000, 5, 1000, 'win');
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThanOrEqual(20); // K=20 for 10-30 matches
    });

    it('should calculate negative ELO change for a loss against equal opponent', () => {
      // Player at 1000 ELO loses to opponent at 1000 ELO
      // Expected probability = 0.5, delta = K * (0 - 0.5) = -K/2
      const delta = calculateEloChange(1000, 5, 1000, 'loss');
      expect(delta).toBeLessThan(0);
      expect(delta).toBeGreaterThanOrEqual(-20);
    });

    it('should reward upsets (beating higher-rated opponent)', () => {
      // Player at 1000 ELO beats opponent at 1200 ELO
      // Expected probability is lower, so delta is higher
      const deltaWin = calculateEloChange(1000, 5, 1200, 'win');
      const deltaLoss = calculateEloChange(1000, 5, 1000, 'loss');
      expect(deltaWin).toBeGreaterThan(deltaLoss);
    });

    it('should penalize upsets (losing to lower-rated opponent)', () => {
      // Player at 1000 ELO loses to opponent at 800 ELO
      // Expected probability is very high, so loss is highly penalized
      const delta = calculateEloChange(1000, 5, 800, 'loss');
      expect(delta).toBeLessThan(-15); // Significant penalty
    });

    it('should use K=40 for new players (< 10 matches)', () => {
      // New player (2 matches) - should get K=40
      const deltaNew = calculateEloChange(1000, 2, 1000, 'win');
      // For equal opponents: K * (1 - 0.5) = 40 * 0.5 = 20
      expect(deltaNew).toBeGreaterThanOrEqual(15); // K=40 gives larger swings
    });

    it('should use K=20 for active players (10-30 matches)', () => {
      // Active player (15 matches) - should get K=20
      const deltaActive = calculateEloChange(1000, 15, 1000, 'win');
      expect(deltaActive).toBeLessThanOrEqual(15);
    });

    it('should use K=10 for experienced players (> 30 matches)', () => {
      // Experienced player (50 matches) - should get K=10
      const deltaExp = calculateEloChange(1000, 50, 1000, 'win');
      expect(deltaExp).toBeLessThanOrEqual(10);
    });
  });

  describe('getLevelFromElo', () => {
    it('should map 100-500 ELO to level 1', () => {
      expect(getLevelFromElo(100)).toBe(1);
      expect(getLevelFromElo(300)).toBe(1);
      expect(getLevelFromElo(500)).toBe(1);
    });

    it('should map 501-750 ELO to level 2', () => {
      expect(getLevelFromElo(501)).toBe(2);
      expect(getLevelFromElo(600)).toBe(2);
      expect(getLevelFromElo(750)).toBe(2);
    });

    it('should map 901-1050 ELO to level 4 (new player default)', () => {
      expect(getLevelFromElo(901)).toBe(4);
      expect(getLevelFromElo(1000)).toBe(4); // New player default
      expect(getLevelFromElo(1050)).toBe(4);
    });

    it('should map 1051-1200 ELO to level 5', () => {
      expect(getLevelFromElo(1051)).toBe(5);
      expect(getLevelFromElo(1100)).toBe(5);
      expect(getLevelFromElo(1200)).toBe(5);
    });

    it('should map 2001+ ELO to level 10', () => {
      expect(getLevelFromElo(2001)).toBe(10);
      expect(getLevelFromElo(2500)).toBe(10);
      expect(getLevelFromElo(3000)).toBe(10);
    });

    it('should use lookup table for level mapping', () => {
      // Test various boundaries from the lookup table
      expect(getLevelFromElo(900)).toBe(3); // Level 3: 751–900
      expect(getLevelFromElo(1350)).toBe(6); // Level 6: 1201–1350
      expect(getLevelFromElo(1531)).toBe(8); // Level 8: 1531–1750
    });
  });
});
