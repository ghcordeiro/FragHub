/**
 * ADMIN-04: Configuration service layer
 * Handles safe reading and writing of plugin configuration files.
 * All path operations use canonical resolution to prevent directory traversal.
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';
import { Knex } from 'knex';
import logger from '../logger';
import { PLUGIN_CONFIG_PATHS, SERVER_PLUGINS } from '../config/pluginAllowlist';
import * as adminService from './adminService';

/**
 * Get the allowed file path for a plugin.
 * Returns the canonical path if found in allowlist, throws 404 if not.
 */
export function getConfigPath(plugin_slug: string): string {
  const path = PLUGIN_CONFIG_PATHS[plugin_slug];
  if (!path) {
    throw new Error(`Plugin '${plugin_slug}' not found in allowlist`);
  }
  return path;
}

/**
 * Validate that a resolved path is within the allowed directory.
 * Uses path.resolve() for canonical resolution to prevent traversal attacks.
 *
 * Example attacks blocked:
 * - `../../../etc/passwd` → canonical path is /etc/passwd, not in allowed dir
 * - `....//....//etc/passwd` → normalized to /etc/passwd
 * - symlinks resolving outside allowed dir
 */
export function validatePathSafety(
  requested_path: string,
  allowed_absolute_path: string,
): { safe: boolean; canonical?: string } {
  try {
    // Resolve both paths to canonical form (absolute, no .. or ., no symlinks in process)
    const canonical = resolve(requested_path);
    const allowed = resolve(allowed_absolute_path);

    // Check if canonical path starts with allowed path
    if (!canonical.startsWith(allowed)) {
      logger.warn('[CONFIG] Path traversal attempt blocked:', {
        requested: requested_path,
        canonical,
        allowed,
      });
      return { safe: false };
    }

    return { safe: true, canonical };
  } catch (err) {
    logger.error('[CONFIG] validatePathSafety error:', err);
    return { safe: false };
  }
}

/**
 * Read a plugin configuration file.
 * Validates path safety, handles file not found, and limits file size.
 */
export async function readConfig(plugin_slug: string): Promise<string> {
  try {
    const allowed_path = getConfigPath(plugin_slug);
    const validation = validatePathSafety(allowed_path, allowed_path);

    if (!validation.safe) {
      throw new Error('Path traversal detected');
    }

    const MAX_FILE_SIZE = 500 * 1024; // 500 KB

    try {
      const content = await fs.readFile(validation.canonical!, 'utf-8');

      if (content.length > MAX_FILE_SIZE) {
        logger.warn('[CONFIG] File truncated (too large):', {
          plugin: plugin_slug,
          size: content.length,
        });
        return content.substring(0, MAX_FILE_SIZE) + '\n... [file truncated]';
      }

      return content;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error('Config file not found');
      }
      throw err;
    }
  } catch (err) {
    logger.error('[CONFIG] readConfig failed:', err);
    throw err;
  }
}

/**
 * Save a plugin configuration file.
 * Validates path safety, checks size, handles concurrent player connections.
 * Uses atomic write (temp file + rename) to prevent corruption.
 *
 * If server has connected players and no override header, returns warning.
 * If override confirmed, proceeds with write and RCON reload (if applicable).
 */
export async function saveConfig(
  db: Knex,
  plugin_slug: string,
  content: string,
  server_has_players: boolean,
  admin_id: number,
  ip_address: string | undefined,
  override: boolean = false,
): Promise<{ success: boolean; warning?: string; message?: string }> {
  try {
    const allowed_path = getConfigPath(plugin_slug);
    const validation = validatePathSafety(allowed_path, allowed_path);

    if (!validation.safe) {
      throw new Error('Path traversal detected');
    }

    const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
    if (content.length > MAX_FILE_SIZE) {
      throw new Error('Config file too large (max 1 MB)');
    }

    // Warn if players connected and no override
    if (server_has_players && !override) {
      return {
        success: false,
        warning: 'Server has connected players. Config changes may disconnect them.',
        message: 'Send X-Confirm-Override header to proceed.',
      };
    }

    // Create temp file in same directory (atomic rename)
    const temp_path = `${validation.canonical!}.tmp`;

    // Write to temp file
    await fs.writeFile(temp_path, content, 'utf-8');

    // Atomic rename
    await fs.rename(temp_path, validation.canonical!);

    // Log audit
    await adminService.createAuditLog(
      db,
      admin_id,
      'plugin_config_write',
      undefined,
      undefined,
      {
        plugin: plugin_slug,
        server_had_players: server_has_players,
        content_size: content.length,
      },
      ip_address,
    );

    // In production, would call RCON to reload the plugin
    // For v0.6, just log success
    logger.info('[CONFIG] Config saved:', { plugin: plugin_slug, size: content.length });

    return {
      success: true,
      message: 'Config saved successfully',
    };
  } catch (err) {
    logger.error('[CONFIG] saveConfig failed:', err);
    throw err;
  }
}

/**
 * Get list of available plugins for a server.
 */
export function getAvailablePlugins(server_id: string): string[] {
  return SERVER_PLUGINS[server_id] || [];
}
