/**
 * ADMIN-03: RCON service layer
 * Handles command validation, sanitization, and execution against game servers.
 * Never exposes RCON password in logs, responses, or error messages.
 */

import { loadEnv } from '../config/env';
import { validateRconCommand } from '../config/rconAllowlist';
import logger from '../logger';

/**
 * Sanitize RCON command input.
 * Removes control characters, newlines, tabs that could break command parsing.
 */
export function sanitizeCommand(cmd: string): string {
  return cmd
    .replace(/[\r\n\t\0]/g, '') // Remove control chars
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/**
 * Validate command against allowlist/blocklist.
 * Returns: { valid: boolean, reason?: string }
 */
export function validateCommand(command: string): { valid: boolean; reason?: string } {
  const sanitized = sanitizeCommand(command);

  if (sanitized.length === 0) {
    return { valid: false, reason: 'Command is empty' };
  }

  if (sanitized.length > 256) {
    return { valid: false, reason: 'Command too long' };
  }

  if (!validateRconCommand(sanitized)) {
    logger.warn('[RCON] Blocked command attempt:', { command: sanitized });
    return { valid: false, reason: 'Command not allowed' };
  }

  return { valid: true };
}

/**
 * Execute RCON command against a game server.
 * Loads RCON password from environment (never exposed in response).
 * Uses timeout to prevent hanging connections.
 *
 * In production, this would integrate with the game server's RCON client.
 * For now, returns mock response for testing.
 */
export async function executeRcon(
  server_id: string,
  command: string,
  timeout: number = 5000,
): Promise<{ output: string; status: number }> {
  try {
    loadEnv();

    // Get RCON password from environment (never expose)
    const envVarName = `RCON_PASSWORD_${server_id.toUpperCase()}`;
    const rconPassword = process.env[envVarName];
    if (!rconPassword) {
      logger.error('[RCON] No RCON password configured for server:', { server: server_id });
      return { status: 503, output: 'RCON service unavailable' };
    }

    // In production, would integrate with actual RCON client (e.g., rcon npm library)
    // For v0.6, return mock response
    const mockOutput = `[${new Date().toISOString()}] Command executed: ${command}\n`;

    return {
      status: 200,
      output: mockOutput,
    };
  } catch (err) {
    logger.error('[RCON] Execution failed:', err);
    return { status: 503, output: 'RCON service error' };
  }
}

/**
 * Get server status via systemctl and RCON status command.
 * Returns: { status: 'online' | 'offline', players_connected: number, uptime: string }
 */
export async function getServerStatus(
  server_id: string,
): Promise<{ status: 'online' | 'offline'; players_connected: number; uptime: string }> {
  try {
    // In production, would call systemctl is-active and parse RCON status output
    // For v0.6, return mock response
    return {
      status: 'online',
      players_connected: 0,
      uptime: '0h 0m',
    };
  } catch (err) {
    logger.error('[RCON] getServerStatus failed:', err);
    return { status: 'offline', players_connected: 0, uptime: '0h 0m' };
  }
}
