import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { canConfigureApp, canManageBandFinance } from '../services/authzService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const appAdmin = await canConfigureApp(user);
  if (appAdmin) {
    const [rows] = await pool.query(
      `SELECT ir.*, u.display_name AS requested_by_name, ru.display_name AS reviewed_by_name
       FROM intervention_requests ir
       JOIN users u ON u.id = ir.requested_by_user_id
       LEFT JOIN users ru ON ru.id = ir.reviewed_by_user_id
       ORDER BY ir.created_at DESC`,
    );
    return res.json(rows);
  }

  const [rows] = await pool.query(
    `SELECT ir.*
     FROM intervention_requests ir
     JOIN band_members bm ON bm.band_id = ir.band_id
     WHERE bm.user_id = ?
       AND bm.status = 'active'
       AND bm.role IN ('owner','admin')
     ORDER BY ir.created_at DESC`,
    [user.id],
  );
  return res.json(rows);
});

router.post('/request', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const dateId = Number(req.body?.date_id);
  const bandId = Number(req.body?.band_id);
  const reason = String(req.body?.reason || '').trim();
  const scope = req.body?.scope_json ?? null;
  if (!Number.isFinite(dateId) || !Number.isFinite(bandId) || !reason) {
    return res.status(400).json({ error: 'date_id, band_id and reason are required' });
  }

  const canRequest = await canManageBandFinance(bandId, user.id);
  if (!canRequest) {
    return res.status(403).json({ error: 'Band admin/owner access required' });
  }

  const [result] = await pool.query(
    `INSERT INTO intervention_requests
      (date_id, band_id, requested_by_user_id, reason, scope_json, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
    [dateId, bandId, user.id, reason, scope ? JSON.stringify(scope) : null],
  );
  const insertId = (result as any).insertId as number;
  const [rows] = await pool.query(`SELECT * FROM intervention_requests WHERE id = ?`, [insertId]);
  return res.status(201).json((rows as any[])[0]);
});

router.post('/:id/review', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const id = Number(req.params.id);
  const status = String(req.body?.status || '').toLowerCase();
  if (!Number.isFinite(id) || (status !== 'approved' && status !== 'rejected')) {
    return res.status(400).json({ error: 'Valid id and status are required' });
  }

  const [rows] = await pool.query(`SELECT * FROM intervention_requests WHERE id = ?`, [id]);
  const reqRow = (rows as any[])[0];
  if (!reqRow) return res.status(404).json({ error: 'Intervention request not found' });
  if (reqRow.status !== 'pending') return res.status(400).json({ error: 'Intervention already reviewed' });

  const canReview = await canManageBandFinance(Number(reqRow.band_id), user.id);
  if (!canReview) return res.status(403).json({ error: 'Band admin/owner review required' });

  await pool.query(
    `UPDATE intervention_requests
     SET status = ?, reviewed_by_user_id = ?, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [status, user.id, id],
  );
  const [updatedRows] = await pool.query(`SELECT * FROM intervention_requests WHERE id = ?`, [id]);
  return res.json((updatedRows as any[])[0]);
});

export default router;

