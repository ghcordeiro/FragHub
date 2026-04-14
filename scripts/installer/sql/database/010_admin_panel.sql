-- ADMIN-01: Admin panel schema (v0.6)
-- Admin audit logs, player bans, server configs tables

-- admin_audit_logs: immutable audit trail
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id BIGINT UNSIGNED NOT NULL,
  action_type VARCHAR(50) NOT NULL COMMENT 'ban_player, unban_player, edit_player, create_player, change_role, rcon_command, server_start, server_stop, server_restart, plugin_config_read, plugin_config_write',
  target_type VARCHAR(50) NULL COMMENT 'player or server',
  target_id BIGINT UNSIGNED NULL,
  details JSON NOT NULL COMMENT 'action-specific details (reason, duration, command, etc.)',
  ip_address VARCHAR(45) NULL COMMENT 'IPv4 or IPv6 address',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_id (admin_id),
  KEY idx_action_type (action_type),
  KEY idx_created_at (created_at),
  KEY idx_target_type_id (target_type, target_id),
  CONSTRAINT fk_admin_id FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable audit log of all admin actions for compliance and forensics';

-- player_bans: track all player bans with duration and who unbanned
CREATE TABLE IF NOT EXISTS player_bans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  player_id BIGINT UNSIGNED NOT NULL,
  banned_by_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(500) NOT NULL,
  duration_days INT UNSIGNED NULL COMMENT 'NULL = permanent ban',
  banned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unbanned_at DATETIME NULL,
  unbanned_by_id BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_player_id (player_id),
  KEY idx_banned_at (banned_at),
  KEY idx_unbanned_at (unbanned_at),
  CONSTRAINT fk_player_ban_player FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_player_ban_admin FOREIGN KEY (banned_by_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Player ban history with duration tracking';

-- server_configs: store plugin configuration snapshots
CREATE TABLE IF NOT EXISTS server_configs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  server_id VARCHAR(50) NOT NULL COMMENT 'cs2, csgo, etc.',
  plugin_slug VARCHAR(50) NOT NULL COMMENT 'matchzy, get5, cs2-simpleadmin, sourcebans',
  content LONGTEXT NOT NULL COMMENT 'Config file content',
  last_edited_by BIGINT UNSIGNED NOT NULL,
  last_edited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_server_plugin (server_id, plugin_slug),
  KEY idx_last_edited_at (last_edited_at),
  CONSTRAINT fk_server_config_admin FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Plugin configuration snapshots with edit tracking';
