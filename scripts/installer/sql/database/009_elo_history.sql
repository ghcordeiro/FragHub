-- Migration: ELO History Table
-- Purpose: Persist ELO changes per player per match for auditability and ranking history
-- Requirements: ELO-REQ-005, ELO-REQ-006, ELO-NFR-001

CREATE TABLE IF NOT EXISTS elo_history (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  user_id CHAR(36) NOT NULL COMMENT 'FK to users',
  match_id CHAR(36) NOT NULL COMMENT 'FK to matches',
  elo_before INT NOT NULL COMMENT 'Rating before match (0-3000+)',
  elo_after INT NOT NULL COMMENT 'Rating after match (0-3000+)',
  change INT NOT NULL COMMENT 'Signed delta: elo_after - elo_before',
  result ENUM('win', 'loss') NOT NULL COMMENT 'Match outcome for this player',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,

  INDEX idx_user_match (user_id, match_id) COMMENT 'Idempotency check for ELO updates',
  INDEX idx_user_timestamp (user_id, timestamp DESC) COMMENT 'For ELO-REQ-005 recent history query'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ELO rating changes per player per match (Phase 5 matchmaking)';
