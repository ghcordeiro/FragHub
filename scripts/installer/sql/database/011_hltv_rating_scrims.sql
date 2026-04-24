-- Migration 011: HLTV Rating fields, match_format for queue, scrim system
-- Requirements: RATING-REQ-001, SCRIM-REQ-001, QUEUE-REQ-009

-- 1. Add HLTV Rating fields to stats (per-match)
ALTER TABLE stats
  ADD COLUMN headshots  INT NOT NULL DEFAULT 0 AFTER assists,
  ADD COLUMN mvps       INT NOT NULL DEFAULT 0 AFTER headshots,
  ADD COLUMN adr        SMALLINT UNSIGNED NULL DEFAULT NULL COMMENT 'Average Damage per Round from MatchZy',
  ADD COLUMN kast_pct   TINYINT UNSIGNED NULL DEFAULT NULL COMMENT 'KAST percentage (0-100)',
  ADD COLUMN rating_hltv DECIMAL(4,2) NULL DEFAULT NULL COMMENT 'HLTV Rating 2.0 per match',
  ADD COLUMN steam_id   VARCHAR(20) NULL DEFAULT NULL COMMENT 'Steam ID for unregistered players',
  ADD COLUMN team       ENUM('team1','team2') NULL DEFAULT NULL;

-- 2. Add aggregate HLTV Rating to users
ALTER TABLE users
  ADD COLUMN hltv_rating         DECIMAL(4,2) NOT NULL DEFAULT 0.00 AFTER elo_rating,
  ADD COLUMN hltv_matches_counted INT NOT NULL DEFAULT 0 AFTER hltv_rating;

-- 3. Add match_format to queue_sessions
ALTER TABLE queue_sessions
  ADD COLUMN match_format ENUM('md1','md3') NOT NULL DEFAULT 'md1' AFTER connect_string;

-- 4. Scrim teams table
CREATE TABLE IF NOT EXISTS scrim_teams (
  id         CHAR(36) PRIMARY KEY COMMENT 'UUID',
  name       VARCHAR(60) NOT NULL,
  captain_id BIGINT UNSIGNED NOT NULL,
  player_ids JSON NOT NULL DEFAULT '[]' COMMENT 'Array of user IDs (max 5)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_scrim_team_captain FOREIGN KEY (captain_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Scrims table
CREATE TABLE IF NOT EXISTS scrims (
  id              CHAR(36) PRIMARY KEY COMMENT 'UUID',
  team_a_id       CHAR(36) NULL,
  team_b_id       CHAR(36) NULL,
  state           ENUM('FORMING','CHALLENGED','MAP_VOTE','IN_PROGRESS','FINISHED') NOT NULL DEFAULT 'FORMING',
  format          ENUM('md1','md3') NOT NULL DEFAULT 'md1',
  map_selected    VARCHAR(50) NULL,
  connect_string  VARCHAR(255) NULL,
  gotv_string     VARCHAR(255) NULL,
  invite_code_a   CHAR(8) NOT NULL COMMENT 'Team A members join with this code',
  invite_code_b   CHAR(8) NULL COMMENT 'Generated when team B is formed',
  challenge_code  CHAR(8) NULL COMMENT 'Code team A uses to challenge team B',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_scrim_team_a FOREIGN KEY (team_a_id) REFERENCES scrim_teams (id) ON DELETE SET NULL,
  CONSTRAINT fk_scrim_team_b FOREIGN KEY (team_b_id) REFERENCES scrim_teams (id) ON DELETE SET NULL,
  INDEX idx_scrim_state (state),
  INDEX idx_scrim_invite_a (invite_code_a),
  INDEX idx_scrim_invite_b (invite_code_b)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='5v5 organized scrims (clã vs clã)';
