import { pool } from '../db';

export async function ensureV2Schema() {
  await pool.query(
    `ALTER TABLE users
      ADD COLUMN IF NOT EXISTS default_currency CHAR(3) NOT NULL DEFAULT 'EUR',
      ADD COLUMN IF NOT EXISTS local_currency CHAR(3) NOT NULL DEFAULT 'EUR'`,
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
}

