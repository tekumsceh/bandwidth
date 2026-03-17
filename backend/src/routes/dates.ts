import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { getUserSchedule } from '../services/eventsService';
import { canManageBandFinance, canManageBandPlanning } from '../services/authzService';
import { canEditByLifecyclePhase, getLifecyclePhase } from '../services/lifecycleService';

const router = Router();

async function writeFinanceAudit(
  dateId: number,
  bandId: number,
  paymentId: number | null,
  action: string,
  performedByUserId: number,
  details: Record<string, unknown>,
) {
  await pool.query(
    `INSERT INTO finance_audit_log
      (date_id, band_id, payment_id, action, performed_by_user_id, details_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [dateId, bandId, paymentId, action, performedByUserId, JSON.stringify(details)],
  );
}

// List dates for bands the current user is a member of (excluding running costs)
router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const rows = await getUserSchedule(currentUser.id);
    res.json(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching dates', err);
    res.status(500).json({ error: 'Failed to load dates' });
  }
});

// List pending expenses for a date (owner/admin only)
router.get('/:id/expenses/pending', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Load event + band
    const [dateRows] = await pool.query(
      `SELECT d.id, d.band_id
       FROM dates d
       WHERE d.id = ?`,
      [id],
    );
    const date = (dateRows as any[])[0] as { id: number; band_id: number } | undefined;
    if (!date) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check owner/admin
    const [memberRows] = await pool.query(
      `SELECT role
       FROM band_members
       WHERE band_id = ?
         AND user_id = ?
         AND status = 'active'
       LIMIT 1`,
      [date.band_id, currentUser.id],
    );
    const member = (memberRows as any[])[0] as { role: string } | undefined;
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res
        .status(403)
        .json({ error: 'Only band owner/admin can view pending expenses' });
    }

    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.user_id,
         u.display_name,
         p.label,
         p.amount_eur,
         p.created_at
       FROM payments p
       JOIN users u ON u.id = p.user_id
       WHERE p.date_id = ?
         AND p.kind = 'expense'
         AND p.status = 'pending'
       ORDER BY p.created_at ASC`,
      [id],
    );

    res.json(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching pending expenses', err);
    res.status(500).json({ error: 'Failed to load pending expenses' });
  }
});

// Approve an expense
router.post('/:id/expenses/:paymentId/approve', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const paymentId = Number(req.params.paymentId);
  if (!Number.isFinite(id) || !Number.isFinite(paymentId)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Ensure payment belongs to this date and band
    const [rows] = await pool.query(
      `SELECT p.id, p.date_id, d.band_id
       FROM payments p
       JOIN dates d ON d.id = p.date_id
       WHERE p.id = ?
         AND p.date_id = ?
         AND p.kind = 'expense'
         AND p.status = 'pending'
       LIMIT 1`,
      [paymentId, id],
    );
    const row = (rows as any[])[0] as { id: number; date_id: number; band_id: number } | undefined;
    if (!row) {
      return res.status(404).json({ error: 'Pending expense not found' });
    }

    // Check owner/admin for that band
    const [memberRows] = await pool.query(
      `SELECT role
       FROM band_members
       WHERE band_id = ?
         AND user_id = ?
         AND status = 'active'
       LIMIT 1`,
      [row.band_id, currentUser.id],
    );
    const member = (memberRows as any[])[0] as { role: string } | undefined;
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res
        .status(403)
        .json({ error: 'Only band owner/admin can approve expenses' });
    }

    await pool.query(
      `UPDATE payments
       SET status = 'approved', updated_at = NOW()
       WHERE id = ?`,
      [paymentId],
    );

    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error approving expense', err);
    res.status(500).json({ error: 'Failed to approve expense' });
  }
});

