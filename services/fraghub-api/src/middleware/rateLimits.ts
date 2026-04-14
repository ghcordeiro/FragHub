import rateLimit from 'express-rate-limit';

export const loginRegisterLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, optionsUsed) => {
    const retrySec = Math.max(1, Math.ceil(optionsUsed.windowMs / 1000));
    res.setHeader('Retry-After', String(retrySec));
    res.status(429).json({ error: 'Too many requests' });
  },
});

export const refreshLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, optionsUsed) => {
    const retrySec = Math.max(1, Math.ceil(optionsUsed.windowMs / 1000));
    res.setHeader('Retry-After', String(retrySec));
    res.status(429).json({ error: 'Too many requests' });
  },
});

/** STEAMINT-REQ-008 — endpoint público por Steam ID */
/** MATCHAPI-NFR-004 — webhook de partidas */
export const matchesWebhookLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, optionsUsed) => {
    const retrySec = Math.max(1, Math.ceil(optionsUsed.windowMs / 1000));
    res.setHeader('Retry-After', String(retrySec));
    res.status(429).json({ error: 'Too many requests' });
  },
});

export const playerPublicLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, optionsUsed) => {
    const retrySec = Math.max(1, Math.ceil(optionsUsed.windowMs / 1000));
    res.setHeader('Retry-After', String(retrySec));
    res.status(429).json({ error: 'Too many requests' });
  },
});

/**
 * ADMIN-01: Admin panel rate limiters
 * Generous rate limit for most admin operations (100 req/min per admin)
 * Strict rate limit for dangerous RCON operations (20 req/min per admin)
 */
export const adminRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 100,
  keyGenerator: (req) => {
    // Rate limit by user ID extracted from JWT
    return (req.user?.id as any)?.toString() ?? req.ip ?? '';
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, optionsUsed) => {
    const retrySec = Math.max(1, Math.ceil(optionsUsed.windowMs / 1000));
    res.setHeader('Retry-After', String(retrySec));
    res.status(429).json({ error: 'Too many requests' });
  },
});

export const rconRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  keyGenerator: (req) => {
    // Rate limit by user ID extracted from JWT
    return (req.user?.id as any)?.toString() ?? req.ip ?? '';
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, optionsUsed) => {
    const retrySec = Math.max(1, Math.ceil(optionsUsed.windowMs / 1000));
    res.setHeader('Retry-After', String(retrySec));
    res.status(429).json({ error: 'Too many requests' });
  },
});
