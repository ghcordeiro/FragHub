import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import type { Knex } from 'knex';
import { z } from 'zod';
import { loadEnv } from '../config/env';
import { authMiddleware, requireRole } from '../middleware/auth';
import { loginRegisterLimiter, refreshLimiter } from '../middleware/rateLimits';
import { db } from '../db';
import {
  buildGoogleAuthUrl,
  createGoogleClient,
  verifyGoogleAuthCode,
} from '../services/googleOAuthService';
import {
  findRefreshByHash,
  hashRefreshToken,
  insertRefreshToken,
  revokeAllForUser,
  revokeRefreshByHash,
  revokeRefreshForDevice,
} from '../services/refreshTokenService';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/tokenService';
import {
  findUserByEmail,
  findUserByGoogleId,
  findUserById,
  insertUser,
  toPublicUser,
  updateUserGoogleId,
  type UserRow,
} from '../services/userService';
import { isDuplicateKeyError } from '../utils/dbErrors';

const ACCESS_EXPIRES_SEC = 15 * 60;
const OAUTH_ACCESS_EXPIRES_SEC = 30;
const REFRESH_EXPIRES_SEC = 7 * 24 * 60 * 60;
const BCRYPT_COST = 12;

const passwordSchema = z
  .string()
  .min(8)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must include uppercase, lowercase, and digit');

const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  displayName: z.string().min(1).max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceId: z.string().min(1).max(255).optional(),
});

const adminCreateSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  displayName: z.string().min(1).max(120).optional(),
  role: z.enum(['player', 'admin']).default('player'),
});

function refreshCookieOptions(env: ReturnType<typeof loadEnv>): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_EXPIRES_SEC * 1000,
  };
}

function oauthStateCookieOptions(env: ReturnType<typeof loadEnv>): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth',
    maxAge: 10 * 60 * 1000,
  };
}

const INVALID_CREDENTIALS = { error: 'Invalid credentials' };

async function issueSession(
  trx: Knex,
  user: UserRow,
  deviceId: string | undefined,
  res: Response,
  opts: { revokeDeviceFirst?: boolean },
): Promise<{ accessToken: string }> {
  const env = loadEnv();
  if (opts.revokeDeviceFirst && deviceId) {
    await revokeRefreshForDevice(trx, user.id, deviceId);
  }
  const rawRefresh = signRefreshToken(user.id, env.JWT_REFRESH_SECRET, REFRESH_EXPIRES_SEC);
  await insertRefreshToken(trx, user.id, rawRefresh, deviceId);
  const accessToken = signAccessToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
    },
    env.JWT_SECRET,
    { expiresInSeconds: ACCESS_EXPIRES_SEC },
  );
  res.cookie('refresh_token', rawRefresh, refreshCookieOptions(env));
  return { accessToken };
}

function clearRefreshCookie(res: Response): void {
  const env = loadEnv();
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
  });
}

const router = Router();

router.post('/register', loginRegisterLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }
  const { email, password, displayName } = parsed.data;
  const name = displayName?.trim() || email.split('@')[0] || 'User';
  try {
    await db.transaction(async (trx) => {
      const hash = await bcrypt.hash(password, BCRYPT_COST);
      const id = await insertUser(trx, {
        email,
        password_hash: hash,
        display_name: name,
        role: 'player',
      });
      const user = await findUserById(trx, id);
      if (!user) {
        throw new Error('User not found after insert');
      }
      const { accessToken } = await issueSession(trx, user, undefined, res, {});
      res.status(201).json({ accessToken, user: toPublicUser(user) });
    });
  } catch (e) {
    if (isDuplicateKeyError(e)) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    next(e);
  }
});

router.post('/login', loginRegisterLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }
  const { email, password, deviceId } = parsed.data;
  const user = await findUserByEmail(db, email);
  if (!user) {
    res.status(401).json(INVALID_CREDENTIALS);
    return;
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    res.status(401).json(INVALID_CREDENTIALS);
    return;
  }
  try {
    await db.transaction(async (trx) => {
      const fresh = await findUserById(trx, user.id);
      if (!fresh) {
        throw new Error('User not found');
      }
      const { accessToken } = await issueSession(trx, fresh, deviceId, res, { revokeDeviceFirst: true });
      res.status(200).json({ accessToken, user: toPublicUser(fresh) });
    });
  } catch (e) {
    next(e);
  }
});

