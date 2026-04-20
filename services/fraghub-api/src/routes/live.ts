import type { Request, Response } from 'express';
import { Router } from 'express';
import { getLiveState } from '../services/liveStateService';

const router = Router();

router.get('/live', (_req: Request, res: Response) => {
  const state = getLiveState();
  if (!state) {
    res.json({ isLive: false });
    return;
  }
  res.json({ isLive: true, ...state });
});

export default router;
