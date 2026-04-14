export const STEAM_OPENID_LOGIN = 'https://steamcommunity.com/openid/login';

export function steamId64FromClaimedId(claimedId: string | undefined): string | null {
  if (!claimedId) {
    return null;
  }
  const m = claimedId.match(/\/openid\/id\/(\d{17})$/);
  return m?.[1] ?? null;
}

/** `returnTo` must include any custom query params (e.g. `state`) before calling Steam. */
export function buildSteamOpenIdRedirectUrl(returnTo: string, realm: string): string {
  const p = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return `${STEAM_OPENID_LOGIN}?${p.toString()}`;
}

export type SteamOpenIdVerifyResult =
  | { ok: true }
  | { ok: false; kind: 'invalid' | 'unavailable' };

/** POST `check_authentication` with the same key/value pairs Steam returned (plus overridden mode). */
export async function verifySteamOpenIdAssertion(params: URLSearchParams): Promise<SteamOpenIdVerifyResult> {
  const form = new URLSearchParams(params);
  form.set('openid.mode', 'check_authentication');

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 5000);
  try {
    const res = await fetch(STEAM_OPENID_LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: ac.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, kind: 'unavailable' };
    }
    if (/\bis_valid\s*:\s*true\b/i.test(text)) {
      return { ok: true };
    }
    return { ok: false, kind: 'invalid' };
  } catch {
    return { ok: false, kind: 'unavailable' };
  } finally {
    clearTimeout(t);
  }
}
