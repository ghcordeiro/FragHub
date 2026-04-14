/**
 * PLAYAPI-REQ-008 — faixas provisórias até `elo-system`.
 * Limites inferiores inclusivos por nível (nível 10: elo ≥ 2500).
 */
export function levelFromEloRating(elo: number | null | undefined): number | null {
  if (elo == null || Number.isNaN(elo)) {
    return null;
  }
  const e = Math.floor(elo);
  if (e < 800) return 1;
  if (e < 1000) return 2;
  if (e < 1200) return 3;
  if (e < 1400) return 4;
  if (e < 1600) return 5;
  if (e < 1800) return 6;
  if (e < 2000) return 7;
  if (e < 2200) return 8;
  if (e < 2500) return 9;
  return 10;
}
