import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/tokenService';
import { loadEnv } from '../config/env';

/**
 * ADMIN-01: Role-based authorization middleware
 * Checks JWT token for admin role claim before allowing endpoint access.
 * Never trusts request body for role identification; extracts from signed JWT sub claim only.
 */

/**
 * Extract client IP address from request headers or socket.
 * Respects X-Forwarded-For header for reverse proxy scenarios.
 */
export function captureIp(req: Request): string | undefined {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain comma-separated IPs; take the first
    return forwarded.split(',')[0]?.trim();
  }
  return req.socket?.remoteAddress;
}

/**
 * Safely extract admin ID from JWT token payload.
 * Uses the 'sub' claim (subject = user ID), never request body.
 */
export function getAdminId(token: string): number {
  try {
    const env = loadEnv();
    const payload = verifyAccessToken(token, env.JWT_SECRET);
    return payload.sub as number;
  } catch {
    throw new Error('Invalid token');
  }
}

/**
 * Middleware: requireAdmin()
 * Validates JWT token and checks if user has admin role.
 * Must be applied BEFORE handler logic on all /api/admin/* endpoints.
 *
 * Returns:
 * - 401 Unauthorized: if token missing, invalid, or user not found
 * - 403 Forbidden: if user has insufficient role
 */
export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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

      const env = loadEnv();
      const payload = verifyAccessToken(token, env.JWT_SECRET);

      // Validate user exists and matches token claims
      const { db } = await import('../db');
      const user = await db('users').where({ id: payload.sub }).first();

      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Validate claims match stored user data
      if (user.email !== payload.email || user.role !== payload.role) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if user is banned
      if (user.banned_at != null) {
        res.status(401).json({ error: 'Account banned' });
        return;
      }

      // Validate user has admin role
      if (user.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Attach user and token to request for downstream handlers
      req.user = { id: user.id, email: user.email, role: user.role };
      (req as any).adminToken = token;

      next();
    } catch {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };
}
