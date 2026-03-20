-- =============================================================================
-- ONE-TIME: Move saved I/O patch presets from band "Fet Red" → "Marko Louis"
-- Table: io_patch_saves (see schemaService.ts)
-- =============================================================================
-- Run in MySQL / MariaDB / phpMyAdmin against your app database.
-- 1) Run the SELECT blocks first and confirm band names + row counts.
-- 2) If your band names differ slightly, edit the WHERE clauses or set @from_id / @to_id manually.
-- =============================================================================

-- --- Find candidate bands (adjust LIKE patterns if needed) -------------------
SELECT id, name, is_solo
FROM bands
WHERE LOWER(TRIM(name)) IN ('fet red', 'marko louis')
   OR LOWER(name) LIKE '%fet%red%'
   OR LOWER(name) LIKE '%marko%louis%'
ORDER BY name;

-- --- Resolve IDs (prefer exact names; change literals if your DB uses different spelling)
-- Works in phpMyAdmin / mysql CLI:
SET @from_id = (SELECT id FROM bands WHERE LOWER(TRIM(name)) = 'fet red' LIMIT 1);
SET @to_id   = (SELECT id FROM bands WHERE LOWER(TRIM(name)) = 'marko louis' LIMIT 1);

SELECT @from_id AS source_band_id_fet_red, @to_id AS target_band_id_marko_louis;

-- --- Preview patches that will move ------------------------------------------
SELECT id, band_id, name, is_default, created_at, CHAR_LENGTH(data_json) AS data_len
FROM io_patch_saves
WHERE band_id = @from_id;

-- --- Apply: reassign band; clear is_default on moved rows so you don’t get two
--     “defaults” under Marko Louis (set a default again in the I/O patch UI if needed)
UPDATE io_patch_saves
SET band_id = @to_id,
    is_default = 0
WHERE band_id = @from_id;

-- --- Verify ------------------------------------------------------------------
SELECT ROW_COUNT() AS rows_updated;

SELECT id, band_id, name, is_default
FROM io_patch_saves
WHERE band_id IN (@from_id, @to_id)
ORDER BY band_id, id;

-- If @from_id or @to_id is NULL, the names didn’t match — set manually:
-- SET @from_id = 123;   -- Fet Red
-- SET @to_id   = 456;   -- Marko Louis
-- Then run the UPDATE again.
