import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ctx = vi.hoisted(() => ({
  userRow: null as null | {
    id: number;
    email: string;
    role: string;
    password_hash: string;
    display_name: string;
    google_id: string | null;
    steam_id: string | null;
    elo_rating: number;
    banned_at: Date | string | null;
    banned_reason: string | null;
  },
}));

vi.mock('../db', () => ({
  db: Object.assign(
    vi.fn(() => ({
      where: vi.fn(() => ({
        first: vi.fn(async () => ctx.userRow),
      })),
    })),
    { raw: vi.fn(), transaction: vi.fn() },
  ),
  assertDatabaseConnection: vi.fn(),
}));

import { authMiddleware, requireRole } from './auth';

const JWT_SECRET = process.env.JWT_SECRET ?? '';

function buildApp(...stack: express.RequestHandler[]) {
  const app = express();
  app.use(...stack);
  app.get('/me', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe('authMiddleware', () => {
  beforeEach(() => {
    ctx.userRow = {
      id: 1,
      email: 'a@b.com',
      role: 'player',
      password_hash: 'x',
      display_name: 'A',
      google_id: null,
      steam_id: null,
      elo_rating: 1000,
      banned_at: null,
      banned_reason: null,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without Authorization header', async () => {
    const app = buildApp(authMiddleware);
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 for malformed token', async () => {
    const app = buildApp(authMiddleware);
    const res = await request(app).get('/me').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });

  it('returns 401 for expired token', async () => {
    const token = jwt.sign(
      { sub: 1, email: 'a@b.com', role: 'player', displayName: 'A' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: -60 },
    );
    const app = buildApp(authMiddleware);
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 when user no longer exists', async () => {
    ctx.userRow = null;
    const token = jwt.sign(
      { sub: 99, email: 'a@b.com', role: 'player', displayName: 'A' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '5m' },
    );
    const app = buildApp(authMiddleware);
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid token', async () => {
    const token = jwt.sign(
      { sub: 1, email: 'a@b.com', role: 'player', displayName: 'A' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '5m' },
    );
    const app = buildApp(authMiddleware);
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('returns 401 Account banned when banned_at is set', async () => {
    ctx.userRow = {
      id: 1,
      email: 'a@b.com',
      role: 'player',
      password_hash: 'x',
      display_name: 'A',
      google_id: null,
      steam_id: null,
      elo_rating: 1000,
      banned_at: new Date().toISOString(),
      banned_reason: 'spam',
    };
    const token = jwt.sign(
      { sub: 1, email: 'a@b.com', role: 'player', displayName: 'A' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '5m' },
    );
    const app = buildApp(authMiddleware);
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Account banned' });
  });
});

describe('requireRole', () => {
  beforeEach(() => {
    ctx.userRow = {
      id: 2,
      email: 'admin@test.com',
      role: 'admin',
      password_hash: 'x',
      display_name: 'Admin',
      google_id: null,
      steam_id: null,
      elo_rating: 1000,
      banned_at: null,
      banned_reason: null,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when role is insufficient', async () => {
    ctx.userRow = {
      id: 3,
      email: 'p@test.com',
      role: 'player',
      password_hash: 'x',
      display_name: 'P',
      google_id: null,
      steam_id: null,
      elo_rating: 1000,
      banned_at: null,
      banned_reason: null,
    };
    const token = jwt.sign(
      { sub: 3, email: 'p@test.com', role: 'player', displayName: 'P' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '5m' },
    );
    const app = buildApp(authMiddleware, requireRole('admin'));
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Forbidden' });
  });

  it('allows matching role', async () => {
    const token = jwt.sign(
      { sub: 2, email: 'admin@test.com', role: 'admin', displayName: 'Admin' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '5m' },
    );
    const app = buildApp(authMiddleware, requireRole('admin'));
    const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