router.post('/refresh', refreshLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const raw = req.cookies?.refresh_token as string | undefined;
  if (!raw || typeof raw !== 'string') {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const env = loadEnv();
  let decodedUserId: number | undefined;
  try {
    const { sub } = verifyRefreshToken(raw, env.JWT_REFRESH_SECRET);
    decodedUserId = sub;
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const tokenHash = hashRefreshToken(raw);
  try {
    const result = await db.transaction(
      async (
        trx: Knex,
      ): Promise<
        | { ok: true; accessToken: string; user: ReturnType<typeof toPublicUser>; rawRefresh: string }
        | { ok: false }
      > => {
        const row = await findRefreshByHash(trx, tokenHash);
        if (!row) {
          if (decodedUserId !== undefined) {
            await revokeAllForUser(trx, decodedUserId);
          }
          return { ok: false };
        }
        if (row.revoked_at) {
          await revokeAllForUser(trx, row.user_id);
          return { ok: false };
        }
        if (new Date(row.expires_at).getTime() <= Date.now()) {
          await revokeRefreshByHash(trx, tokenHash);
          return { ok: false };
        }
        await revokeRefreshByHash(trx, tokenHash);
        const user = await findUserById(trx, row.user_id);
        if (!user) {
          return { ok: false };
        }
        const rawNew = signRefreshToken(user.id, env.JWT_REFRESH_SECRET, REFRESH_EXPIRES_SEC);
        await insertRefreshToken(trx, user.id, rawNew, undefined);
        const accessToken = signAccessToken(
          {
            sub: user.id,
            email: user.email,
            role: user.role,
            displayName: user.display_name,
          },
          env.JWT_SECRET,
          { expiresInSeconds: ACCESS_EXPIRES_SEC },
        );
        return { ok: true, accessToken, user: toPublicUser(user), rawRefresh: rawNew };
      },
    );
    if (!result.ok) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.cookie('refresh_token', result.rawRefresh, refreshCookieOptions(env));
    res.status(200).json({ accessToken: result.accessToken, user: result.user });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.cookies?.refresh_token as string | undefined;
    if (raw && typeof raw === 'string') {
      const tokenHash = hashRefreshToken(raw);
      await revokeRefreshByHash(db, tokenHash);
    }
    clearRefreshCookie(res);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

router.get('/google', (_req: Request, res: Response) => {
  const env = loadEnv();
  const state = randomBytes(32).toString('hex');
  const client = createGoogleClient(env);
  const url = buildGoogleAuthUrl(client, state);
  res.cookie('oauth_state', state, oauthStateCookieOptions(env));
  res.redirect(302, url);
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const env = loadEnv();
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const cookieState = req.cookies?.oauth_state as string | undefined;
  res.clearCookie('oauth_state', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth',
  });
  const base = env.FRONTEND_URL.replace(/\/$/, '');
  if (!code || !state || !cookieState || state !== cookieState) {
    res.redirect(302, `${base}?error=oauth_state`);
    return;
  }
  try {
    const client = createGoogleClient(env);
    const profile = await verifyGoogleAuthCode(client, code, env.GOOGLE_CLIENT_ID);
    const txResult = await db.transaction(
      async (
        trx: Knex,
      ): Promise<
        | { kind: 'ok'; accessToken: string; rawRefresh: string }
        | { kind: 'redirect'; query: string }
      > => {
        let user = await findUserByGoogleId(trx, profile.sub);
        if (!user) {
          const byEmail = await findUserByEmail(trx, profile.email);
          if (byEmail) {
            if (byEmail.google_id && byEmail.google_id !== profile.sub) {
              return { kind: 'redirect', query: 'error=oauth_account_conflict' };
            }
            if (!byEmail.google_id) {
              await updateUserGoogleId(trx, byEmail.id, profile.sub);
            }
            user = await findUserById(trx, byEmail.id);
          } else {
            const opaque = randomBytes(32).toString('hex');
            const hash = await bcrypt.hash(opaque, BCRYPT_COST);
            const id = await insertUser(trx, {
              email: profile.email,
              password_hash: hash,
              display_name: profile.name,
              role: 'player',
              google_id: profile.sub,
            });
            user = await findUserById(trx, id);
          }
        }
        if (!user) {
          return { kind: 'redirect', query: 'error=oauth_failed' };
        }
        const rawRefresh = signRefreshToken(user.id, env.JWT_REFRESH_SECRET, REFRESH_EXPIRES_SEC);
        await insertRefreshToken(trx, user.id, rawRefresh, undefined);
        const accessToken = signAccessToken(
          {
            sub: user.id,
            email: user.email,
            role: user.role,
            displayName: user.display_name,
          },
          env.JWT_SECRET,
          { expiresInSeconds: OAUTH_ACCESS_EXPIRES_SEC },
        );
        return { kind: 'ok', accessToken, rawRefresh };
      },
    );
    if (txResult.kind === 'redirect') {
      res.redirect(302, `${base}?${txResult.query}`);
      return;
    }
    res.cookie('refresh_token', txResult.rawRefresh, refreshCookieOptions(env));
    res.redirect(302, `${base}?token=${encodeURIComponent(txResult.accessToken)}`);
  } catch {
    res.redirect(302, `${base}?error=oauth_failed`);
  }
});

router.post(
  '/admin/create-user',
  authMiddleware,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = adminCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    const { email, password, displayName, role } = parsed.data;
    const name = displayName?.trim() || email.split('@')[0] || 'User';
    try {
      await db.transaction(async (trx) => {
        const hash = await bcrypt.hash(password, BCRYPT_COST);
        const id = await insertUser(trx, {
          email,
          password_hash: hash,
          display_name: name,
          role,
        });
        const user = await findUserById(trx, id);
        if (!user) {
          throw new Error('User not found after insert');
        }
        res.status(201).json({ user: toPublicUser(user) });
      });
    } catch (e) {
      if (isDuplicateKeyError(e)) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }
      next(e);
    }
  },
);

export default router;
