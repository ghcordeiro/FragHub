import { describe, expect, it } from 'vitest';
import { newSteamLinkNonce, signSteamLinkState, verifySteamLinkState } from './steamState';

const secret = '01234567890123456789012345678901';

describe('steamState', () => {
  it('round-trips a valid payload', () => {
    const payload = { userId: 42, nonce: newSteamLinkNonce(), exp: Date.now() + 60_000 };
    const token = signSteamLinkState(payload, secret);
    const decoded = verifySteamLinkState(token, secret);
    expect(decoded).toEqual(payload);
  });

  it('rejects tampered body', () => {
    const payload = { userId: 1, nonce: 'a', exp: Date.now() + 60_000 };
    const token = signSteamLinkState(payload, secret);
    const [body, sig] = token.split('.');
    const tampered = `${body.slice(0, -1)}x.${sig}`;
    expect(verifySteamLinkState(tampered, secret)).toBeNull();
  });

  it('rejects expired payload', () => {
    const payload = { userId: 1, nonce: 'n', exp: Date.now() - 1000 };
    const token = signSteamLinkState(payload, secret);
    expect(verifySteamLinkState(token, secret)).toBeNull();
  });

  it('rejects wrong secret', () => {
    const payload = { userId: 1, nonce: 'n', exp: Date.now() + 60_000 };
    const token = signSteamLinkState(payload, secret);
    expect(verifySteamLinkState(token, '01234567890123456789012345678902')).toBeNull();
  });
});