// Reject an expense
router.post('/:id/expenses/:paymentId/reject', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const paymentId = Number(req.params.paymentId);
  if (!Number.isFinite(id) || !Number.isFinite(paymentId)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.date_id, d.band_id
       FROM payments p
       JOIN dates d ON d.id = p.date_id
       WHERE p.id = ?
         AND p.date_id = ?
         AND p.kind = 'expense'
         AND p.status = 'pending'
       LIMIT 1`,
      [paymentId, id],
    );
    const row = (rows as any[])[0] as { id: number; date_id: number; band_id: number } | undefined;
    if (!row) {
      return res.status(404).json({ error: 'Pending expense not found' });
    }

    const [memberRows] = await pool.query(
      `SELECT role
       FROM band_members
       WHERE band_id = ?
         AND user_id = ?
         AND status = 'active'
       LIMIT 1`,
      [row.band_id, currentUser.id],
    );
    const member = (memberRows as any[])[0] as { role: string } | undefined;
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res
        .status(403)
        .json({ error: 'Only band owner/admin can reject expenses' });
    }

    await pool.query(
      `UPDATE payments
       SET status = 'rejected', updated_at = NOW()
       WHERE id = ?`,
      [paymentId],
    );

    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error rejecting expense', err);
    res.status(500).json({ error: 'Failed to reject expense' });
  }
});

// Mark band-level date as paid (owner/admin only)
router.post('/:id/band-paid', async (req: Request, res: Response) => {
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
      `SELECT d.id, d.band_id
       FROM dates d
       WHERE d.id = ?`,
      [id],
    );
    const date = (dateRows as any[])[0] as { id: number; band_id: number } | undefined;
    if (!date) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only owner/admin of this band can mark as paid
    const [memberRows] = await pool.query(
      `SELECT role
       FROM band_members
       WHERE band_id = ?
         AND user_id = ?
         AND status = 'active'
       LIMIT 1`,
      [date.band_id, currentUser.id],
    );
    const member = (memberRows as any[])[0] as { role: string } | undefined;
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res
        .status(403)
        .json({ error: 'Only band owner/admin can mark date as paid' });
    }

    await pool.query(
      `UPDATE dates
       SET band_paid_at = NOW(),
           band_paid_by_user_id = ?
       WHERE id = ?`,
      [currentUser.id, id],
    );

    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error marking band date as paid', err);
    res.status(500).json({ error: 'Failed to mark date as paid' });
  }
});

// Mark current member's date as paid in their personal ledger
router.post('/:id/member-paid', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Ensure current user is in lineup for this date
    const [memberRows] = await pool.query(
      `SELECT dm.id
       FROM date_members dm
       JOIN dates d ON d.id = dm.date_id
       WHERE dm.date_id = ?
         AND dm.user_id = ?
         AND dm.is_confirmed = 1
       LIMIT 1`,
      [id, currentUser.id],
    );
    const row = (memberRows as any[])[0] as { id: number } | undefined;
    if (!row) {
      return res.status(403).json({ error: 'You are not in the lineup for this date' });
    }

    await pool.query(
      `UPDATE date_members
       SET member_paid_at = NOW(),
           member_paid_by_user_id = ?
       WHERE date_id = ?
         AND user_id = ?`,
      [currentUser.id, id, currentUser.id],
    );

    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error marking member date as paid', err);
    res.status(500).json({ error: 'Failed to mark member date as paid' });
  }
});

// Create a new event (date)
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

    // Only allow creating events for bands where user is owner/admin
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

    // Conflict: band already has a gig on this date
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

    // Conflict: current user already booked somewhere on this date (any band, including solo)
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
      [insertId]
    );
    const date = (rows as any[])[0];
    res.status(201).json(date);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error creating date', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Quick create (minimum fields only): band + date
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

// Update event planning fields (future/planning phase)
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

// Basic event detail with notes and schedule
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

    // Ensure current user can see this event (is member of the band)
    const [accessRows] = await pool.query(
      `SELECT 1
       FROM dates d
       JOIN band_members bm ON bm.band_id = d.band_id
       WHERE d.id = ?
         AND bm.user_id = ?
         AND bm.status = 'active'
       LIMIT 1`,
      [id, currentUser.id],
    );
    const hasAccess = (accessRows as any[])[0];
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
      [id]
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

// Lineup for a date
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

    // Ensure current user can see this event (is member of the band)
    const [accessRows] = await pool.query(
      `SELECT 1
       FROM dates d
       JOIN band_members bm ON bm.band_id = d.band_id
       WHERE d.id = ?
         AND bm.user_id = ?
         AND bm.status = 'active'
       LIMIT 1`,
      [id, currentUser.id],
    );
    const hasAccess = (accessRows as any[])[0];
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

// Finance summary for a date
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

    // Ensure current user can see this event (is member of the band)
    const [accessRows] = await pool.query(
      `SELECT 1
       FROM dates d
       JOIN band_members bm ON bm.band_id = d.band_id
       WHERE d.id = ?
         AND bm.user_id = ?
         AND bm.status = 'active'
       LIMIT 1`,
      [id, currentUser.id],
    );
    const hasAccess = (accessRows as any[])[0];
    if (!hasAccess) {
      return res.status(403).json({ error: 'You are not allowed to view this event' });
    }

    // Totals by kind
    const [totalsRows] = await pool.query(
      `SELECT kind, direction, SUM(amount_eur) AS total_eur
       FROM payments
       WHERE date_id = ?
         AND (kind != 'expense' OR status = 'approved')
       GROUP BY kind, direction`,
      [id],
    );
    const totals = (totalsRows as any[]).reduce(
      (acc, row) => {
        const key = `${row.kind}_${row.direction}`;
        acc[key] = Number(row.total_eur || 0);
        return acc;
      },
      {} as Record<string, number>
    );

    // Per-member allocations and paid
    const [memberRows] = await pool.query(
      `SELECT
         u.id AS user_id,
         u.display_name,
         SUM(CASE WHEN p.kind = 'member_allocation' THEN p.amount_eur ELSE 0 END) AS allocated_eur,
         SUM(CASE WHEN p.kind = 'member_paid' THEN p.amount_eur ELSE 0 END) AS paid_eur
       FROM users u
       JOIN payments p ON p.user_id = u.id
       WHERE p.date_id = ?
         AND (p.kind != 'expense' OR p.status = 'approved')
       GROUP BY u.id, u.display_name
       ORDER BY u.display_name`,
      [id],
    );

    res.json({
      totals,
      members: memberRows,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching finance summary', err);
    res.status(500).json({ error: 'Failed to load finance summary' });
  }
});

// Add a payment row for a date (simple ledger API)
router.post('/:id/payments', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const { kind, amount_eur, label, user_id } = req.body || {};

  if (
    kind !== 'incoming' &&
    kind !== 'expense' &&
    kind !== 'member_allocation' &&
    kind !== 'member_paid'
  ) {
    return res.status(400).json({ error: 'Invalid kind' });
  }

  const amt = Number(amount_eur);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ error: 'amount_eur must be > 0' });
  }

  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Load event + band
    const [dateRows] = await pool.query(
      `SELECT d.id, d.band_id, d.event_date, d.status
       FROM dates d
       WHERE d.id = ?`,
      [id],
    );
    const date = (dateRows as any[])[0] as {
      id: number;
      band_id: number;
      event_date: Date;
      status: string;
    };
    if (!date) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Role gates (band domain only, app admins do not bypass this).
    const [memberRows] = await pool.query(
      `SELECT role
       FROM band_members
       WHERE band_id = ?
         AND user_id = ?
         AND status = 'active'
       LIMIT 1`,
      [date.band_id, currentUser.id],
    );
    const member = (memberRows as any[])[0] as { role: string } | undefined;
    if (!member) return res.status(403).json({ error: 'You are not a member of this band' });

    let direction: 'in' | 'out';
    let paymentUserId: number | null = null;

    const phase = getLifecyclePhase({ event_date: date.event_date, status: date.status });

    if (kind === 'incoming') {
      direction = 'in';
      if (!canEditByLifecyclePhase(phase, 'incoming')) {
        return res.status(400).json({ error: 'Incoming is locked for this event phase' });
      }
    } else if (kind === 'expense') {
      direction = 'out';
      const financeAllowed = await canManageBandFinance(date.band_id, currentUser.id);
      if (!financeAllowed) {
        return res
          .status(403)
          .json({ error: 'Only band owner/admin can add band expenses' });
      }
      if (!canEditByLifecyclePhase(phase, 'expense')) {
        return res.status(400).json({ error: 'Expenses are locked for this event phase' });
      }
    } else {
      // member_allocation / member_paid are for a specific user
      direction = 'out';

      if (kind === 'member_paid') {
        // members can only log their own "paid" rows
        paymentUserId = currentUser.id;
        if (!canEditByLifecyclePhase(phase, 'member_paid')) {
          return res.status(400).json({ error: 'Member paid entries are locked for this event phase' });
        }
      } else {
        const financeAllowed = await canManageBandFinance(date.band_id, currentUser.id);
        if (!financeAllowed) {
          return res.status(403).json({ error: 'Only band owner/admin can allocate payouts' });
        }
        if (!canEditByLifecyclePhase(phase, 'member_allocation')) {
          return res.status(400).json({ error: 'Allocations are locked for this event phase' });
        }
        const targetUserId = Number(user_id);
        if (!Number.isFinite(targetUserId)) {
          return res
            .status(400)
            .json({ error: 'user_id is required for member_allocation' });
        }
        paymentUserId = targetUserId;
      }
    }

    // For band-level incoming, only owner/admin can add them
    if (kind === 'incoming' && !(await canManageBandFinance(date.band_id, currentUser.id))) {
      return res
        .status(403)
        .json({ error: 'Only band owner/admin can add incoming' });
    }

    const labelText =
      typeof label === 'string' && label.trim().length > 0
        ? label.trim()
        : kind === 'incoming'
          ? 'Incoming'
          : kind === 'expense'
            ? 'Expense'
            : kind === 'member_allocation'
              ? 'Payout allocation'
              : 'Member reported payout';

    const [result] = await pool.query(
      `INSERT INTO payments
         (date_id, band_id, user_id, kind, direction, method, label,
          amount_eur, amount_original, currency, exchange_rate,
          status,
          created_by_user_id, created_at, updated_at)
       VALUES
         (?, ?, ?, ?, ?, NULL, ?,
          ?, ?, 'EUR', 1.0,
          ?,
          ?, NOW(), NOW())`,
      [
        date.id,
        date.band_id,
        paymentUserId,
        kind,
        direction,
        labelText,
        amt,
        amt,
        kind === 'expense' ? 'pending' : 'approved',
        currentUser.id,
      ],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertId = (result as any).insertId as number;

    await writeFinanceAudit(date.id, date.band_id, insertId, `payment.${kind}.create`, currentUser.id, {
      amount_eur: amt,
      direction,
      target_user_id: paymentUserId,
      phase,
      status: kind === 'expense' ? 'pending' : 'approved',
    });

    res.status(201).json({
      id: insertId,
      date_id: date.id,
      band_id: date.band_id,
      user_id: paymentUserId,
      kind,
      direction,
      label: labelText,
      amount_eur: amt,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error adding payment', err);
    res.status(500).json({ error: 'Failed to add payment' });
  }
});

export default router;


