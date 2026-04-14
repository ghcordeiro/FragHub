-- MATCHAPI-REQ-001/002 + NFR-003 — extensão matches/stats para webhook e leitura pública
ALTER TABLE matches
  ADD COLUMN external_match_id VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN team1_score TINYINT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN team2_score TINYINT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN winner ENUM('team1', 'team2', 'draw') NULL DEFAULT NULL,
  ADD COLUMN duration_seconds INT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN server_ip VARCHAR(45) NULL DEFAULT NULL,
  ADD COLUMN webhook_source ENUM('matchzy', 'get5') NULL DEFAULT NULL,
  ADD COLUMN raw_payload JSON NULL DEFAULT NULL,
  ADD COLUMN played_at DATETIME NULL DEFAULT NULL;

ALTER TABLE matches
  MODIFY COLUMN game ENUM('cs2', 'csgo') NOT NULL DEFAULT 'cs2';

ALTER TABLE matches
  ADD UNIQUE KEY uq_matches_webhook_external (webhook_source, external_match_id);

ALTER TABLE stats
  ADD COLUMN steam_id VARCHAR(20) NULL DEFAULT NULL,
  ADD COLUMN team ENUM('team1', 'team2') NULL DEFAULT NULL,
  ADD COLUMN headshots INT NOT NULL DEFAULT 0,
  ADD COLUMN mvps INT NOT NULL DEFAULT 0,
  ADD COLUMN ping_avg SMALLINT UNSIGNED NULL DEFAULT NULL;

ALTER TABLE stats DROP FOREIGN KEY fk_stats_user;

ALTER TABLE stats MODIFY COLUMN user_id BIGINT UNSIGNED NULL DEFAULT NULL;

ALTER TABLE stats
  ADD CONSTRAINT fk_stats_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX idx_stats_match_steam ON stats (match_id, steam_id);
