/**
 * ELO-REQ-004: Map ELO rating to level 1-10
 * Level mapping (Faceit-style):
 * - Level 1: 600–750
 * - Level 2: 751–825
 * - Level 3: 826–900
 * - Level 4: 901–1050 (initial level for new players at 1000 ELO)
 * - Level 5: 1051–1125
 * - Level 6: 1126–1200
 * - Level 7: 1201–1350
 * - Level 8: 1351–1530
 * - Level 9: 1531–2000
 * - Level 10: 2001+
 *
 * Formula: level = Math.min(10, Math.max(1, Math.floor((elo - 600) / 80) + 1))
 */
export function levelFromEloRating(elo: number | null | undefined): number | null {
  if (elo == null || Number.isNaN(elo)) {
    return null;
  }
  // Formula: (elo - 600) / 80 + 1, clamped to [1, 10]
  const level = Math.min(10, Math.max(1, Math.floor((elo - 600) / 80) + 1));
  return level;
}
