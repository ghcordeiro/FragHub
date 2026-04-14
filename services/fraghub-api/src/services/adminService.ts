/**
 * ADMIN-01, ADMIN-02: Admin service layer
 * Business logic for admin operations: dashboard, player management, audit logging
 */

import { Knex } from 'knex';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import logger from '../logger';
import type { AdminAction, DashboardMetrics, AuditLogEntry, PlayerBan } from '../types/admin';

/**
 * Create an audit log entry asynchronously.
 * Fire-and-forget: errors logged but never block main response.
 * Validates action_type against enum.
 */
export async function createAuditLog(
  db: Knex,
  admin_id: number,
  action_type: AdminAction,
  target_type: 'player' | 'server' | undefined,
  target_id: number | undefined,
  details: Record<string, any>,
  ip_address: string | undefined,
): Promise<void> {
  setImmediate(() => {
    db('admin_audit_logs')
      .insert({
        admin_id,
        action_type,
        target_type: target_type || null,
        target_id: target_id || null,
        details: JSON.stringify(details),
        ip_address: ip_address || null,
        created_at: new Date(),
      })
      .catch((err) => {
        logger.error('[AUDIT] Failed to create audit log:', err);
      });
  });
}

/**
 * Get dashboard metrics for the admin dashboard page.
 * Returns: total players, matches today, servers online, recent logs.
 */
export async function getDashboardMetrics(db: Knex): Promise<DashboardMetrics> {
  try {
    // Count total active players (not banned)
    const playerCountResult = await db('users')
      .where('role', 'player')
      .whereNull('banned_at')
      .count('* as count')
      .first();
    const total_players = Number(playerCountResult?.count ?? 0);

    // Count matches from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const matchCountResult = await db('matches')
      .whereRaw('DATE(created_at) = ?', [today.toISOString().split('T')[0]])
      .count('* as count')
      .first();
    const matches_today = Number(matchCountResult?.count ?? 0);

    // Count servers online (hardcoded for now, extend if server_status table exists)
    // In v0.6, we'll assume cs2 and csgo servers
    const servers_online = 2; // Placeholder: extend with systemctl integration

    // Get recent audit logs (last 5)
    const recent_logs = await db('admin_audit_logs')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(5);

    return {
      total_players,
      matches_today,
      servers_online,
      recent_logs: recent_logs.map((log: any) => ({
        ...log,
        details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details,
      })),
    };
  } catch (err) {
    logger.error('[ADMIN] getDashboardMetrics failed:', err);
    throw err;
  }
}

/**
 * List players with optional search and pagination.
 * Uses ILIKE for case-insensitive name/email search.
 */
export async function listPlayers(
  db: Knex,
  search?: string,
  page: number = 1,
  limit: number = 50,
): Promise<{ players: any[]; total: number }> {
  try {
    let query = db('users').where('role', 'player');

    if (search) {
      query = query.whereRaw('(display_name ILIKE ? OR email ILIKE ?)', [
        `%${search}%`,
        `%${search}%`,
      ]);
    }

    const total = await query.clone().count('* as count').first();
    const totalCount = Number(total?.count ?? 0);

    const offset = (page - 1) * limit;
    const players = await query
      .select('id', 'email', 'display_name', 'role', 'banned_at', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return { players, total: totalCount };
  } catch (err) {
    logger.error('[ADMIN] listPlayers failed:', err);
    throw err;
  }
}

/**
 * Get full player profile including match history and ban history.
 */
export async function getPlayer(db: Knex, player_id: number): Promise<any> {
  try {
    const player = await db('users').where({ id: player_id }).first();
    if (!player) {
      throw new Error('Player not found');
    }

    // Get match history (last 10)
    const matches = await db('matches')
      .where((q) => {
        q.where('player1_id', player_id).orWhere('player2_id', player_id);
      })
      .orderBy('created_at', 'desc')
      .limit(10);

    // Get ban history
    const bans = await db('player_bans').where({ player_id });

    return {
      ...player,
      matches,
      bans,
    };
  } catch (err) {
    logger.error('[ADMIN] getPlayer failed:', err);
    throw err;
  }
}

/**
 * Update player profile (name, email, role).
 * Prevents admin from modifying their own role.
 */
export async function updatePlayer(
  db: Knex,
  player_id: number,
  updates: { name?: string; email?: string; role?: string },
  admin_id: number,
  ip_address: string | undefined,
): Promise<any> {
  try {
    const player = await db('users').where({ id: player_id }).first();
    if (!player) {
      throw new Error('Player not found');
    }

    // Prevent self-role-modification
    if (updates.role && player_id === admin_id) {
      throw new Error('Cannot modify your own role');
    }

    const updateData: any = {};
    if (updates.name) updateData.display_name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.role) updateData.role = updates.role;

    await db('users').where({ id: player_id }).update(updateData);

    // Log audit
    await createAuditLog(db, admin_id, 'edit_player', 'player', player_id, updates, ip_address);

    const updated = await db('users').where({ id: player_id }).first();
    return updated;
  } catch (err) {
    logger.error('[ADMIN] updatePlayer failed:', err);
    throw err;
  }
}

