/**
 * ELO-REQ-004: Map ELO rating to level 1-10
 * Level mapping (Faceit-style, per README):
 * - Level 1: 100–500
 * - Level 2: 501–750
 * - Level 3: 751–900
 * - Level 4: 901–1050 (initial level for new players at 1000 ELO)
 * - Level 5: 1051–1200
 * - Level 6: 1201–1350
 * - Level 7: 1351–1530
 * - Level 8: 1531–1750
 * - Level 9: 1751–2000
 * - Level 10: 2001+
 */
const ELO_LEVEL_BRACKETS = [
  { min: 100, max: 500, level: 1 },
  { min: 501, max: 750, level: 2 },
  { min: 751, max: 900, level: 3 },
  { min: 901, max: 1050, level: 4 },
  { min: 1051, max: 1200, level: 5 },
  { min: 1201, max: 1350, level: 6 },
  { min: 1351, max: 1530, level: 7 },
  { min: 1531, max: 1750, level: 8 },
  { min: 1751, max: 2000, level: 9 },
  { min: 2001, max: Infinity, level: 10 },
];

export function levelFromEloRating(elo: number | null | undefined): number | null {
  if (elo == null || Number.isNaN(elo)) {
    return null;
  }
  const bracket = ELO_LEVEL_BRACKETS.find(b => elo >= b.min && elo <= b.max);
  return bracket ? bracket.level : null;
}
