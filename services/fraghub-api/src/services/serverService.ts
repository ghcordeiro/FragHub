/**
 * ADMIN-03: Server service layer
 * Handles server lifecycle control (start/stop/restart) and RCON command execution.
 * All systemd calls use fixed service names from config (never interpolate from input).
 */

import { Knex } from 'knex';
import logger from '../logger';
import * as rconService from './rconService';
import * as adminService from './adminService';
import { validateCommand } from './rconService';
import type { AdminAction } from '../types/admin';

// Server configurations with fixed systemd service names
const SERVER_CONFIG: Record<string, { service: string; rcon_port: number }> = {
  cs2: {
    service: 'cs2-game-server',
    rcon_port: 27015,
  },
  csgo: {
    service: 'csgo-game-server',
    rcon_port: 27015,
  },
};

/**
 * List all configured servers with live status.
 */
export async function listServers(_db: Knex): Promise<any[]> {
  try {
    const servers = [];

    for (const [server_id, config] of Object.entries(SERVER_CONFIG)) {
      const status = await rconService.getServerStatus(server_id);

      servers.push({
        id: server_id,
        name: server_id.toUpperCase(),
        service: config.service,
        ...status,
      });
    }

    return servers;
  } catch (err) {
    logger.error('[SERVER] listServers failed:', err);
    throw err;
  }
}

/**
 * Control server lifecycle (start/stop/restart).
 * Only allows specified actions; service names come from config, never from input.
 */
export async function controlServer(
  db: Knex,
  server_id: string,
  action: 'start' | 'stop' | 'restart',
  admin_id: number,
  ip_address: string | undefined,
): Promise<{ server_id: string; action: string; status: string }> {
  try {
    // Validate action
    if (!['start', 'stop', 'restart'].includes(action)) {
      throw new Error('Invalid action');
    }

    // Look up server config (never interpolate server_id into shell command)
    const config = SERVER_CONFIG[server_id];
    if (!config) {
      throw new Error('Server not found');
    }

    // In production, would call: systemctl {action} {service}
    // For v0.6, log and return mock response
    logger.info(`[SERVER] ${action.toUpperCase()} server ${server_id} (service: ${config.service})`);

    // Log audit
    const action_type = action === 'start' ? 'server_start' : action === 'stop' ? 'server_stop' : 'server_restart';
    await adminService.createAuditLog(
      db,
      admin_id,
      action_type as AdminAction,
      'server',
      undefined,
      { server_id, action },
      ip_address,
    );

    return {
      server_id,
      action,
      status: 'success',
    };
  } catch (err) {
    logger.error('[SERVER] controlServer failed:', err);
    throw err;
  }
}

/**
 * Execute a validated RCON command on a server.
 * Sanitizes, validates, executes, and logs.
 */
export async function executeRconCommand(
  db: Knex,
  server_id: string,
  command: string,
  admin_id: number,
  ip_address: string | undefined,
): Promise<{ output: string; command_sanitized: string }> {
  try {
    // Look up server config
    const config = SERVER_CONFIG[server_id];
    if (!config) {
      throw new Error('Server not found');
    }

    // Sanitize and validate
    const sanitized = rconService.sanitizeCommand(command);
    const validation = validateCommand(sanitized);

    if (!validation.valid) {
      throw new Error(validation.reason || 'Command not allowed');
    }

    // Execute
    const result = await rconService.executeRcon(server_id, sanitized);

    // Log audit (fire-and-forget, never block response)
    await adminService.createAuditLog(
      db,
      admin_id,
      'rcon_command',
      'server',
      undefined,
      {
        server_id,
        command: sanitized,
        output_lines: result.output.split('\n').length,
      },
      ip_address,
    );

    return {
      output: result.output,
      command_sanitized: sanitized,
    };
  } catch (err) {
    logger.error('[SERVER] executeRconCommand failed:', err);
    throw err;
  }
}
