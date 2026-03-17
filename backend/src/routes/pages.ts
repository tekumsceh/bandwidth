import { Router, Request, Response } from 'express';
import { getEventDetail, getUserSchedule } from '../services/eventsService';
import { getBandLedger, getUserLedger } from '../services/ledgerService';
import { getBandSummary, getUserBands } from '../services/bandsService';
import { pool } from '../db';
import { canManageBandPlanning } from '../services/authzService';
import { canEditByLifecyclePhase, getLifecyclePhase } from '../services/lifecycleService';

const router = Router();

type EventsPagePayload = {
  schedule: any[];
  ledger: any[];
  bands: any[];
  notifications: {
    pendingExpenses: number;
  };
};

router.get('/events', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const view = String(req.query.view || 'all').toLowerCase();
    const timeline = String(req.query.timeline || 'upcoming').toLowerCase() as 'past' | 'upcoming' | 'all';
    const ledgerMode = String(req.query.ledgerMode || 'unpaid').toLowerCase();
    const archive = String(req.query.archive || '0') === '1';
    const bandId = Number(req.query.band || NaN);
    const limit = Number(req.query.limit || 300);
    const offset = Number(req.query.offset || 0);

    // Config defaults (DB source of truth)
    const [cfgRows] = await pool.query(`SELECT * FROM page_listing_config WHERE page_key = 'events' LIMIT 1`);
    const cfg = (cfgRows as any[])[0] as
      | {
          default_timeline?: string;
          default_ledger_mode?: string;
          archive_enabled?: number;
        }
      | undefined;
    const resolvedTimeline = (timeline || cfg?.default_timeline || 'upcoming') as
      | 'past'
      | 'upcoming'
      | 'all';
    const resolvedLedgerMode = ledgerMode || cfg?.default_ledger_mode || 'unpaid';
    const archiveEnabled = cfg?.archive_enabled === undefined ? true : Boolean(cfg.archive_enabled);
    const includeArchive = archiveEnabled ? archive : false;

    const schedulePromise =
      view === 'all' || view === 'schedule'
        ? getUserSchedule(currentUser.id, {
            timeline: resolvedTimeline,
            bandId: Number.isFinite(bandId) ? bandId : undefined,
            includeArchive,
            limit,
            offset,
          })
        : Promise.resolve([]);
    const ledgerPromise =
      view === 'all' || view === 'ledger'
        ? getUserLedger(currentUser.id, {
            unpaidOnly: resolvedLedgerMode === 'unpaid',
            bandId: Number.isFinite(bandId) ? bandId : undefined,
            includeArchive,
            limit,
            offset,
          })
        : Promise.resolve([]);

    const [schedule, ledger, bands, pendingRows] = await Promise.all([
      schedulePromise,
      ledgerPromise,
      getUserBands(currentUser.id),
      pool.query(
        `SELECT
           COUNT(*) AS pending_count
         FROM payments p
         JOIN dates d ON d.id = p.date_id
         JOIN band_members bm
           ON bm.band_id = d.band_id
          AND bm.user_id = ?
          AND bm.status = 'active'
          AND bm.role IN ('owner', 'admin')
         WHERE p.kind = 'expense'
           AND p.status = 'pending'`,
        [currentUser.id],
      ),
    ]);

    const pendingRow = ((pendingRows as any)[0] as any[])[0] || { pending_count: 0 };

    const payload: EventsPagePayload = {
      schedule: schedule as any[],
      ledger: ledger as any[],
      bands: bands as any[],
      notifications: {
        pendingExpenses: Number(pendingRow.pending_count || 0),
      },
    };

    res.json(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error building events page payload', err);
    res.status(500).json({ error: 'Failed to load events page' });
  }
});

