import type { Request, Response, NextFunction } from 'express';

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
];

function isPrivateIp(ip: string): boolean {
  const cleaned = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  return PRIVATE_RANGES.some((re) => re.test(cleaned));
}

export function lanOnly(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? req.socket.remoteAddress ?? '';
  if (isPrivateIp(ip)) {
    next();
    return;
  }
  res.status(403).json({ error: 'Access restricted to local network' });
}
