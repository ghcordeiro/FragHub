import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export type SteamLinkStatePayload = { userId: number; nonce: string; exp: number };

export function signSteamLinkState(payload: SteamLinkStatePayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySteamLinkState(token: string, secret: string): SteamLinkStatePayload | null {
  const dot = token.indexOf('.');
  if (dot < 1 || dot === token.length - 1) {
    return null;
  }
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as SteamLinkStatePayload).userId !== 'number' ||
    typeof (parsed as SteamLinkStatePayload).nonce !== 'string' ||
    typeof (parsed as SteamLinkStatePayload).exp !== 'number'
  ) {
    return null;
  }
  const p = parsed as SteamLinkStatePayload;
  if (p.exp <= Date.now()) {
    return null;
  }
  return p;
}

export function newSteamLinkNonce(): string {
  return randomBytes(16).toString('hex');
}