router.get('/event/:id', async (req: Request, res: Response) => {
  const dateId = Number(req.params.id);
  if (!Number.isFinite(dateId)) {
    return res.status(400).json({ error: 'Invalid event id' });
  }

  try {
    const currentUser = (req as any).user;
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });

    const event = await getEventDetail(dateId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const [accessRows] = await pool.query(
      `SELECT 1
       FROM dates d
       JOIN band_members bm ON bm.band_id = d.band_id
       WHERE d.id = ?
         AND bm.user_id = ?
         AND bm.status = 'active'
       LIMIT 1`,
      [dateId, currentUser.id],
    );
    if (!(accessRows as any[])[0]) {
      return res.status(403).json({ error: 'You are not allowed to view this event' });
    }

    const [lineup] = await pool.query(
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
      [dateId],
    );

    const [totalsRows] = await pool.query(
      `SELECT kind, direction, SUM(amount_eur) AS total_eur
       FROM payments
       WHERE date_id = ?
         AND (kind != 'expense' OR status = 'approved')
       GROUP BY kind, direction`,
      [dateId],
    );
    const totals = (totalsRows as any[]).reduce((acc, row) => {
      acc[`${row.kind}_${row.direction}`] = Number(row.total_eur || 0);
      return acc;
    }, {} as Record<string, number>);

    const [financeMembers] = await pool.query(
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
      [dateId],
    );

    const userLedger = (await getUserLedger(currentUser.id, { includeArchive: true })) as any[];
    const myLedgerRow = userLedger.find((row) => Number(row.date_id) === dateId) || null;

    const { role } = await getBandSummary(Number((event as any).band_id), currentUser.id);
    const canSeeBandFinance = role === 'owner' || role === 'admin';
    const canPlan = await canManageBandPlanning(Number((event as any).band_id), currentUser.id);
    const phase = getLifecyclePhase({
      event_date: (event as any).event_date,
      status: (event as any).status,
    });
    const canEditPlanning = canPlan && canEditByLifecyclePhase(phase, 'plan_edit');

    let pendingExpenses: any[] = [];
    if (canSeeBandFinance) {
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
        [dateId],
      );
      pendingExpenses = rows as any[];
    }

    res.json({
      event,
      lineup,
      finance: { totals, members: financeMembers },
      myLedgerRow: myLedgerRow
        ? {
            allocated_eur: Number(myLedgerRow.allocated_eur || 0),
            paid_eur: Number(myLedgerRow.paid_eur || 0),
          }
        : null,
      canSeeBandFinance,
      canEditPlanning,
      pendingExpenses,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error building event page payload', err);
    res.status(500).json({ error: 'Failed to load event page' });
  }
});

router.get('/band/:id', async (req: Request, res: Response) => {
  const bandId = Number(req.params.id);
  if (!Number.isFinite(bandId)) return res.status(400).json({ error: 'Invalid band id' });

  try {
    const currentUser = (req as any).user;
    if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });

    const { band, role } = await getBandSummary(bandId, currentUser.id);
    if (!band || !role) return res.status(403).json({ error: 'You are not a member of this band' });

    const timeline = String(req.query.timeline || 'upcoming').toLowerCase();
    const archive = String(req.query.archive || '0') === '1';
    const userLedger = (await getUserLedger(currentUser.id, {
      bandId,
      includeArchive: archive,
      unpaidOnly: false,
      limit: 500,
      offset: 0,
    })) as any[];
    const myEvents = userLedger.filter((row) => Number(row.band_id) === bandId);

    const filteredMyEvents =
      timeline === 'past'
        ? myEvents.filter((row) => new Date(row.event_date) < new Date())
        : timeline === 'upcoming'
          ? myEvents.filter((row) => new Date(row.event_date) >= new Date())
          : myEvents;

    let ledgerEvents: any[] = [];
    let ledgerMembers: any[] = [];
    if (role === 'owner' || role === 'admin') {
      const { rows, expenseRows } = await getBandLedger(bandId);
      const expenseMap = new Map<number, number>();
      for (const r of expenseRows as any[]) {
        expenseMap.set(Number(r.date_id), Number(r.expenses_eur || 0));
      }
      const eventsMap = new Map<number, any>();
      const membersMap = new Map<number, string>();
      for (const row of rows as any[]) {
        const dateKey = Number(row.date_id);
        if (!eventsMap.has(dateKey)) {
          eventsMap.set(dateKey, {
            date_id: dateKey,
            event_date: row.event_date,
            title: row.title || null,
            band_paid_at: row.band_paid_at || null,
            expenses_eur: expenseMap.get(dateKey) ?? 0,
            members: [],
          });
        }
        membersMap.set(Number(row.user_id), String(row.display_name));
        eventsMap.get(dateKey).members.push({
          user_id: Number(row.user_id),
          display_name: String(row.display_name),
          allocated_eur: Number(row.allocated_eur || 0),
          paid_eur: Number(row.paid_eur || 0),
        });
      }
      ledgerEvents = Array.from(eventsMap.values());
      ledgerMembers = Array.from(membersMap.entries()).map(([user_id, display_name]) => ({
        user_id,
        display_name,
      }));
    }

    res.json({
      detail: { band, my_role: role },
      myEvents: filteredMyEvents,
      canSeeLedger: role === 'owner' || role === 'admin',
      ledgerEvents,
      ledgerMembers,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error building band page payload', err);
    res.status(500).json({ error: 'Failed to load band page' });
  }
});

export default router;

