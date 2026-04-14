-- Migration: Queue Players Table
-- Purpose: Track players in queue sessions with team assignments
-- Requirements: QUEUE-REQ-001, QUEUE-REQ-011

CREATE TABLE IF NOT EXISTS queue_players (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  queue_session_id CHAR(36) NOT NULL COMMENT 'FK to queue_sessions',
  user_id CHAR(36) NOT NULL COMMENT 'FK to users',
  team_assignment ENUM('TEAM_A', 'TEAM_B') NULL COMMENT 'Assigned after 10 players join, set by balanceTeams',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'For timeout detection',

  PRIMARY KEY (id),
  UNIQUE KEY unique_user_per_session (queue_session_id, user_id) COMMENT 'Prevents duplicate queue joins (QUEUE-REQ-011)',
  FOREIGN KEY (queue_session_id) REFERENCES queue_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_queue_session (queue_session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_joined_at (joined_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Players in queue sessions (Phase 5 matchmaking)';
