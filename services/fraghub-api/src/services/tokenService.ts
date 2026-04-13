import jwt from 'jsonwebtoken';

export type AccessPayload = {
  sub: number;
  email: string;
  role: string;
  displayName: string;
};

export function signAccessToken(
  payload: AccessPayload,
  secret: string,
  options: { expiresInSeconds: number },
): string {
  const body = {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    displayName: payload.displayName,
  };
  return jwt.sign(body, secret, {
    algorithm: 'HS256',
    expiresIn: options.expiresInSeconds,
  });
}

export function verifyAccessToken(
  token: string,
  secret: string,
): AccessPayload & { iat?: number; exp?: number } {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
    throw new Error('Invalid token payload');
  }
  const o = decoded as Record<string, unknown>;
  const sub = Number(o.sub);
  const email = String(o.email ?? '');
  const role = String(o.role ?? '');
  const displayName = String(o.displayName ?? '');
  if (!Number.isFinite(sub) || !email) {
    throw new Error('Invalid token claims');
  }
  return { sub, email, role, displayName, iat: o.iat as number | undefined, exp: o.exp as number | undefined };
}

export function signRefreshToken(userId: number, secret: string, expiresInSeconds: number): string {
  return jwt.sign({ sub: userId }, secret, {
    algorithm: 'HS256',
    expiresIn: expiresInSeconds,
  });
}

export function verifyRefreshToken(token: string, secret: string): { sub: number } {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
    throw new Error('Invalid refresh payload');
  }
  const o = decoded as Record<string, unknown>;
  const sub = Number(o.sub);
  if (!Number.isFinite(sub)) {
    throw new Error('Invalid refresh sub');
  }
  return { sub };
}
