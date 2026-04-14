import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './tokenService';

const SECRET = '01234567890123456789012345678901'; // 32 chars
const REFRESH_SECRET = '01234567890123456789012345678902';

describe('signAccessToken / verifyAccessToken', () => {
  it('signs a token and verifies it correctly', () => {
    const payload = { sub: 42, email: 'test@example.com', role: 'player', displayName: 'TestUser' };
    const token = signAccessToken(payload, SECRET, { expiresInSeconds: 300 });

    const decoded = verifyAccessToken(token, SECRET);
    expect(decoded.sub).toBe(42);
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.role).toBe('player');
    expect(decoded.displayName).toBe('TestUser');
  });

  it('throws on wrong secret', () => {
    const payload = { sub: 1, email: 'a@b.com', role: 'player', displayName: 'A' };
    const token = signAccessToken(payload, SECRET, { expiresInSeconds: 300 });

    expect(() => verifyAccessToken(token, 'wrong-secret-which-is-32-chars-long')).toThrow();
  });

  it('throws on expired token', () => {
    const payload = { sub: 1, email: 'a@b.com', role: 'player', displayName: 'A' };
    const token = signAccessToken(payload, SECRET, { expiresInSeconds: -1 });

    expect(() => verifyAccessToken(token, SECRET)).toThrow();
  });

  it('throws on malformed token', () => {
    expect(() => verifyAccessToken('not.a.jwt', SECRET)).toThrow();
  });

  it('throws on empty token', () => {
    expect(() => verifyAccessToken('', SECRET)).toThrow();
  });

  it('uses HS256 algorithm', () => {
    const payload = { sub: 1, email: 'a@b.com', role: 'player', displayName: 'A' };
    const token = signAccessToken(payload, SECRET, { expiresInSeconds: 300 });
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    expect(header.alg).toBe('HS256');
  });

  it('includes iat and exp claims', () => {
    const payload = { sub: 1, email: 'a@b.com', role: 'player', displayName: 'A' };
    const token = signAccessToken(payload, SECRET, { expiresInSeconds: 300 });
    const decoded = verifyAccessToken(token, SECRET);
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp! - decoded.iat!).toBeGreaterThanOrEqual(299);
  });

  it('rejects a token signed with a different algorithm', () => {
    // HS384 token should be rejected by verifyAccessToken (only HS256 allowed)
    const forgedToken = jwt.sign(
      { sub: 1, email: 'a@b.com', role: 'admin', displayName: 'A' },
      SECRET,
      { algorithm: 'HS384', expiresIn: 300 },
    );
    expect(() => verifyAccessToken(forgedToken, SECRET)).toThrow();
  });
});

describe('signRefreshToken / verifyRefreshToken', () => {
  it('signs a refresh token and verifies sub correctly', () => {
    const token = signRefreshToken(99, REFRESH_SECRET, 3600);
    const decoded = verifyRefreshToken(token, REFRESH_SECRET);
    expect(decoded.sub).toBe(99);
  });

  it('throws on wrong secret', () => {
    const token = signRefreshToken(1, REFRESH_SECRET, 3600);
    expect(() => verifyRefreshToken(token, 'wrong-secret-which-is-32-chars-long')).toThrow();
  });

  it('throws on expired refresh token', () => {
    const token = signRefreshToken(1, REFRESH_SECRET, -1);
    expect(() => verifyRefreshToken(token, REFRESH_SECRET)).toThrow();
  });

  it('throws on malformed token', () => {
    expect(() => verifyRefreshToken('malformed', REFRESH_SECRET)).toThrow();
  });

  it('uses HS256 algorithm', () => {
    const token = signRefreshToken(7, REFRESH_SECRET, 3600);
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    expect(header.alg).toBe('HS256');
  });
});
