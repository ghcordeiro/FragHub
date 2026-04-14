/**
 * ADMIN-01: TypeScript types for admin operations
 * Type-safe interfaces for all admin panel features.
 */

/** All possible admin actions for audit logging */
export type AdminAction =
  | 'ban_player'
  | 'unban_player'
  | 'edit_player'
  | 'create_player'
  | 'change_role'
  | 'rcon_command'
  | 'server_start'
  | 'server_stop'
  | 'server_restart'
  | 'plugin_config_read'
  | 'plugin_config_write';

/** Admin user extending base User with role field */
export interface AdminUser {
  id: number;
  email: string;
  display_name: string;
  role: 'admin' | 'moderator' | 'support';
  created_at: Date;
  updated_at: Date;
}

/** Single audit log entry */
export interface AuditLogEntry {
  id: number;
  admin_id: number;
  action_type: AdminAction;
  target_type?: 'player' | 'server';
  target_id?: number;
  details: Record<string, any>;
  ip_address?: string;
  created_at: Date;
}

/** Player ban record */
export interface PlayerBan {
  id: number;
  player_id: number;
  banned_by_id: number;
  reason: string;
  duration_days?: number;
  banned_at: Date;
  unbanned_at?: Date;
  unbanned_by_id?: number;
}

/** Ban duration: number of days or permanent */
export type BanDuration = number | 'permanent';

/** Server configuration snapshot */
export interface ServerConfig {
  id: number;
  server_id: string;
  plugin_slug: string;
  content: string;
  last_edited_by: number;
  last_edited_at: Date;
}

/** RCON command validation result */
export interface RconCommand {
  command: string;
  sanitized: boolean;
  allowed: boolean;
  reason?: string;
}

/** Dashboard metrics response */
export interface DashboardMetrics {
  total_players: number;
  matches_today: number;
  servers_online: number;
  recent_logs: AuditLogEntry[];
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

/** Standard API response */
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}
