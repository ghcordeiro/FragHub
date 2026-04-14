import { describe, expect, it } from 'vitest';
import { steamId64FromClaimedId } from './steamOpenIdService';

describe('steamOpenIdService', () => {
  it('extracts SteamID64 from claimed_id URL', () => {
    expect(steamId64FromClaimedId('https://steamcommunity.com/openid/id/76561197960265728')).toBe(
      '76561197960265728',
    );
  });

  it('returns null for invalid input', () => {
    expect(steamId64FromClaimedId(undefined)).toBeNull();
    expect(steamId64FromClaimedId('https://steamcommunity.com/openid/id/7656119')).toBeNull();
    expect(steamId64FromClaimedId('not-a-url')).toBeNull();
  });
});
