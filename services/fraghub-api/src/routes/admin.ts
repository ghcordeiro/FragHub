/**
 * ADMIN-01, ADMIN-02: Admin API routes
 * All endpoints protected by requireAdmin() middleware.
 * Consistent response format: { data?, error?, message?, pagination? }
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import { db } from '../db';
import { requireAdmin } from '../middleware/adminAuth';
import { adminRateLimiter, rconRateLimiter } from '../middleware/rateLimits';
import * as adminService from '../services/adminService';
import * as serverService from '../services/serverService';
import * as configService from '../services/configService';
import { captureIp } from '../middleware/adminAuth';
import { clearUserSteamId, findUserById } from '../services/userService';
import logger from '../logger';

const router = Router();

/**
 * GET /api/admin/dashboard
 * Returns metrics for admin dashboard
 */
router.get('/dashboard', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const metrics = await adminService.getDashboardMetrics(db);
    res.status(200).json({ data: metrics });
  } catch (err) {
    logger.error('[ADMIN] dashboard failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/players
 * List players with optional search and pagination
 * Query params: search?, page=1, limit=50
 */
router.get('/players', requireAdmin(), adminRateLimiter, async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || undefined;
    const page = Number.parseInt((req.query.page as string) || '1', 10);
    const limit = Number.parseInt((req.query.limit as string) || '50', 10);

    if (!Number.isFinite(page) || page < 1 || !Number.isFinite(limit) || limit < 1 || limit > 100) {
      res.status(400).json({ error: 'Invalid pagination parameters' });
      return;
    }

    const { players, total } = await adminService.listPlayers(db, search, page, limit);

    res.status(200).json({
      data: players,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (err) {
    logger.error('[ADMIN] listPlayers failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/players/:id
 * Get full player profile with match and ban history
 */
router.get('/players/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const player_id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(player_id) || player_id < 1) {
      res.status(400).json({ error: 'Invalid player ID' });
      return;
    }

    const player = await adminService.getPlayer(db, player_id);
    res.status(200).json({ data: player });
  } catch (err: any) {
    if (err.message === 'Player not found') {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    logger.error('[ADMIN] getPlayer failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/players/:id
 * Update player profile (name, email, role)
 */
router.patch('/players/:id', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const player_id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(player_id) || player_id < 1) {
      res.status(400).json({ error: 'Invalid player ID' });
      return;
    }

    const { name, email, role } = req.body;

    const updated = await adminService.updatePlayer(
      db,
      player_id,
      { name, email, role },
      req.user!.id,
      captureIp(req),
    );

    res.status(200).json({ data: updated });
  } catch (err: any) {
    if (err.message === 'Player not found') {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    if (err.message === 'Cannot modify your own role') {
      res.status(400).json({ error: 'Cannot modify your own role' });
      return;
    }
    logger.error('[ADMIN] updatePlayer failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/players/ban
 * Ban a player with reason and optional duration
 * Body: { player_id, reason, duration_days? }
 */
router.post('/players/ban', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { player_id, reason, duration_days } = req.body;

    if (!Number.isFinite(player_id) || player_id < 1) {
      res.status(400).json({ error: 'Invalid player ID' });
      return;
    }
    if (!reason || typeof reason !== 'string' || reason.length === 0) {
      res.status(400).json({ error: 'Reason is required' });
      return;
    }

    const banned = await adminService.banPlayer(
      db,
      player_id,
      { reason, duration_days },
      req.user!.id,
      captureIp(req),
    );

    res.status(200).json({ data: banned });
  } catch (err: any) {
    if (err.message === 'Cannot ban self') {
      res.status(400).json({ error: 'Cannot ban self' });
      return;
    }
    if (err.message === 'Player not found') {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    logger.error('[ADMIN] banPlayer failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/players/unban
 * Unban a player
 * Body: { player_id }
 */
router.post('/players/unban', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { player_id } = req.body;

    if (!Number.isFinite(player_id) || player_id < 1) {
      res.status(400).json({ error: 'Invalid player ID' });
      return;
    }

    const unbanned = await adminService.unbanPlayer(db, player_id, req.user!.id, captureIp(req));

    res.status(200).json({ data: unbanned });
  } catch (err: any) {
    if (err.message === 'Player not found') {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    if (err.message === 'Player is not banned') {
      res.status(400).json({ error: 'Player is not banned' });
      return;
    }
    logger.error('[ADMIN] unbanPlayer failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/players
 * Create a new player account
 * Body: { name, email }
 * Returns: { user, temp_password }
 */
router.post('/players', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const { user, temp_password } = await adminService.createPlayer(
      db,
      { name, email },
      req.user!.id,
      captureIp(req),
    );

    res.status(201).json({
      data: { user, temp_password },
      message: 'Player created. Password shown once only.',
    });
  } catch (err: any) {
    if (err.message === 'Email already exists') {
      res.status(400).json({ error: 'Email already exists' });
      return;
    }
    logger.error('[ADMIN] createPlayer failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/logs
 * Get audit logs with optional filters
 * Query params: action_type?, admin_id?, date_from?, date_to?, page=1, limit=50
 */
router.get('/logs', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const action_type = (req.query.action_type as string) || undefined;
    const admin_id = req.query.admin_id
      ? Number.parseInt(req.query.admin_id as string, 10)
      : undefined;
    const date_from = req.query.date_from ? new Date(req.query.date_from as string) : undefined;
    const date_to = req.query.date_to ? new Date(req.query.date_to as string) : undefined;
    const page = Number.parseInt((req.query.page as string) || '1', 10);
    const limit = Number.parseInt((req.query.limit as string) || '50', 10);

    if (!Number.isFinite(page) || page < 1 || !Number.isFinite(limit) || limit < 1 || limit > 100) {
      res.status(400).json({ error: 'Invalid pagination parameters' });
      return;
    }

    const {
      logs,
      total,
      page: responsePage,
      limit: responseLimit,
    } = await adminService.getAuditLogs(db, {
      page,
      limit,
      action_type,
      admin_id,
      date_from,
      date_to,
    });

    res.status(200).json({
      data: logs,
      pagination: {
        page: responsePage,
        limit: responseLimit,
        total,
      },
    });
  } catch (err) {
    logger.error('[ADMIN] getAuditLogs failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/servers
 * List all servers with live status
 */
router.get('/servers', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const servers = await serverService.listServers(db);
    res.status(200).json({ data: servers });
  } catch (err) {
    logger.error('[ADMIN] listServers failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/servers/:id/:action
 * Control server lifecycle (start, stop, restart)
 * URL params: id (cs2, csgo), action (start, stop, restart)
 */
router.post('/servers/:id/:action', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const server_id = req.params.id;
    const action = req.params.action as 'start' | 'stop' | 'restart';

    if (!['start', 'stop', 'restart'].includes(action)) {
      res.status(400).json({ error: 'Invalid action' });
      return;
    }

    const result = await serverService.controlServer(
      db,
      server_id,
      action,
      req.user!.id,
      captureIp(req),
    );

    res.status(200).json({ data: result });
  } catch (err: any) {
    if (err.message === 'Invalid action' || err.message === 'Server not found') {
      res.status(400).json({ error: err.message });
      return;
    }
    logger.error('[ADMIN] controlServer failed:', err);
    res.status(503).json({ error: 'Server control unavailable' });
  }
});

/**
 * POST /api/admin/servers/:id/rcon
 * Execute a validated RCON command on a server
 * URL params: id (cs2, csgo)
 * Body: { command }
 * Rate limited: 20 req/min per admin
 */
router.post(
  '/servers/:id/rcon',
  requireAdmin(),
  rconRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const server_id = req.params.id;
      const { command } = req.body;

      if (!command || typeof command !== 'string' || command.length === 0) {
        res.status(400).json({ error: 'Command is required' });
        return;
      }

      const result = await serverService.executeRconCommand(
        db,
        server_id,
        command,
        req.user!.id,
        captureIp(req),
      );

      res.status(200).json({ data: result });
    } catch (err: any) {
      if (err.message === 'Server not found') {
        res.status(404).json({ error: 'Server not found' });
        return;
      }
      if (err.message?.includes('Command not allowed') || err.message?.includes('not allowed')) {
        res.status(400).json({ error: 'Command not allowed' });
        return;
      }
      logger.error('[ADMIN] executeRconCommand failed:', err);
      res.status(503).json({ error: 'RCON service unavailable' });
    }
  },
);

/**
 * GET /api/admin/servers/:id/config
 * List available plugins for a server
 * URL params: id (cs2, csgo)
 */
router.get('/servers/:id/config', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const server_id = req.params.id;
    const plugins = configService.getAvailablePlugins(server_id);

    if (plugins.length === 0) {
      res.status(404).json({ error: 'Server not found or has no plugins' });
      return;
    }

    res.status(200).json({ data: { server_id, plugins } });
  } catch (err) {
    logger.error('[ADMIN] listPlugins failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/servers/:id/config/:plugin
 * Read a plugin configuration file
 * URL params: id (cs2, csgo), plugin (matchzy, get5, etc.)
 */
router.get('/servers/:id/config/:plugin', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const plugin = req.params.plugin;

    const content = await configService.readConfig(plugin);

    res.status(200).json({
      data: {
        plugin,
        content,
        size: content.length,
      },
    });
  } catch (err: any) {
    if (err.message.includes('not found')) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err.message.includes('Path traversal')) {
      res.status(400).json({ error: 'Path traversal detected' });
      return;
    }
    logger.error('[ADMIN] readConfig failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/servers/:id/config/:plugin
 * Save a plugin configuration file
 * URL params: id (cs2, csgo), plugin (matchzy, get5, etc.)
 * Body: { content }
 * Header: X-Confirm-Override (to override warning if players connected)
 */
router.put('/servers/:id/config/:plugin', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const plugin = req.params.plugin;
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    // Check if override header present
    const override = req.headers['x-confirm-override'] === 'true';

    // For v0.6, hardcode server_has_players to false
    // In production, would query server status
    const server_has_players = false;

    const result = await configService.saveConfig(
      db,
      plugin,
      content,
      server_has_players,
      req.user!.id,
      captureIp(req),
      override,
    );

    // Return appropriate status based on warning
    const status = result.warning ? 200 : 200;
    res.status(status).json({ data: result });
  } catch (err: any) {
    if (err.message.includes('not found')) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err.message.includes('Path traversal')) {
      res.status(400).json({ error: 'Path traversal detected' });
      return;
    }
    if (err.message.includes('too large')) {
      res.status(413).json({ error: err.message });
      return;
    }
    logger.error('[ADMIN] saveConfig failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /admin/players/:id/steam
 * Remove Steam link from a player (admin only)
 */
router.delete('/players/:id/steam', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const player_id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(player_id) || player_id < 1) {
      res.status(400).json({ error: 'Invalid player ID' });
      return;
    }

    const user = await findUserById(db, player_id);
    if (!user) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    if (!user.steam_id) {
      res.status(404).json({ error: 'Player has no Steam link' });
      return;
    }

    await clearUserSteamId(db, player_id);
    logger.info('[ADMIN] Steam link removed', { target_id: player_id, admin_id: req.user!.id });
    res.status(204).send();
  } catch (err) {
    logger.error('[ADMIN] removeSteamLink failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
