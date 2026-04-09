CREATE TABLE IF NOT EXISTS wp_player_skins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  steam_id BIGINT UNSIGNED NOT NULL,
  weapon_defindex INT NOT NULL,
  paint_kit INT NOT NULL,
  seed INT NOT NULL DEFAULT 0,
  wear FLOAT NOT NULL DEFAULT 0.0001,
  stattrak INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wp_player_skins_steam (steam_id),
  KEY idx_wp_player_skins_weapon (weapon_defindex)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
