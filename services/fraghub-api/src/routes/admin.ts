import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { db } from '../db';
import { clearUserSteamId, findUserById } from '../services/userService';

const router = Router();

router.delete(
  '/players/:id/steam',
  authMiddleware,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    try {
      const user = await findUserById(db, id);
      if (!user) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      await clearUserSteamId(db, id);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);

export default router;
