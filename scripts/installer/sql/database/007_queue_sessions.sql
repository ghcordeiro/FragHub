-- Migration: Queue Sessions Table
-- Purpose: Store queue session state machine (WAITING_PLAYERS → PLAYERS_FOUND → MAP_VOTE → IN_PROGRESS → FINISHED)
-- Requirements: QUEUE-REQ-006, QUEUE-NFR-001

CREATE TABLE IF NOT EXISTS queue_sessions (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  state ENUM('WAITING_PLAYERS', 'PLAYERS_FOUND', 'MAP_VOTE', 'IN_PROGRESS', 'FINISHED')
    NOT NULL DEFAULT 'WAITING_PLAYERS' COMMENT 'Queue state machine',
  map_selected VARCHAR(50) NULL COMMENT 'Final map after veto, e.g. de_mirage',
  team_a_ids JSON NULL COMMENT 'Array of user IDs in Team A (5 players)',
  team_b_ids JSON NULL COMMENT 'Array of user IDs in Team B (5 players)',
  connect_string VARCHAR(255) NULL COMMENT 'Game server connect IP:port for IN_PROGRESS state',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_state (state),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Queue session state machine (Phase 5 matchmaking)';