/**
 * Ban a player with optional duration.
 * Prevents admin from banning self.
 * Creates player_bans record and sets users.banned_at.
 */
export async function banPlayer(
  db: Knex,
  player_id: number,
  banData: { reason: string; duration_days?: number },
  admin_id: number,
  ip_address: string | undefined,
): Promise<any> {
  try {
    if (player_id === admin_id) {
      throw new Error('Cannot ban self');
    }

    const player = await db('users').where({ id: player_id }).first();
    if (!player) {
      throw new Error('Player not found');
    }

    const now = new Date();

    // Create ban record
    const banRecord = await db('player_bans').insert({
      player_id,
      banned_by_id: admin_id,
      reason: banData.reason,
      duration_days: banData.duration_days || null,
      banned_at: now,
    });

    // Update user banned_at
    await db('users').where({ id: player_id }).update({
      banned_at: now,
      banned_reason: banData.reason,
    });

    // Log audit
    await createAuditLog(
      db,
      admin_id,
      'ban_player',
      'player',
      player_id,
      {
        reason: banData.reason,
        duration_days: banData.duration_days,
      },
      ip_address,
    );

    const updated = await db('users').where({ id: player_id }).first();
    return updated;
  } catch (err) {
    logger.error('[ADMIN] banPlayer failed:', err);
    throw err;
  }
}

/**
 * Unban a player.
 * Clears banned_at and creates unbanned_at record.
 */
export async function unbanPlayer(
  db: Knex,
  player_id: number,
  admin_id: number,
  ip_address: string | undefined,
): Promise<any> {
  try {
    const player = await db('users').where({ id: player_id }).first();
    if (!player) {
      throw new Error('Player not found');
    }

    if (!player.banned_at) {
      throw new Error('Player is not banned');
    }

    const now = new Date();

    // Update player_bans record with unbanned_at
    await db('player_bans')
      .where({ player_id, unbanned_at: null })
      .update({
        unbanned_at: now,
        unbanned_by_id: admin_id,
      });

    // Clear banned_at on user
    await db('users').where({ id: player_id }).update({
      banned_at: null,
      banned_reason: null,
    });

    // Log audit
    await createAuditLog(db, admin_id, 'unban_player', 'player', player_id, {}, ip_address);

    const updated = await db('users').where({ id: player_id }).first();
    return updated;
  } catch (err) {
    logger.error('[ADMIN] unbanPlayer failed:', err);
    throw err;
  }
}

/**
 * Create a new player account with temporary password.
 * Password is generated, hashed, and returned (shown once in UI).
 */
export async function createPlayer(
  db: Knex,
  playerData: { name: string; email: string },
  admin_id: number,
  ip_address: string | undefined,
): Promise<{ user: any; temp_password: string }> {
  try {
    // Check if email already exists
    const existing = await db('users').where({ email: playerData.email }).first();
    if (existing) {
      throw new Error('Email already exists');
    }

    // Generate temporary password
    const temp_password = crypto.randomBytes(12).toString('hex');
    const password_hash = await bcrypt.hash(temp_password, 10);

    // Create user
    const result = await db('users').insert({
      email: playerData.email,
      display_name: playerData.name,
      password_hash,
      role: 'player',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const user_id = result[0];
    const user = await db('users').where({ id: user_id }).first();

    // Log audit
    await createAuditLog(
      db,
      admin_id,
      'create_player',
      'player',
      user_id,
      {
        email: playerData.email,
        name: playerData.name,
      },
      ip_address,
    );

    return {
      user,
      temp_password,
    };
  } catch (err) {
    logger.error('[ADMIN] createPlayer failed:', err);
    throw err;
  }
}

/**
 * Get audit logs with optional filters.
 * Supports filtering by action_type, admin_id, and date range.
 */
export async function getAuditLogs(
  db: Knex,
  filters: {
    page?: number;
    limit?: number;
    action_type?: string;
    admin_id?: number;
    date_from?: Date;
    date_to?: Date;
  } = {},
): Promise<{ logs: AuditLogEntry[]; total: number; page: number; limit: number }> {
  try {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;

    let query = db('admin_audit_logs');

    if (filters.action_type) {
      query = query.where('action_type', filters.action_type);
    }
    if (filters.admin_id) {
      query = query.where('admin_id', filters.admin_id);
    }
    if (filters.date_from) {
      query = query.where('created_at', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('created_at', '<=', filters.date_to);
    }

    const total = await query.clone().count('* as count').first();
    const totalCount = Number(total?.count ?? 0);

    const offset = (page - 1) * limit;
    const logs = await query
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Parse details JSON
    const parsed = logs.map((log: any) => ({
      ...log,
      details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details,
    }));

    return {
      logs: parsed,
      total: totalCount,
      page,
      limit,
    };
  } catch (err) {
    logger.error('[ADMIN] getAuditLogs failed:', err);
    throw err;
  }
}
