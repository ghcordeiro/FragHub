-- AUTHAPI-REQ-001 / AUTHAPI-REQ-013: google_id + refresh_tokens
ALTER TABLE users
  ADD COLUMN google_id VARCHAR(255) NULL DEFAULT NULL AFTER display_name,
  ADD UNIQUE KEY uq_users_google_id (google_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  device_id VARCHAR(255) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_refresh_tokens_user_id (user_id),
  KEY idx_refresh_tokens_token_hash (token_hash),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
