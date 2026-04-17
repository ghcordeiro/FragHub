import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { loadEnv } from '../config/env';
import { authMiddleware } from '../middleware/auth';
import { db } from '../db';
import {
  buildSteamOpenIdRedirectUrl,
  steamId64FromClaimedId,
  verifySteamOpenIdAssertion,
} from '../services/steamOpenIdService';
import { newSteamLinkNonce, signSteamLinkState, verifySteamLinkState } from '../services/steamState';
import {
  clearUserSteamId,
  findUserById,
  findUserBySteamId,
  updateUserSteamId,
} from '../services/userService';
import { isDuplicateKeyError } from '../utils/dbErrors';

const router = Router();

function firstQuery(v: unknown): string | undefined {
  if (typeof v === 'string') {
    return v;
  }
  if (Array.isArray(v) && typeof v[0] === 'string') {
    return v[0];
  }
  return undefined;
}

function queryToUrlSearchParams(query: Request['query']): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, raw] of Object.entries(query)) {
    const v = firstQuery(raw);
    if (v !== undefined) {
      params.append(k, v);
    }
  }
  return params;
}

router.get('/steam/link', async (req: Request, res: Response, next: NextFunction) => {
  const env = loadEnv();

  // Accept token from query param for browser redirect flows (can't send headers)
  const queryToken = firstQuery(req.query.token);
  if (queryToken && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${queryToken}`;
  }

  await new Promise<void>((resolve) => authMiddleware(req, res, () => resolve()));
  if (res.headersSent) return;

  const userId = req.user!.id;
  const payload = { userId, nonce: newSteamLinkNonce(), exp: Date.now() + 10 * 60 * 1000 };
  const stateToken = signSteamLinkState(payload, env.STEAM_STATE_SECRET);
  const returnTo = new URL(env.STEAM_RETURN_URL);
  returnTo.searchParams.set('state', stateToken);
  const redirectUrl = buildSteamOpenIdRedirectUrl(returnTo.toString(), env.STEAM_REALM);
  res.redirect(302, redirectUrl);
});

router.get('/steam/callback', async (req: Request, res: Response, next: NextFunction) => {
  const env = loadEnv();
  const base = env.FRONTEND_URL.replace(/\/$/, '');

  const stateToken = firstQuery(req.query.state);
  if (!stateToken) {
    res.status(400).json({ error: 'Invalid Steam OpenID callback' });
    return;
  }
  const payload = verifySteamLinkState(stateToken, env.STEAM_STATE_SECRET);
  if (!payload) {
    res.redirect(302, `${base}/players/me?steam_error=state`);
    return;
  }

  const claimedId = firstQuery(req.query['openid.claimed_id']);
  const steamId = steamId64FromClaimedId(claimedId);
  if (!steamId) {
    res.status(400).json({ error: 'Invalid Steam OpenID callback' });
    return;
  }

  const openidParams = queryToUrlSearchParams(req.query);
  const validation = await verifySteamOpenIdAssertion(openidParams);
  if (!validation.ok) {
    if (validation.kind === 'unavailable') {
      res.status(503).json({ error: 'Servico Steam temporariamente indisponivel' });
      return;
    }
    res.status(400).json({ error: 'Invalid Steam OpenID callback' });
    return;
  }

  const userId = payload.userId;
  try {
    await db.transaction(async (trx) => {
      const me = await findUserById(trx, userId);
      if (!me) {
        throw Object.assign(new Error('user_missing'), { code: 'USER_MISSING' });
      }
      const owner = await findUserBySteamId(trx, steamId);
      if (owner && owner.id !== userId) {
        throw Object.assign(new Error('steam_taken'), { code: 'STEAM_TAKEN' });
      }
      if (me.steam_id && me.steam_id !== steamId) {
        throw Object.assign(new Error('already_linked'), { code: 'ALREADY_LINKED' });
      }
      await updateUserSteamId(trx, userId, steamId);
    });
    res.redirect(302, `${base}/players/me?steam_linked=1`);
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === 'STEAM_TAKEN' || isDuplicateKeyError(e)) {
      res.redirect(302, `${base}/players/me?steam_error=steam_taken`);
      return;
    }
    if (err.code === 'ALREADY_LINKED') {
      res.redirect(302, `${base}/players/me?steam_error=already_linked`);
      return;
    }
    if (err.code === 'USER_MISSING') {
      res.redirect(302, `${base}/players/me?steam_error=user_missing`);
      return;
    }
    next(e);
  }
});

router.delete('/steam/link', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await findUserById(db, req.user!.id);
    if (!user?.steam_id) {
      res.status(404).json({ error: 'Steam link not found' });
      return;
    }
    await clearUserSteamId(db, user.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
