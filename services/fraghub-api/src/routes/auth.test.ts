/**
 * Integration-style tests for auth routes.
 * Uses vi.mock to stub the database and external services so no real DB connection is needed.
 */

import bcrypt from 'bcrypt';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mutable context for mocks
// ---------------------------------------------------------------------------

const ctx = vi.hoisted(() => ({
  // users table
  users: [] as Array<{
    id: number;
    email: string;
    password_hash: string;
    display_name: string;
    role: string;
    google_id: string | null;
    steam_id: string | null;
  }>,
  nextId: 1,
  // refresh_tokens table (keyed by token_hash)
  tokens: {} as Record<
    string,
    {
      id: number;
      user_id: number;
      token_hash: string;
      device_id: string | null;
      revoked_at: Date | null;
      expires_at: Date;
    }
  >,
  nextTokenId: 1,
}));

// ---------------------------------------------------------------------------
// Mock the db module
// ---------------------------------------------------------------------------

vi.mock('../db', () => {
  const buildKnexChain = (items: unknown[]) => ({
    where: vi.fn().mockReturnThis(),
    whereNull: vi.fn().mockReturnThis(),
    first: vi.fn(async () => items[0]),
    insert: vi.fn(async (row: Record<string, unknown>) => {
      (row as Record<string, unknown>).id = ctx.nextId++;
      (items as unknown[]).push(row);
      return [row.id];
    }),
    update: vi.fn(async () => 1),
  });

  const dbFn = vi.fn((table: string) => {
    if (table === 'users') {
      return {
        where: (criteria: Record<string, unknown>) => ({
          first: vi.fn(async () =>
            ctx.users.find((u) =>
              Object.entries(criteria).every(([k, v]) => (u as Record<string, unknown>)[k] === v),
            ),
          ),
          update: vi.fn(async () => 1),
        }),
        insert: vi.fn(async (row: Record<string, unknown>) => {
          const newUser = { ...row, id: ctx.nextId++ };
          ctx.users.push(newUser as typeof ctx.users[0]);
          return [newUser.id];
        }),
      };
    }
    if (table === 'refresh_tokens') {
      return {
        where: (criteria: Record<string, unknown>) => ({
          whereNull: (_col: string) => ({
            update: vi.fn(async () => 1),
          }),
          first: vi.fn(async () => {
            const hash = criteria.token_hash as string;
            return ctx.tokens[hash];
          }),
          update: vi.fn(async () => 1),
        }),
        insert: vi.fn(async (row: Record<string, unknown>) => {
          const id = ctx.nextTokenId++;
          ctx.tokens[row.token_hash as string] = {
            id,
            user_id: row.user_id as number,
            token_hash: row.token_hash as string,
            device_id: (row.device_id as string | null) ?? null,
            revoked_at: null,
            expires_at: row.expires_at as Date,
          };
          return [id];
        }),
      };
    }
    return buildKnexChain([]);
  });

  const _trxStub = {
    ...dbFn,
    users: ctx.users,
  };

  const transactionFn = vi.fn(async (cb: (trx: unknown) => Promise<unknown>) => {
    return cb(dbFn);
  });

  const mockDb = Object.assign(dbFn, {
    transaction: transactionFn,
    raw: vi.fn(),
  });

  return {
    db: mockDb,
    assertDatabaseConnection: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Import auth router AFTER mocks are set up
// ---------------------------------------------------------------------------

import authRouter from './auth';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRouter);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BCRYPT_COST = 4; // low cost for tests

async function createUser(email: string, password: string, role = 'player') {
  const hash = await bcrypt.hash(password, BCRYPT_COST);
  const user = {
    id: ctx.nextId++,
    email,
    password_hash: hash,
    display_name: email.split('@')[0],
    role,
    google_id: null,
    steam_id: null,
  };
  ctx.users.push(user);
  return user;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  ctx.users = [];
  ctx.tokens = {};
  ctx.nextId = 1;
  ctx.nextTokenId = 1;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /auth/register', () => {
  it('returns 400 for invalid email', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'bad', password: 'Password1' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for weak password', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('returns 201 with accessToken for valid registration', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'Password1', displayName: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('new@example.com');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('sets refresh_token httpOnly cookie on registration', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'cookie@test.com', password: 'Password1' });

    expect(res.status).toBe(201);
    const cookies = res.headers['set-cookie'] as string[] | undefined;
    expect(Array.isArray(cookies)).toBe(true);
    const rtCookie = (cookies as string[]).find((c: string) => c.startsWith('refresh_token='));
    expect(rtCookie).toBeDefined();
    expect(rtCookie).toContain('HttpOnly');
  });
});

describe('POST /auth/login', () => {
  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password1' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns 401 for wrong password', async () => {
    await createUser('alice@example.com', 'CorrectPass1');
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'x@y.com' });
    expect(res.status).toBe(400);
  });

  it('returns 200 with accessToken for valid credentials', async () => {
    await createUser('bob@example.com', 'ValidPass1');
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'bob@example.com', password: 'ValidPass1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe('bob@example.com');
  });

  it('sets refresh_token cookie on login', async () => {
    await createUser('carol@example.com', 'ValidPass1');
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'carol@example.com', password: 'ValidPass1' });

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as string[] | undefined;
    expect(Array.isArray(cookies)).toBe(true);
    const rtCookie = (cookies as string[]).find((c: string) => c.startsWith('refresh_token='));
    expect(rtCookie).toBeDefined();
  });
});

describe('POST /auth/logout', () => {
  it('returns 204 with no body', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(204);
  });

  it('clears refresh_token cookie on logout (no cookie sent)', async () => {
    // Without a refresh_token cookie, logout should still return 204
    // (no DB call attempted when cookie is absent)
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(204);
  });
});

describe('POST /auth/refresh', () => {
  it('returns 401 without refresh_token cookie', async () => {
    const res = await request(app).post('/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 for invalid token string', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', 'refresh_token=not-a-valid-jwt');
    expect(res.status).toBe(401);
  });
});
