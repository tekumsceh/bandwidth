import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAppConfigAccess } from '../middleware/authz';
import { getAppAccessLevel } from '../services/authzService';

const router = Router();

router.use(requireAppConfigAccess);

router.get('/can-access', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const level = await getAppAccessLevel(user);
  res.json({ canAccess: Boolean(level), accessLevel: level });
});

router.get('/pages', async (_req: Request, res: Response) => {
  const [listingRows] = await pool.query(`SELECT * FROM page_listing_config ORDER BY page_key`);
  const [filterRows] = await pool.query(
    `SELECT * FROM page_filter_config ORDER BY page_key ASC, sort_order ASC, id ASC`,
  );
  res.json({ listings: listingRows, filters: filterRows });
});

router.get('/pages/:pageKey', async (req: Request, res: Response) => {
  const pageKey = String(req.params.pageKey || '');
  const [listingRows] = await pool.query(`SELECT * FROM page_listing_config WHERE page_key = ?`, [pageKey]);
  const [filterRows] = await pool.query(
    `SELECT * FROM page_filter_config WHERE page_key = ? ORDER BY sort_order ASC, id ASC`,
    [pageKey],
  );
  res.json({
    listing: (listingRows as any[])[0] || null,
    filters: filterRows,
  });
});

router.put('/pages/:pageKey/listing', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const pageKey = String(req.params.pageKey || '');
  const {
    default_view = 'schedule',
    default_timeline = 'upcoming',
    default_ledger_mode = 'unpaid',
    archive_enabled = 1,
  } = req.body || {};

  await pool.query(
    `INSERT INTO page_listing_config
      (page_key, default_view, default_timeline, default_ledger_mode, archive_enabled, updated_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       default_view = VALUES(default_view),
       default_timeline = VALUES(default_timeline),
       default_ledger_mode = VALUES(default_ledger_mode),
       archive_enabled = VALUES(archive_enabled),
       updated_by_user_id = VALUES(updated_by_user_id),
       updated_at = NOW()`,
    [pageKey, default_view, default_timeline, default_ledger_mode, archive_enabled ? 1 : 0, user.id],
  );

  await pool.query(
    `INSERT INTO config_audit_log (entity, entity_id, action, changed_by_user_id, diff_json, created_at)
     VALUES ('page_listing_config', ?, 'upsert', ?, ?, NOW())`,
    [pageKey, user.id, JSON.stringify(req.body || {})],
  );

  const [rows] = await pool.query(`SELECT * FROM page_listing_config WHERE page_key = ?`, [pageKey]);
  res.json((rows as any[])[0]);
});

router.put('/pages/:pageKey/filters', async (req: Request, res: Response) => {
  const user = (req as any).user;
  const pageKey = String(req.params.pageKey || '');
  const filters = Array.isArray(req.body?.filters) ? req.body.filters : [];

  for (const f of filters) {
    await pool.query(
      `INSERT INTO page_filter_config
        (page_key, filter_key, enabled, default_value, sort_order, options_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         enabled = VALUES(enabled),
         default_value = VALUES(default_value),
         sort_order = VALUES(sort_order),
         options_json = VALUES(options_json),
         updated_at = NOW()`,
      [
        pageKey,
        String(f.filter_key || ''),
        f.enabled ? 1 : 0,
        f.default_value ?? null,
        Number(f.sort_order || 0),
        f.options_json ? JSON.stringify(f.options_json) : null,
      ],
    );
  }

  await pool.query(
    `INSERT INTO config_audit_log (entity, entity_id, action, changed_by_user_id, diff_json, created_at)
     VALUES ('page_filter_config', ?, 'bulk_upsert', ?, ?, NOW())`,
    [pageKey, user.id, JSON.stringify(filters)],
  );

  const [rows] = await pool.query(
    `SELECT * FROM page_filter_config WHERE page_key = ? ORDER BY sort_order ASC, id ASC`,
    [pageKey],
  );
  res.json({ filters: rows });
});

router.put('/access/users/:userId', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== 'GOD') {
    return res.status(403).json({ error: 'Only GOD can grant app admin access' });
  }
  const targetUserId = Number(req.params.userId);
  if (!Number.isFinite(targetUserId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
  const { can_access_admin = false, access_level = 'config_admin' } = req.body || {};
  await pool.query(
    `INSERT INTO admin_access
      (user_id, can_access_admin, access_level, granted_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       can_access_admin = VALUES(can_access_admin),
       access_level = VALUES(access_level),
       granted_by_user_id = VALUES(granted_by_user_id),
       updated_at = NOW()`,
    [targetUserId, can_access_admin ? 1 : 0, String(access_level), user.id],
  );

  await pool.query(
    `INSERT INTO config_audit_log (entity, entity_id, action, changed_by_user_id, diff_json, created_at)
     VALUES ('admin_access', ?, 'grant_update', ?, ?, NOW())`,
    [String(targetUserId), user.id, JSON.stringify(req.body || {})],
  );

  const [rows] = await pool.query(`SELECT * FROM admin_access WHERE user_id = ?`, [targetUserId]);
  return res.json((rows as any[])[0] || null);
});

export default router;

