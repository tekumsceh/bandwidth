import { pool } from '../db';

export async function ensureV2Schema() {
  await pool.query(
    `ALTER TABLE users
      ADD COLUMN IF NOT EXISTS default_currency CHAR(3) NOT NULL DEFAULT 'EUR',
      ADD COLUMN IF NOT EXISTS local_currency CHAR(3) NOT NULL DEFAULT 'EUR',
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS email_verified_at DATETIME DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS auth_provider ENUM('google','password','hybrid') NOT NULL DEFAULT 'password'`,
  );

  await pool.query(
    `UPDATE users
     SET auth_provider =
       CASE
         WHEN google_id IS NOT NULL AND password_hash IS NOT NULL THEN 'hybrid'
         WHEN google_id IS NOT NULL THEN 'google'
         ELSE 'password'
       END`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS user_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      session_id VARCHAR(128) NOT NULL,
      user_id INT(10) UNSIGNED NOT NULL,
      ip_address VARCHAR(64) DEFAULT NULL,
      user_agent VARCHAR(255) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_user_sessions_sid (session_id),
      KEY idx_user_sessions_user (user_id),
      KEY idx_user_sessions_expiry (expires_at),
      CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT(10) UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME DEFAULT NULL,
      request_ip VARCHAR(64) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      PRIMARY KEY (id),
      UNIQUE KEY uq_password_reset_token_hash (token_hash),
      KEY idx_password_reset_user (user_id),
      KEY idx_password_reset_expires (expires_at),
      CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT(10) UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      PRIMARY KEY (id),
      UNIQUE KEY uq_email_verify_token_hash (token_hash),
      KEY idx_email_verify_user (user_id),
      KEY idx_email_verify_expires (expires_at),
      CONSTRAINT fk_email_verify_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS admin_access (
      user_id INT(10) UNSIGNED NOT NULL,
      can_access_admin TINYINT(1) NOT NULL DEFAULT 1,
      access_level ENUM('super_admin','config_admin','viewer') NOT NULL DEFAULT 'config_admin',
      granted_by_user_id INT(10) UNSIGNED DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
      PRIMARY KEY (user_id),
      KEY fk_admin_access_granted_by (granted_by_user_id),
      CONSTRAINT fk_admin_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_admin_access_granted_by FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS page_listing_config (
      page_key VARCHAR(64) NOT NULL,
      default_view VARCHAR(32) NOT NULL DEFAULT 'schedule',
      default_timeline VARCHAR(32) NOT NULL DEFAULT 'upcoming',
      default_ledger_mode VARCHAR(32) NOT NULL DEFAULT 'unpaid',
      archive_enabled TINYINT(1) NOT NULL DEFAULT 1,
      updated_by_user_id INT(10) UNSIGNED DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
      PRIMARY KEY (page_key),
      KEY fk_page_listing_updated_by (updated_by_user_id),
      CONSTRAINT fk_page_listing_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS page_filter_config (
      id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      page_key VARCHAR(64) NOT NULL,
      filter_key VARCHAR(64) NOT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      default_value VARCHAR(255) DEFAULT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      options_json TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
      PRIMARY KEY (id),
      UNIQUE KEY uq_page_filter (page_key, filter_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS config_audit_log (
      id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      entity VARCHAR(64) NOT NULL,
      entity_id VARCHAR(128) NOT NULL,
      action VARCHAR(32) NOT NULL,
      changed_by_user_id INT(10) UNSIGNED DEFAULT NULL,
      diff_json TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      PRIMARY KEY (id),
      KEY fk_config_audit_user (changed_by_user_id),
      CONSTRAINT fk_config_audit_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS intervention_requests (
      id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      date_id INT(10) UNSIGNED NOT NULL,
      band_id INT(10) UNSIGNED NOT NULL,
      requested_by_user_id INT(10) UNSIGNED NOT NULL,
      reason TEXT NOT NULL,
      scope_json TEXT DEFAULT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      reviewed_by_user_id INT(10) UNSIGNED DEFAULT NULL,
      reviewed_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
      PRIMARY KEY (id),
      KEY fk_intervention_date (date_id),
      KEY fk_intervention_band (band_id),
      KEY fk_intervention_requested_by (requested_by_user_id),
      KEY fk_intervention_reviewed_by (reviewed_by_user_id),
      CONSTRAINT fk_intervention_date FOREIGN KEY (date_id) REFERENCES dates(id) ON DELETE CASCADE,
      CONSTRAINT fk_intervention_band FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
      CONSTRAINT fk_intervention_requested_by FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_intervention_reviewed_by FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS finance_audit_log (
      id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
      date_id INT(10) UNSIGNED NOT NULL,
      band_id INT(10) UNSIGNED NOT NULL,
      payment_id INT(10) UNSIGNED DEFAULT NULL,
      action VARCHAR(64) NOT NULL,
      performed_by_user_id INT(10) UNSIGNED NOT NULL,
      details_json TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      PRIMARY KEY (id),
      KEY fk_finance_audit_date (date_id),
      KEY fk_finance_audit_band (band_id),
      KEY fk_finance_audit_payment (payment_id),
      KEY fk_finance_audit_user (performed_by_user_id),
      CONSTRAINT fk_finance_audit_date FOREIGN KEY (date_id) REFERENCES dates(id) ON DELETE CASCADE,
      CONSTRAINT fk_finance_audit_band FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
      CONSTRAINT fk_finance_audit_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
      CONSTRAINT fk_finance_audit_user FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS asset_profiles (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      module_key ENUM('gear','setlist','patch') NOT NULL,
      scope ENUM('personal','band') NOT NULL,
      owner_user_id INT(10) UNSIGNED DEFAULT NULL,
      band_id INT(10) UNSIGNED DEFAULT NULL,
      name VARCHAR(160) NOT NULL,
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
      PRIMARY KEY (id),
      KEY idx_asset_profiles_module_scope (module_key, scope),
      KEY idx_asset_profiles_band (band_id),
      KEY idx_asset_profiles_owner (owner_user_id),
      CONSTRAINT fk_asset_profiles_band FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
      CONSTRAINT fk_asset_profiles_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS asset_profile_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      profile_id BIGINT UNSIGNED NOT NULL,
      item_key VARCHAR(120) NOT NULL,
      label VARCHAR(255) NOT NULL,
      category VARCHAR(120) DEFAULT NULL,
      qty DECIMAL(10,2) NOT NULL DEFAULT 1,
      notes TEXT DEFAULT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
      PRIMARY KEY (id),
      KEY idx_asset_profile_items_profile (profile_id),
      KEY idx_asset_profile_items_item (item_key),
      CONSTRAINT fk_asset_profile_items_profile FOREIGN KEY (profile_id) REFERENCES asset_profiles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS asset_profile_links (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      module_key ENUM('gear','setlist','patch') NOT NULL,
      band_id INT(10) UNSIGNED NOT NULL,
      user_id INT(10) UNSIGNED NOT NULL,
      profile_id BIGINT UNSIGNED NOT NULL,
      is_default_for_band TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
      PRIMARY KEY (id),
      UNIQUE KEY uq_asset_profile_links_unique (module_key, band_id, user_id, profile_id),
      KEY idx_asset_profile_links_band (band_id),
      KEY idx_asset_profile_links_user (user_id),
      CONSTRAINT fk_asset_profile_links_band FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
      CONSTRAINT fk_asset_profile_links_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_asset_profile_links_profile FOREIGN KEY (profile_id) REFERENCES asset_profiles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS date_asset_snapshots (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      date_id INT(10) UNSIGNED NOT NULL,
      band_id INT(10) UNSIGNED NOT NULL,
      module_key ENUM('gear','setlist','patch') NOT NULL,
      source_profile_id BIGINT UNSIGNED NOT NULL,
      item_key VARCHAR(120) NOT NULL,
      label VARCHAR(255) NOT NULL,
      category VARCHAR(120) DEFAULT NULL,
      qty DECIMAL(10,2) NOT NULL DEFAULT 1,
      notes TEXT DEFAULT NULL,
      created_by_user_id INT(10) UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      PRIMARY KEY (id),
      KEY idx_date_asset_snapshots_date_module (date_id, module_key),
      CONSTRAINT fk_date_asset_snapshots_date FOREIGN KEY (date_id) REFERENCES dates(id) ON DELETE CASCADE,
      CONSTRAINT fk_date_asset_snapshots_band FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
      CONSTRAINT fk_date_asset_snapshots_profile FOREIGN KEY (source_profile_id) REFERENCES asset_profiles(id) ON DELETE CASCADE,
      CONSTRAINT fk_date_asset_snapshots_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `INSERT IGNORE INTO page_listing_config (page_key, default_view, default_timeline, default_ledger_mode, archive_enabled)
     VALUES
       ('events', 'schedule', 'upcoming', 'unpaid', 1),
       ('band', 'overview', 'upcoming', 'unpaid', 1),
       ('event', 'overview', 'upcoming', 'unpaid', 0)`,
  );

  await pool.query(
    `INSERT IGNORE INTO page_filter_config (page_key, filter_key, enabled, default_value, sort_order, options_json)
     VALUES
       ('events', 'timeline', 1, 'upcoming', 1, '["upcoming","past","all"]'),
       ('events', 'band', 1, 'all', 2, '[]'),
       ('events', 'ledgerMode', 1, 'unpaid', 3, '["unpaid","all"]')`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS io_patch_saves (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      band_id INT(10) UNSIGNED NOT NULL,
      created_by_user_id INT(10) UNSIGNED NOT NULL,
      name VARCHAR(160) NOT NULL,
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      data_json LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
      PRIMARY KEY (id),
      KEY idx_io_patch_saves_band (band_id),
      KEY idx_io_patch_saves_default (band_id, is_default),
      CONSTRAINT fk_io_patch_saves_band FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
      CONSTRAINT fk_io_patch_saves_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS date_io_patch_bindings (
      date_id INT(10) UNSIGNED NOT NULL,
      band_id INT(10) UNSIGNED NOT NULL,
      io_patch_save_id BIGINT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
      PRIMARY KEY (date_id),
      KEY idx_date_io_patch_bindings_band (band_id),
      CONSTRAINT fk_date_io_patch_bindings_date FOREIGN KEY (date_id) REFERENCES dates(id) ON DELETE CASCADE,
      CONSTRAINT fk_date_io_patch_bindings_band FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
      CONSTRAINT fk_date_io_patch_bindings_save FOREIGN KEY (io_patch_save_id) REFERENCES io_patch_saves(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS band_songs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      band_id INT(10) UNSIGNED NOT NULL,
      title VARCHAR(255) NOT NULL,
      artist VARCHAR(255) DEFAULT NULL,
      lyrics LONGTEXT,
      lyrics_photo_key VARCHAR(512) DEFAULT NULL,
      created_by_user_id INT(10) UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
      PRIMARY KEY (id),
      KEY idx_band_songs_band (band_id),
      KEY idx_band_songs_title (band_id, title),
      CONSTRAINT fk_band_songs_band FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE,
      CONSTRAINT fk_band_songs_user FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  );

  try {
    await pool.query(`ALTER TABLE band_songs ADD COLUMN lyrics_photo_key VARCHAR(512) DEFAULT NULL`);
  } catch (err: unknown) {
    const e = err as { errno?: number; code?: string };
    if (e.errno !== 1060 && e.code !== 'ER_DUP_FIELDNAME') {
      throw err;
    }
  }
}

