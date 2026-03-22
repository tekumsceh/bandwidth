import { Router, Request, Response } from 'express';
import { getEventDetail, getUserSchedule } from '../services/eventsService';
import { getBandSummary, getUserBands } from '../services/bandsService';
import { pool } from '../db';
import { canManageBandPlanning, canViewBandDomain } from '../services/authzService';
import { canEditByLifecyclePhase, getLifecyclePhase } from '../services/lifecycleService';

const router = Router();

type EventsPagePayload = {
  contractVersion: string;
  schedule: any[];
  ledger: any[];
  bands: any[];
  filters: {
    view: string;
    timeline: 'past' | 'upcoming' | 'all';
    ledgerMode: string;
    bandId: number | null;
    archive: boolean;
  };
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
    const bandRaw = req.query.bandId ?? req.query.band;
    const bandId = Number(bandRaw || NaN);
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

    const [schedule, bands] = await Promise.all([schedulePromise, getUserBands(currentUser.id)]);

    const payload: EventsPagePayload = {
      contractVersion: 'pages.events.v1',
      schedule: schedule as any[],
      ledger: [],
      bands: bands as any[],
      filters: {
        view,
        timeline: resolvedTimeline,
        ledgerMode: resolvedLedgerMode,
        bandId: Number.isFinite(bandId) ? bandId : null,
        archive: includeArchive,
      },
      notifications: {
        pendingExpenses: 0,
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

    const hasBandAccess = await canViewBandDomain(Number((event as any).band_id), currentUser.id);
    if (!hasBandAccess) {
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

    const { role } = await getBandSummary(Number((event as any).band_id), currentUser.id);
    const canPlan = await canManageBandPlanning(Number((event as any).band_id), currentUser.id);
    const phase = getLifecyclePhase({
      event_date: (event as any).event_date,
      status: (event as any).status,
    });
    const canEditPlanning = canPlan && canEditByLifecyclePhase(phase, 'plan_edit');

    res.json({
      contractVersion: 'pages.event.v1',
      event,
      lineup,
      finance: { totals: {} as Record<string, number>, members: [] },
      myLedgerRow: null,
      canSeeBandFinance: false,
      canEditPlanning,
      pendingExpenses: [] as any[],
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
    let where = `d.band_id = ?`;
    const values: Array<number | string> = [bandId];
    if (timeline === 'past') {
      where += ' AND d.event_date < CURDATE()';
    } else if (timeline === 'upcoming') {
      where += ' AND d.event_date >= CURDATE()';
    }
    if (!archive) {
      where += ` AND d.event_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`;
    }
    const [myEventsRows] = await pool.query(
      `SELECT
         d.id AS date_id,
         d.band_id,
         b.name AS band_name,
         d.event_date,
         d.title,
         d.venue_name,
         d.city,
         d.country,
         d.status,
         d.event_price,
         d.currency,
         0 AS allocated_eur,
         0 AS paid_eur
       FROM dates d
       JOIN bands b ON b.id = d.band_id
       WHERE ${where}
       GROUP BY d.id, d.band_id, b.name, d.event_date, d.title, d.venue_name, d.city, d.country, d.status, d.event_price, d.currency
       ORDER BY d.event_date ASC`,
      values,
    );
    const myEvents = myEventsRows as any[];

    const [bandMembersRows] = await pool.query(
      `SELECT
         bm.user_id,
         u.display_name,
         bm.role
       FROM band_members bm
       JOIN users u ON u.id = bm.user_id
       WHERE bm.band_id = ?
         AND bm.status = 'active'
       ORDER BY FIELD(bm.role, 'owner','admin','member','guest'), u.display_name`,
      [bandId],
    );

    res.json({
      contractVersion: 'pages.band.v1',
      detail: { band, my_role: role },
      myEvents,
      bandMembers: bandMembersRows,
      canSeeLedger: false,
      ledgerEvents: [] as any[],
      ledgerMembers: [] as any[],
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error building band page payload', err);
    res.status(500).json({ error: 'Failed to load band page' });
  }
});

export default router;

