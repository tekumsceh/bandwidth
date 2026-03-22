import type { Request, Response, Router } from 'express';
import { pool } from '../../db';
import { canManageBandPlanning, canViewBandDomain } from '../../services/authzService';
import { canEditByLifecyclePhase, getLifecyclePhase } from '../../services/lifecycleService';

/** POST /, POST /quick, PUT /:id, GET /:id, GET /:id/members */
export function registerDateCrudRoutes(router: Router) {
  router.post('/', async (req: Request, res: Response) => {
    const {
      band_id,
      event_date,
      title,
      venue_name,
      city,
      country,
      address,
      load_in_time,
      soundcheck_time,
      doors_time,
      set_time,
      curfew_time,
      organizer_contact,
      tech_contact,
      tech_notes,
      hospitality_notes,
      event_price,
      currency,
      description,
    } = req.body || {};

    const bandIdNum = Number(band_id);
    if (!Number.isFinite(bandIdNum)) {
      return res.status(400).json({ error: 'band_id is required and must be a number' });
    }
    if (!event_date) {
      return res.status(400).json({ error: 'event_date is required' });
    }

    const priceNum = event_price != null ? Number(event_price) : 0;
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'event_price must be a non-negative number' });
    }

    const curr =
      typeof currency === 'string' && currency.trim().length > 0
        ? currency.trim().toUpperCase()
        : 'EUR';

    try {
      const currentUser = (req as any).user;
      if (!currentUser) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const [memberRows] = await pool.query(
        `SELECT role
         FROM band_members
         WHERE band_id = ?
           AND user_id = ?
           AND status = 'active'
         LIMIT 1`,
        [bandIdNum, currentUser.id],
      );
      const member = (memberRows as any[])[0];
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return res
          .status(403)
          .json({ error: 'You are not allowed to create events for this band' });
      }

      const [bandConflictRows] = await pool.query(
        `SELECT id
         FROM dates
         WHERE band_id = ?
           AND event_date = ?
         LIMIT 1`,
        [bandIdNum, event_date],
      );
      if ((bandConflictRows as any[])[0]) {
        return res.status(409).json({
          error: 'This band already has an event on that date.',
          code: 'BAND_DATE_CONFLICT',
        });
      }

      const [userConflictRows] = await pool.query(
        `SELECT d.id
         FROM dates d
         JOIN band_members bm ON bm.band_id = d.band_id
         WHERE bm.user_id = ?
           AND bm.status = 'active'
           AND d.event_date = ?
         LIMIT 1`,
        [currentUser.id, event_date],
      );
      if ((userConflictRows as any[])[0]) {
        return res.status(409).json({
          error: 'You already have another event on that date.',
          code: 'USER_DATE_CONFLICT',
        });
      }

      const [result] = await pool.query(
        `INSERT INTO dates
           (band_id, event_date, title, venue_name, city, country, address,
            load_in_time, soundcheck_time, doors_time, set_time, curfew_time,
            organizer_contact, tech_contact,
            tech_notes, hospitality_notes,
            status, category, deal_type, contract_status,
            event_price, currency, description, created_at, updated_at)
         VALUES
           (?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?,
            ?, ?,
            'tentative', NULL, 'flat', 'none',
            ?, ?, ?, NOW(), NOW())`,
        [
          bandIdNum,
          event_date,
          title || null,
          venue_name || null,
          city || null,
          country || null,
          address || null,
          load_in_time || null,
          soundcheck_time || null,
          doors_time || null,
          set_time || null,
          curfew_time || null,
          organizer_contact || null,
          tech_contact || null,
          tech_notes || null,
          hospitality_notes || null,
          priceNum,
          curr,
          description || null,
        ],
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertId = (result as any).insertId as number;
      const [rows] = await pool.query(
        `SELECT
           d.*,
           b.name AS band_name,
           b.color AS band_color
         FROM dates d
         JOIN bands b ON d.band_id = b.id
         WHERE d.id = ?`,
        [insertId],
      );
      const date = (rows as any[])[0];
      res.status(201).json(date);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error creating date', err);
      res.status(500).json({ error: 'Failed to create event' });
    }
  });

  router.post('/quick', async (req: Request, res: Response) => {
    const bandIdNum = Number(req.body?.band_id);
    const eventDate = String(req.body?.event_date || '').trim();
    if (!Number.isFinite(bandIdNum) || !eventDate) {
      return res.status(400).json({ error: 'band_id and event_date are required' });
    }

    try {
      const currentUser = (req as any).user;
      if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });

      const planningAllowed = await canManageBandPlanning(bandIdNum, currentUser.id);
      if (!planningAllowed) {
        return res.status(403).json({ error: 'Only band owner/admin can quick-create dates' });
      }

      const [bandConflictRows] = await pool.query(
        `SELECT id
         FROM dates
         WHERE band_id = ?
           AND event_date = ?
         LIMIT 1`,
        [bandIdNum, eventDate],
      );
      if ((bandConflictRows as any[])[0]) {
        return res.status(409).json({
          error: 'This band already has an event on that date.',
          code: 'BAND_DATE_CONFLICT',
        });
      }

      const [result] = await pool.query(
        `INSERT INTO dates
          (band_id, event_date, status, category, deal_type, contract_status, event_price, currency, created_at, updated_at)
         VALUES
          (?, ?, 'tentative', NULL, 'flat', 'none', 0, 'EUR', NOW(), NOW())`,
        [bandIdNum, eventDate],
      );
      const insertId = (result as any).insertId as number;
      const [rows] = await pool.query(
        `SELECT
           d.*,
           b.name AS band_name,
           b.color AS band_color
         FROM dates d
         JOIN bands b ON d.band_id = b.id
         WHERE d.id = ?`,
        [insertId],
      );
      return res.status(201).json((rows as any[])[0]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error quick-creating date', err);
      return res.status(500).json({ error: 'Failed to quick-create event' });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    try {
      const currentUser = (req as any).user;
      if (!currentUser) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const [dateRows] = await pool.query(
        `SELECT d.id, d.band_id, d.event_date, d.status
         FROM dates d
         WHERE d.id = ?`,
        [id],
      );
      const date = (dateRows as any[])[0] as
        | { id: number; band_id: number; event_date: Date; status: string }
        | undefined;
      if (!date) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const canPlan = await canManageBandPlanning(date.band_id, currentUser.id);
      if (!canPlan) {
        return res.status(403).json({ error: 'Only band owner/admin can edit event planning' });
      }

      const phase = getLifecyclePhase({ event_date: date.event_date, status: date.status });
      if (!canEditByLifecyclePhase(phase, 'plan_edit')) {
        return res.status(400).json({ error: 'Event planning is locked for this phase' });
      }

      const allowedStatus = new Set(['tentative', 'confirmed', 'cancelled', 'done']);
      const statusRaw = String(req.body?.status || '').trim().toLowerCase();
      const status = allowedStatus.has(statusRaw) ? statusRaw : date.status;

      const eventDate = req.body?.event_date ? String(req.body.event_date).trim() : null;
      const eventPrice = req.body?.event_price != null ? Number(req.body.event_price) : null;
      const currencyRaw =
        typeof req.body?.currency === 'string' && req.body.currency.trim().length > 0
          ? req.body.currency.trim().toUpperCase()
          : null;

      if (eventPrice != null && (!Number.isFinite(eventPrice) || eventPrice < 0)) {
        return res.status(400).json({ error: 'event_price must be a non-negative number' });
      }
      if (currencyRaw && !/^[A-Z]{3}$/.test(currencyRaw)) {
        return res.status(400).json({ error: 'currency must be a 3-letter code' });
      }

      await pool.query(
        `UPDATE dates
         SET event_date = COALESCE(?, event_date),
             title = ?,
             venue_name = ?,
             city = ?,
             country = ?,
             address = ?,
             load_in_time = ?,
             soundcheck_time = ?,
             doors_time = ?,
             set_time = ?,
             curfew_time = ?,
             status = ?,
             event_price = COALESCE(?, event_price),
             currency = COALESCE(?, currency),
             organizer_contact = ?,
             tech_contact = ?,
             description = ?,
             tech_notes = ?,
             hospitality_notes = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [
          eventDate,
          req.body?.title || null,
          req.body?.venue_name || null,
          req.body?.city || null,
          req.body?.country || null,
          req.body?.address || null,
          req.body?.load_in_time || null,
          req.body?.soundcheck_time || null,
          req.body?.doors_time || null,
          req.body?.set_time || null,
          req.body?.curfew_time || null,
          status,
          eventPrice,
          currencyRaw,
          req.body?.organizer_contact || null,
          req.body?.tech_contact || null,
          req.body?.description || null,
          req.body?.tech_notes || null,
          req.body?.hospitality_notes || null,
          id,
        ],
      );

      const [rows] = await pool.query(
        `SELECT d.*, b.name AS band_name, b.color AS band_color
         FROM dates d
         JOIN bands b ON d.band_id = b.id
         WHERE d.id = ?`,
        [id],
      );
      return res.json((rows as any[])[0]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error updating event', err);
      return res.status(500).json({ error: 'Failed to update event' });
    }
  });

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

      const [bandRows] = await pool.query(`SELECT band_id FROM dates WHERE id = ? LIMIT 1`, [id]);
      const bandRow = (bandRows as any[])[0] as { band_id: number } | undefined;
      if (!bandRow) {
        return res.status(404).json({ error: 'Event not found' });
      }
      const hasAccess = await canViewBandDomain(Number(bandRow.band_id), currentUser.id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You are not allowed to view this event' });
      }

      const [rows] = await pool.query(
        `SELECT
           d.*,
           b.name AS band_name,
           b.color AS band_color
         FROM dates d
         JOIN bands b ON d.band_id = b.id
         WHERE d.id = ?`,
        [id],
      );
      const date = (rows as any[])[0];
      if (!date) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.json(date);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching date detail', err);
      res.status(500).json({ error: 'Failed to load event' });
    }
  });

  router.get('/:id/members', async (req: Request, res: Response) => {
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

      const [rows] = await pool.query(
        `SELECT
           dm.id,
           dm.user_id,
           u.display_name,
           u.email,
           dm.role,
           dm.is_confirmed,
           dm.notes,
           dm.member_paid_at
         FROM date_members dm
         JOIN users u ON dm.user_id = u.id
         WHERE dm.date_id = ?
         ORDER BY dm.role, u.display_name`,
        [id],
      );
      res.json(rows);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error fetching date members', err);
      res.status(500).json({ error: 'Failed to load lineup' });
    }
  });
}
