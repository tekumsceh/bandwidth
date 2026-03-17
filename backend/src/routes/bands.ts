import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { getUserBands, getBandSummary } from '../services/bandsService';
import { getBandLedger } from '../services/ledgerService';

const router = Router();

// List bands for the current user (membership)
router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const rows = await getUserBands(currentUser.id);
    res.json(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching bands', err);
    res.status(500).json({ error: 'Failed to load bands' });
  }
});

// Make current user admin of all bands they are a member of
router.post('/make-me-admin', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [result] = await pool.query(
      `UPDATE band_members
       SET role = 'admin', updated_at = NOW()
       WHERE user_id = ?
         AND status = 'active'
         AND role = 'member'`,
      [currentUser.id],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info = result as any;
    return res.json({
      updated: info.affectedRows ?? 0,
      message: 'You are now admin on all bands you were a member of.',
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error making user admin of bands', err);
    res.status(500).json({ error: 'Failed to update band roles' });
  }
});

// Bands where current user is owner/admin (for band admin tools)
router.get('/admin', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [rows] = await pool.query(
      `SELECT
         b.id,
         b.name,
         b.color,
         b.is_solo,
         bm.role AS my_role,
         b.created_at,
         b.updated_at
       FROM bands b
       JOIN band_members bm ON bm.band_id = b.id
       WHERE bm.user_id = ?
         AND bm.status = 'active'
         AND bm.role IN ('owner', 'admin')
       ORDER BY b.name ASC`,
      [currentUser.id],
    );
    res.json(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching admin bands', err);
    res.status(500).json({ error: 'Failed to load admin bands' });
  }
});

// Basic band summary for any member (returns band + your role)
router.get('/:id/summary', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { band, role } = await getBandSummary(id, currentUser.id);
    if (!band || !role) {
      return res.status(403).json({ error: 'You are not a member of this band' });
    }

    res.json({
      band,
      my_role: role,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching band summary', err);
    res.status(500).json({ error: 'Failed to load band summary' });
  }
});

// Basic band detail with members (only for owner/admin – used by admin tools)
router.get('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check permissions
    const [permRows] = await pool.query(
      `SELECT role
       FROM band_members
       WHERE band_id = ?
         AND user_id = ?
         AND status = 'active'
       LIMIT 1`,
      [id, currentUser.id],
    );
    const perm = (permRows as any[])[0];
    if (!perm || (perm.role !== 'owner' && perm.role !== 'admin')) {
      return res.status(403).json({ error: 'You are not allowed to manage this band' });
    }

    const [bandRows] = await pool.query(
      `SELECT id, name, color, is_solo, created_at, updated_at
       FROM bands
       WHERE id = ?`,
      [id],
    );
    const band = (bandRows as any[])[0];
    if (!band) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const [memberRows] = await pool.query(
      `SELECT
         bm.user_id,
         u.display_name,
         u.email,
         bm.role,
         bm.status,
         bm.joined_at,
         bm.updated_at
       FROM band_members bm
       JOIN users u ON u.id = bm.user_id
       WHERE bm.band_id = ?
       ORDER BY bm.role DESC, u.display_name`,
      [id],
    );

    res.json({ band, members: memberRows });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching band detail', err);
    res.status(500).json({ error: 'Failed to load band' });
  }
});

// Update band basic info (owner/admin only)
router.patch('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  const { name, color } = req.body || {};

  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [permRows] = await pool.query(
      `SELECT role
       FROM band_members
       WHERE band_id = ?
         AND user_id = ?
         AND status = 'active'
       LIMIT 1`,
      [id, currentUser.id],
    );
    const perm = (permRows as any[])[0];
    if (!perm || (perm.role !== 'owner' && perm.role !== 'admin')) {
      return res.status(403).json({ error: 'You are not allowed to update this band' });
    }

    await pool.query(
      `UPDATE bands
       SET name = COALESCE(?, name),
           color = COALESCE(?, color),
           updated_at = NOW()
       WHERE id = ?`,
      [name || null, color || null, id],
    );

    const [bandRows] = await pool.query(
      `SELECT id, name, color, is_solo, created_at, updated_at
       FROM bands
       WHERE id = ?`,
      [id],
    );
    const band = (bandRows as any[])[0];
    res.json(band);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error updating band', err);
    res.status(500).json({ error: 'Failed to update band' });
  }
});

// Events + per-member finance for a band (owner/admin only)
router.get('/:id/events', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check permissions (owner/admin only)
    const { role } = await getBandSummary(id, currentUser.id);
    if (!role || (role !== 'owner' && role !== 'admin')) {
      return res.status(403).json({ error: 'You are not allowed to view this band ledger' });
    }

    const { rows, expenseRows } = await getBandLedger(id);

    const expenseMap = new Map<number, number>();
    for (const r of expenseRows as any[]) {
      expenseMap.set(r.date_id as number, Number(r.expenses_eur || 0));
    }

    // Shape into events + members
    const eventsMap = new Map<
      number,
      {
        date_id: number;
        event_date: string;
        title: string | null;
        band_paid_at: string | null;
        expenses_eur: number;
        members: { user_id: number; display_name: string; allocated_eur: number; paid_eur: number }[];
      }
    >();
    const membersMap = new Map<number, string>();

    for (const row of rows as any[]) {
      const dateId = row.date_id as number;
      if (!eventsMap.has(dateId)) {
        eventsMap.set(dateId, {
          date_id: dateId,
          event_date: row.event_date as string,
          title: (row.title as string) || null,
          band_paid_at: (row.band_paid_at as string) || null,
          expenses_eur: expenseMap.get(dateId) ?? 0,
          members: [],
        });
      }
      const ev = eventsMap.get(dateId)!;
      const userId = row.user_id as number;
      const displayName = row.display_name as string;
      membersMap.set(userId, displayName);
      ev.members.push({
        user_id: userId,
        display_name: displayName,
        allocated_eur: Number(row.allocated_eur || 0),
        paid_eur: Number(row.paid_eur || 0),
      });
    }

    res.json({
      events: Array.from(eventsMap.values()),
      members: Array.from(membersMap.entries()).map(([user_id, display_name]) => ({
        user_id,
        display_name,
      })),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching band events', err);
    res.status(500).json({ error: 'Failed to load band events' });
  }
});

export default router;

