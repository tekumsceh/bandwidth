import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { canManageBandPlanning, canViewBandDomain } from '../services/authzService';
import { canEditAssetScope, mergeGearItems, resolveDefaultProfileId } from '../services/assetsService';

const router = Router();

async function requireUser(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return user as { id: number };
}

async function requireBandRead(req: Request, res: Response, bandId: number, userId: number) {
  const allowed = await canViewBandDomain(bandId, userId);
  if (!allowed) {
    res.status(403).json({ error: 'Not allowed for this band' });
    return false;
  }
  return true;
}

async function canManageBand(bandId: number, userId: number) {
  return canManageBandPlanning(bandId, userId);
}

async function resolveProfile(profileId: number) {
  const [rows] = await pool.query(
    `SELECT id, scope, owner_user_id, band_id
     FROM asset_profiles
     WHERE id = ?
     LIMIT 1`,
    [profileId],
  );
  return (rows as any[])[0] as
    | { id: number; scope: 'personal' | 'band'; owner_user_id: number | null; band_id: number | null }
    | undefined;
}

router.get('/hub/:bandId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const bandId = Number(req.params.bandId);
  if (!Number.isFinite(bandId)) return res.status(400).json({ error: 'Invalid band id' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;

  try {
    const [datesRows] = await pool.query(
      `SELECT id, event_date, title, venue_name, city, country, status
       FROM dates
       WHERE band_id = ?
         AND event_date >= CURDATE()
       ORDER BY event_date ASC
       LIMIT 8`,
      [bandId],
    );
    const manager = await canManageBand(bandId, user.id);
    res.json({
      nearestDates: datesRows,
      actions: {
        canManageMembers: manager,
        canManageProfiles: manager,
        canOpenLedger: true,
      },
      activity: [],
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Hub feed error', err);
    res.status(500).json({ error: 'Failed to load hub feed' });
  }
});

router.get('/profiles/:module/:bandId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const moduleKey = String(req.params.module || '').trim();
  const bandId = Number(req.params.bandId);
  const scope = String(req.query.scope || 'band') === 'personal' ? 'personal' : 'band';
  if (!['gear', 'setlist', 'patch'].includes(moduleKey)) return res.status(400).json({ error: 'Invalid module' });
  if (!Number.isFinite(bandId)) return res.status(400).json({ error: 'Invalid band id' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;

  try {
    const [rows] = await pool.query(
      `SELECT id, scope, owner_user_id, band_id, name, is_default, created_at, updated_at
       FROM asset_profiles
       WHERE module_key = ?
         AND (
           (scope = 'band' AND band_id = ?)
           OR (scope = 'personal' AND owner_user_id = ?)
         )
       ORDER BY scope, is_default DESC, updated_at DESC`,
      [moduleKey, bandId, user.id],
    );
    const filtered = (rows as any[]).filter((row) => row.scope === scope);
    res.json({ profiles: filtered });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('List profiles error', err);
    res.status(500).json({ error: 'Failed to list profiles' });
  }
});

router.post('/profiles/:module/:bandId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const moduleKey = String(req.params.module || '').trim();
  const bandId = Number(req.params.bandId);
  const scope = String(req.body?.scope || 'band') === 'personal' ? 'personal' : 'band';
  const name = String(req.body?.name || '').trim() || `${scope} profile`;
  if (!['gear', 'setlist', 'patch'].includes(moduleKey)) return res.status(400).json({ error: 'Invalid module' });
  if (!Number.isFinite(bandId)) return res.status(400).json({ error: 'Invalid band id' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;
  const manager = await canManageBand(bandId, user.id);
  if (!canEditAssetScope(scope, true, manager)) return res.status(403).json({ error: 'Not allowed' });

  try {
    const ownerUserId = scope === 'personal' ? user.id : null;
    const resolvedBandId = scope === 'band' ? bandId : null;
    const [ins] = await pool.query(
      `INSERT INTO asset_profiles
        (module_key, scope, owner_user_id, band_id, name, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [moduleKey, scope, ownerUserId, resolvedBandId, name],
    );
    res.status(201).json({ ok: true, id: (ins as any).insertId });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Create profile error', err);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

router.patch('/profiles/:module/:bandId/:profileId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const bandId = Number(req.params.bandId);
  const profileId = Number(req.params.profileId);
  const name = String(req.body?.name || '').trim();
  if (!Number.isFinite(bandId) || !Number.isFinite(profileId)) return res.status(400).json({ error: 'Invalid ids' });
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;

  try {
    const profile = await resolveProfile(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const manager = await canManageBand(bandId, user.id);
    const canEdit = canEditAssetScope(profile.scope, profile.owner_user_id === user.id, manager);
    if (!canEdit) return res.status(403).json({ error: 'Not allowed' });

    await pool.query(`UPDATE asset_profiles SET name = ?, updated_at = NOW() WHERE id = ?`, [name, profileId]);
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Update profile error', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/profiles/:module/:bandId/:profileId/default', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const moduleKey = String(req.params.module || '').trim();
  const bandId = Number(req.params.bandId);
  const profileId = Number(req.params.profileId);
  const scope = String(req.body?.scope || 'band') === 'personal' ? 'personal' : 'band';
  if (!Number.isFinite(bandId) || !Number.isFinite(profileId)) return res.status(400).json({ error: 'Invalid ids' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;
  const manager = await canManageBand(bandId, user.id);
  if (!canEditAssetScope(scope, true, manager)) return res.status(403).json({ error: 'Not allowed' });

  try {
    if (scope === 'personal') {
      await pool.query(
        `UPDATE asset_profiles
         SET is_default = CASE WHEN id = ? THEN 1 ELSE 0 END,
             updated_at = NOW()
         WHERE module_key = ?
           AND scope = 'personal'
           AND owner_user_id = ?`,
        [profileId, moduleKey, user.id],
      );
    } else {
      await pool.query(
        `UPDATE asset_profiles
         SET is_default = CASE WHEN id = ? THEN 1 ELSE 0 END,
             updated_at = NOW()
         WHERE module_key = ?
           AND scope = 'band'
           AND band_id = ?`,
        [profileId, moduleKey, bandId],
      );
    }
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Default profile error', err);
    res.status(500).json({ error: 'Failed to set default profile' });
  }
});

router.get('/items/:module/:bandId/:profileId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const bandId = Number(req.params.bandId);
  const profileId = Number(req.params.profileId);
  if (!Number.isFinite(bandId) || !Number.isFinite(profileId)) return res.status(400).json({ error: 'Invalid ids' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;
  try {
    const [rows] = await pool.query(
      `SELECT id, profile_id, item_key, label, category, qty, notes, sort_order, is_active
       FROM asset_profile_items
       WHERE profile_id = ?
         AND is_active = 1
       ORDER BY sort_order ASC, id ASC`,
      [profileId],
    );
    res.json({ items: rows });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('List items error', err);
    res.status(500).json({ error: 'Failed to list items' });
  }
});

router.post('/items/:module/:bandId/:profileId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const bandId = Number(req.params.bandId);
  const profileId = Number(req.params.profileId);
  if (!Number.isFinite(bandId) || !Number.isFinite(profileId)) return res.status(400).json({ error: 'Invalid ids' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;
  const label = String(req.body?.label || '').trim();
  if (!label) return res.status(400).json({ error: 'Label is required' });

  try {
    const profile = await resolveProfile(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const manager = await canManageBand(bandId, user.id);
    const canEdit = canEditAssetScope(profile.scope, profile.owner_user_id === user.id, manager);
    if (!canEdit) return res.status(403).json({ error: 'Not allowed' });
    const [ins] = await pool.query(
      `INSERT INTO asset_profile_items
        (profile_id, item_key, label, category, qty, notes, sort_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        profileId,
        String(req.body?.item_key || label.toLowerCase().replace(/\s+/g, '_')).slice(0, 120),
        label,
        String(req.body?.category || '').trim() || null,
        Number(req.body?.qty || 1),
        String(req.body?.notes || '').trim() || null,
        Number(req.body?.sort_order || 0),
      ],
    );
    res.status(201).json({ ok: true, id: (ins as any).insertId });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Create item error', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

router.patch('/items/:module/:bandId/:profileId/:itemId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const bandId = Number(req.params.bandId);
  const profileId = Number(req.params.profileId);
  const itemId = Number(req.params.itemId);
  if (!Number.isFinite(bandId) || !Number.isFinite(profileId) || !Number.isFinite(itemId)) {
    return res.status(400).json({ error: 'Invalid ids' });
  }
  if (!(await requireBandRead(req, res, bandId, user.id))) return;

  try {
    const profile = await resolveProfile(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const manager = await canManageBand(bandId, user.id);
    const canEdit = canEditAssetScope(profile.scope, profile.owner_user_id === user.id, manager);
    if (!canEdit) return res.status(403).json({ error: 'Not allowed' });

    await pool.query(
      `UPDATE asset_profile_items
       SET label = COALESCE(?, label),
           category = COALESCE(?, category),
           qty = COALESCE(?, qty),
           notes = COALESCE(?, notes),
           sort_order = COALESCE(?, sort_order),
           updated_at = NOW()
       WHERE id = ?
         AND profile_id = ?`,
      [
        req.body?.label ? String(req.body.label).trim() : null,
        req.body?.category ? String(req.body.category).trim() : null,
        req.body?.qty == null ? null : Number(req.body.qty),
        req.body?.notes ? String(req.body.notes).trim() : null,
        req.body?.sort_order == null ? null : Number(req.body.sort_order),
        itemId,
        profileId,
      ],
    );
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Update item error', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.delete('/items/:module/:bandId/:profileId/:itemId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const bandId = Number(req.params.bandId);
  const profileId = Number(req.params.profileId);
  const itemId = Number(req.params.itemId);
  if (!Number.isFinite(bandId) || !Number.isFinite(profileId) || !Number.isFinite(itemId)) {
    return res.status(400).json({ error: 'Invalid ids' });
  }
  if (!(await requireBandRead(req, res, bandId, user.id))) return;

  try {
    const profile = await resolveProfile(profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const manager = await canManageBand(bandId, user.id);
    const canEdit = canEditAssetScope(profile.scope, profile.owner_user_id === user.id, manager);
    if (!canEdit) return res.status(403).json({ error: 'Not allowed' });

    await pool.query(
      `UPDATE asset_profile_items
       SET is_active = 0,
           updated_at = NOW()
       WHERE id = ?
         AND profile_id = ?`,
      [itemId, profileId],
    );
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Delete item error', err);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

router.get('/combined/gear/:bandId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const bandId = Number(req.params.bandId);
  if (!Number.isFinite(bandId)) return res.status(400).json({ error: 'Invalid band id' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;
  try {
    const [bandProfilesRows] = await pool.query(
      `SELECT id, is_default
       FROM asset_profiles
       WHERE module_key = 'gear'
         AND scope = 'band'
         AND band_id = ?
       ORDER BY is_default DESC, id ASC`,
      [bandId],
    );
    const bandProfileId = resolveDefaultProfileId(bandProfilesRows as any[]);
    const [bandItemsRows] = bandProfileId
      ? await pool.query(
          `SELECT label, category, qty, notes
           FROM asset_profile_items
           WHERE profile_id = ?
             AND is_active = 1`,
          [bandProfileId],
        )
      : [[] as any[]];

    const [linkedRows] = await pool.query(
      `SELECT ap.id AS profile_id, u.display_name
       FROM band_members bm
       JOIN users u ON u.id = bm.user_id
       JOIN asset_profiles ap
         ON ap.scope = 'personal'
        AND ap.module_key = 'gear'
        AND ap.owner_user_id = bm.user_id
        AND ap.is_default = 1
       WHERE bm.band_id = ?
         AND bm.status = 'active'`,
      [bandId],
    );
    const personalItems: any[] = [];
    for (const link of linkedRows as any[]) {
      const [rows] = await pool.query(
        `SELECT label, category, qty, notes
         FROM asset_profile_items
         WHERE profile_id = ?
           AND is_active = 1`,
        [link.profile_id],
      );
      for (const row of rows as any[]) {
        personalItems.push({ ...row, source: `member:${link.display_name}` });
      }
    }

    const bandItems = (bandItemsRows as any[]).map((row) => ({ ...row, source: 'band' }));
    const combined = mergeGearItems({ bandItems, personalItems });
    res.json({ bandProfileId, combined, linkedMembers: linkedRows });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Combined gear error', err);
    res.status(500).json({ error: 'Failed to build combined gear' });
  }
});

// --- I/O patch save/load (separate from asset_profiles) ---
router.get('/patch/:bandId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const bandId = Number(req.params.bandId);
  if (!Number.isFinite(bandId)) return res.status(400).json({ error: 'Invalid band id' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;

  try {
    const [rows] = await pool.query(
      `SELECT id, name, is_default, updated_at
       FROM io_patch_saves
       WHERE band_id = ?
       ORDER BY is_default DESC, updated_at DESC`,
      [bandId],
    );
    res.json({ saves: rows });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('List patch saves error', err);
    res.status(500).json({ error: 'Failed to list patch saves' });
  }
});

router.get('/patch/:bandId/default', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const bandId = Number(req.params.bandId);
  if (!Number.isFinite(bandId)) return res.status(400).json({ error: 'Invalid band id' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;

  try {
    const [rows] = await pool.query(
      `SELECT id, name, data_json
       FROM io_patch_saves
       WHERE band_id = ? AND is_default = 1
       LIMIT 1`,
      [bandId],
    );
    const row = (rows as any[])[0];
    if (!row) return res.status(404).json({ error: 'No default patch' });
    res.json({ id: row.id, name: row.name, data: JSON.parse(row.data_json || '{}') });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get default patch error', err);
    res.status(500).json({ error: 'Failed to get default patch' });
  }
});

router.get('/patch/:bandId/:saveId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const bandId = Number(req.params.bandId);
  const saveId = Number(req.params.saveId);
  if (!Number.isFinite(bandId) || !Number.isFinite(saveId)) return res.status(400).json({ error: 'Invalid ids' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;

  try {
    const [rows] = await pool.query(
      `SELECT id, name, data_json
       FROM io_patch_saves
       WHERE id = ? AND band_id = ?
       LIMIT 1`,
      [saveId, bandId],
    );
    const row = (rows as any[])[0];
    if (!row) return res.status(404).json({ error: 'Patch not found' });
    res.json({ id: row.id, name: row.name, data: JSON.parse(row.data_json || '{}') });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Get patch save error', err);
    res.status(500).json({ error: 'Failed to get patch' });
  }
});

router.post('/patch/:bandId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const bandId = Number(req.params.bandId);
  const name = String(req.body?.name || '').trim() || 'Untitled';
  const setAsDefault = Boolean(req.body?.setAsDefault);
  const data = req.body?.data;
  if (!Number.isFinite(bandId)) return res.status(400).json({ error: 'Invalid band id' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Invalid patch data' });
  const manager = await canManageBand(bandId, user.id);
  const effectiveSetAsDefault = setAsDefault && manager;

  try {
    if (effectiveSetAsDefault) {
      await pool.query(
        `UPDATE io_patch_saves SET is_default = 0 WHERE band_id = ?`,
        [bandId],
      );
    }
    const dataJson = JSON.stringify(data);
    const [ins] = await pool.query(
      `INSERT INTO io_patch_saves (band_id, created_by_user_id, name, is_default, data_json)
       VALUES (?, ?, ?, ?, ?)`,
      [bandId, user.id, name, effectiveSetAsDefault ? 1 : 0, dataJson],
    );
    res.status(201).json({ ok: true, id: (ins as any).insertId });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Save patch error', err);
    res.status(500).json({ error: 'Failed to save patch' });
  }
});

router.post('/invoke/:module/:bandId', async (req: Request, res: Response) => {
  const user = await requireUser(req, res);
  if (!user) return;
  const moduleKey = String(req.params.module || '').trim();
  const bandId = Number(req.params.bandId);
  const dateId = Number(req.body?.dateId);
  if (!['gear', 'setlist', 'patch'].includes(moduleKey)) return res.status(400).json({ error: 'Invalid module' });
  if (!Number.isFinite(bandId) || !Number.isFinite(dateId)) return res.status(400).json({ error: 'Invalid ids' });
  if (!(await requireBandRead(req, res, bandId, user.id))) return;
  const manager = await canManageBand(bandId, user.id);
  if (!manager) return res.status(403).json({ error: 'Only owner/admin can invoke defaults' });

  try {
    const [dateRows] = await pool.query(`SELECT id FROM dates WHERE id = ? AND band_id = ? LIMIT 1`, [dateId, bandId]);
    if (!(dateRows as any[])[0]) return res.status(404).json({ error: 'Date not found for this band' });

    const [profileRows] = await pool.query(
      `SELECT id
       FROM asset_profiles
       WHERE module_key = ?
         AND scope = 'band'
         AND band_id = ?
       ORDER BY is_default DESC, id ASC`,
      [moduleKey, bandId],
    );
    const profileId = resolveDefaultProfileId(profileRows as any[]);
    if (!profileId) return res.status(400).json({ error: 'No default band profile to invoke' });

    await pool.query(`DELETE FROM date_asset_snapshots WHERE date_id = ? AND module_key = ?`, [dateId, moduleKey]);
    await pool.query(
      `INSERT INTO date_asset_snapshots
        (date_id, band_id, module_key, source_profile_id, item_key, label, category, qty, notes, created_by_user_id, created_at)
       SELECT ?, ?, ?, ?, item_key, label, category, qty, notes, ?, NOW()
       FROM asset_profile_items
       WHERE profile_id = ?
         AND is_active = 1`,
      [dateId, bandId, moduleKey, profileId, user.id, profileId],
    );
    res.json({ ok: true, profileId });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Invoke defaults error', err);
    res.status(500).json({ error: 'Failed to invoke defaults' });
  }
});

export default router;

