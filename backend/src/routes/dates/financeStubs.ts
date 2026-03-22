import type { Request, Response, Router } from 'express';
import { pool } from '../../db';
import { canViewBandDomain } from '../../services/authzService';

export function financeDisabled(_req: Request, res: Response) {
  res.status(501).json({ error: 'Finance is disabled pending redesign.' });
}

/** Finance / ledger HTTP stubs + empty finance summary (DB tables unchanged). */
export function registerDateFinanceStubRoutes(router: Router) {
  router.get('/:id/expenses/pending', financeDisabled);
  router.post('/:id/expenses/:paymentId/approve', financeDisabled);
  router.post('/:id/expenses/:paymentId/reject', financeDisabled);
  router.post('/:id/band-paid', financeDisabled);
  router.post('/:id/member-paid', financeDisabled);

  router.get('/:id/finance', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    try {
      const currentUser = (req as any).user;
      if (!currentUser) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const [bandRows] = await pool.query(`SELECT band_id FROM dates WHERE id = ? LIMIT 1`, [id]);
      const bandRow = (bandRows as any[])[0] as { band_id: number } | undefined;
      if (!bandRow) {
        return res.status(404).json({ error: 'Event not found' });
      }
      const hasAccess = await canViewBandDomain(Number(bandRow.band_id), currentUser.id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You are not allowed to view this event' });
      }

      res.json({ totals: {}, members: [] });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching finance summary', err);
      res.status(500).json({ error: 'Failed to load finance summary' });
    }
  });

  router.post('/:id/payments', financeDisabled);
}
