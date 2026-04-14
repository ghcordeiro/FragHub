import { Router, Request, Response, NextFunction } from 'express';
import { Knex } from 'knex';
import rateLimit from 'express-rate-limit';
import * as queueService from '../services/queueService';
import * as discordNotifyService from '../services/discordNotifyService';
import { loadEnv } from '../config/env';
import logger from '../logger';

/**
 * Queue Routes (Phase 5 Matchmaking)
 * POST /api/queue/join, POST /api/queue/leave, GET /api/queue/status, POST /api/queue/vote-map
 */

export function createQueueRouter(knex: Knex): Router {
  const router = Router();
  const env = loadEnv();

  const queueConfig = {
    maxQueueSize: 10,
    maxEloDiff: env.MAX_ELO_DIFF,
    mapPool: env.QUEUE_MAP_POOL.split(',').map(m => m.trim()),
    vetoTimeoutSeconds: env.VETO_TIMEOUT_SECONDS,
  };

  // Rate limiter: 1 join per 30 seconds per player (QUEUE-REQ-001)
  const queueJoinLimiter = rateLimit({
    windowMs: 30 * 1000,
    max: 1,
    keyGenerator: (req: any) => req.user?.id || req.ip,
    skip: (req: any) => !req.user?.id,
    message: 'Queue join rate limited: 1 per 30 seconds',
  });

  // POST /api/queue/join
  router.post(
    '/join',
    (req: any, res: Response, next: NextFunction) => {
      // Middleware: authMiddleware (assumed to be applied globally)
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED', statusCode: 401 });
      }
      next();
    },
    queueJoinLimiter,
    async (req: any, res: Response) => {
      try {
        const userId = req.user.id;
        const result = await queueService.joinQueue(userId, knex, queueConfig);

        logger.info(`[API] Player ${userId} joined queue: position ${result.position}/${result.totalInQueue}`);
        res.status(200).json(result);
      } catch (error: any) {
        if (error.statusCode) {
          return res.status(error.statusCode).json({
            error: error.error,
            code: error.code,
            statusCode: error.statusCode,
          });
        }
        logger.error('[API] /queue/join error:', error);
        res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR', statusCode: 500 });
      }
    }
  );

  // POST /api/queue/leave
  router.post('/leave', (req: any, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED', statusCode: 401 });
    }
    next();
  },
  async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      await queueService.leaveQueue(userId, knex);

      logger.info(`[API] Player ${userId} left queue`);
      res.status(200).json({ message: 'left queue' });
    } catch (error: any) {
      logger.error('[API] /queue/leave error:', error);
      res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR', statusCode: 500 });
    }
  }
  );

  // GET /api/queue/status
  router.get('/status', (req: any, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED', statusCode: 401 });
    }
    next();
  },
  async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const status = await queueService.getQueueStatus(userId, knex);

      res.status(200).json(status);
    } catch (error: any) {
      logger.error('[API] /queue/status error:', error);
      res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR', statusCode: 500 });
    }
  }
  );

  // POST /api/queue/vote-map
  router.post('/vote-map', (req: any, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED', statusCode: 401 });
    }
    next();
  },
  async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { action, map, queueSessionId } = req.body;

      if (!action || !map || !queueSessionId) {
        return res.status(400).json({
          error: 'Missing required fields: action, map, queueSessionId',
          code: 'MISSING_FIELDS',
          statusCode: 400,
        });
      }

      if (action !== 'ban') {
        return res.status(400).json({
          error: 'Invalid action (must be "ban")',
          code: 'INVALID_ACTION',
          statusCode: 400,
        });
      }

      await queueService.voteMap(userId, action, map, queueSessionId, knex, {
        vetoTimeoutSeconds: queueConfig.vetoTimeoutSeconds,
      });

      logger.info(`[API] Player ${userId} voted to ban ${map}`);
      res.status(200).json({ message: 'vote recorded' });
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.error,
          code: error.code,
          statusCode: error.statusCode,
        });
      }
      logger.error('[API] /queue/vote-map error:', error);
      res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR', statusCode: 500 });
    }
  }
  );

  return router;
}

export default createQueueRouter;
