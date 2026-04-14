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
