import type { NextFunction, Request, Response } from 'express';
import { loadEnv } from '../config/env';
import { db } from '../db';
import { verifyAccessToken } from '../services/tokenService';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const token = header.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const env = loadEnv();
      const payload = verifyAccessToken(token, env.JWT_SECRET);
      const user = await db('users').where({ id: payload.sub }).first();
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (user.email !== payload.email || user.role !== payload.role) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (user.banned_at != null) {
        res.status(401).json({ error: 'Account banned' });
        return;
      }
      req.user = { id: user.id, email: user.email, role: user.role };
      next();
    } catch {
      res.status(401).json({ error: 'Unauthorized' });
    }
  })();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
