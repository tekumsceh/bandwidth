import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { getUserLedger } from '../services/ledgerService';
import { getFxRatesFromBase } from '../services/fxService';

const router = Router();
const SUPPORTED_CURRENCIES = [
  'EUR',
  'RSD',
  'USD',
  'GBP',
  'CHF',
  'CAD',
  'AUD',
  'JPY',
  'SEK',
  'NOK',
  'DKK',
];

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

async function resolvePayFx(defaultCurrencyRaw: unknown) {
  const currency = String(defaultCurrencyRaw || 'EUR').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { currency: 'EUR', rate: 1 };
  }
  if (currency === 'EUR') {
    return { currency: 'EUR', rate: 1 };
  }
  const fx = await getFxRatesFromBase('EUR', [currency]);
  const rate = Number(fx.rates?.[currency] ?? 1);
  if (!Number.isFinite(rate) || rate <= 0) {
    return { currency: 'EUR', rate: 1 };
  }
  return { currency, rate };
}

router.get('/preferences/currency', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [rows] = await pool.query(
      `SELECT default_currency, local_currency
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [currentUser.id],
    );
    const row = (rows as any[])[0];
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
      default_currency: String(row.default_currency || 'EUR').toUpperCase(),
      local_currency: String(row.local_currency || 'EUR').toUpperCase(),
      supported_currencies: SUPPORTED_CURRENCIES,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error loading currency preferences', err);
    return res.status(500).json({ error: 'Failed to load currency preferences' });
  }
});

router.put('/preferences/currency', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const defaultCurrencyRaw = String(req.body?.default_currency || '').trim().toUpperCase();
    const localCurrencyRaw = String(req.body?.local_currency || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(defaultCurrencyRaw) || !/^[A-Z]{3}$/.test(localCurrencyRaw)) {
      return res.status(400).json({ error: 'Currencies must be 3-letter ISO codes' });
    }
    if (!SUPPORTED_CURRENCIES.includes(defaultCurrencyRaw) || !SUPPORTED_CURRENCIES.includes(localCurrencyRaw)) {
      return res.status(400).json({ error: 'Unsupported currency code' });
    }

    await pool.query(
      `UPDATE users
       SET default_currency = ?, local_currency = ?
       WHERE id = ?`,
      [defaultCurrencyRaw, localCurrencyRaw, currentUser.id],
    );

    return res.json({
      ok: true,
      default_currency: defaultCurrencyRaw,
      local_currency: localCurrencyRaw,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error saving currency preferences', err);
    return res.status(500).json({ error: 'Failed to save currency preferences' });
  }
});

router.get('/fx', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const base = String(req.query.base || 'EUR').toUpperCase();
    const symbolsRaw = String(req.query.symbols || '');
    const symbols = symbolsRaw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (!/^[A-Z]{3}$/.test(base)) {
      return res.status(400).json({ error: 'Invalid base currency' });
    }
    const rates = await getFxRatesFromBase(base, symbols.length > 0 ? symbols : SUPPORTED_CURRENCIES);
    return res.json(rates);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error loading FX rates', err);
    return res.status(500).json({ error: 'Failed to load FX rates' });
  }
});

// Upcoming/past events + money for the current user
router.get('/events', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const rows = await getUserLedger(currentUser.id);
    res.json(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching my events', err);
    res.status(500).json({ error: 'Failed to load my events' });
  }
});

// Simple rollup: total allocated vs paid for the current user
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [rows] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN kind = 'member_allocation' THEN amount_eur ELSE 0 END), 0) AS total_allocated_eur,
         COALESCE(SUM(CASE WHEN kind = 'member_paid' THEN amount_eur ELSE 0 END), 0) AS total_paid_eur
       FROM payments
       WHERE user_id = ?`,
      [currentUser.id],
    );
    const row = (rows as any[])[0] || {
      total_allocated_eur: 0,
      total_paid_eur: 0,
    };

    res.json({
      total_allocated_eur: Number(row.total_allocated_eur || 0),
      total_paid_eur: Number(row.total_paid_eur || 0),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching my summary', err);
    res.status(500).json({ error: 'Failed to load my summary' });
  }
});

// Count pending expenses on bands where current user is owner/admin
router.get('/expenses/pending-count', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [rows] = await pool.query(
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
    );
    const row = (rows as any[])[0] || { pending_count: 0 };
    res.json({ pending_count: Number(row.pending_count || 0) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching pending expenses count', err);
    res.status(500).json({ error: 'Failed to load pending expenses count' });
  }
});

// Mark a single date as paid for the current user by inserting member_paid for remaining amount
router.post('/pay/date/:id', async (req: Request, res: Response) => {
  const dateId = Number(req.params.id);
  if (!Number.isFinite(dateId)) {
    return res.status(400).json({ error: 'Invalid date id' });
  }

  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Compute allocated vs paid for this date & user
    const [rows] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN kind = 'member_allocation' THEN amount_eur ELSE 0 END), 0) AS allocated_eur,
         COALESCE(SUM(CASE WHEN kind = 'member_paid' THEN amount_eur ELSE 0 END), 0) AS paid_eur
       FROM payments
       WHERE date_id = ?
         AND user_id = ?`,
      [dateId, currentUser.id],
    );
    const row = (rows as any[])[0] || {
      allocated_eur: 0,
      paid_eur: 0,
    };
    const allocated = Number(row.allocated_eur || 0);
    const paid = Number(row.paid_eur || 0);
    const remaining = allocated - paid;

    if (remaining <= 0) {
      return res.json({
        ok: true,
        message: 'Nothing left to mark as paid for this date.',
        allocated_eur: allocated,
        paid_eur: paid,
      });
    }

    const payFx = await resolvePayFx(currentUser.defaultCurrency);
    const amountOriginal = round2(remaining * payFx.rate);

    // Insert member_paid for remaining amount with FX at pay-time
    await pool.query(
      `INSERT INTO payments (
         date_id,
         band_id,
         user_id,
         kind,
         direction,
         method,
         label,
         amount_eur,
         amount_original,
         currency,
         exchange_rate,
         created_by_user_id,
         created_at,
         updated_at
       )
       SELECT
         d.id        AS date_id,
         d.band_id   AS band_id,
         ?           AS user_id,
         'member_paid' AS kind,
         'out'       AS direction,
         'other'     AS method,
         'Marked paid (single date)' AS label,
         ?           AS amount_eur,
         ?           AS amount_original,
         ?           AS currency,
         ?           AS exchange_rate,
         ?           AS created_by_user_id,
         NOW(),
         NOW()
       FROM dates d
       WHERE d.id = ?`,
      [currentUser.id, remaining, amountOriginal, payFx.currency, payFx.rate, currentUser.id, dateId],
    );

    res.json({
      ok: true,
      message: 'Date marked as paid for current user.',
      allocated_eur: allocated,
      paid_eur: paid + remaining,
      paid_currency: payFx.currency,
      paid_exchange_rate: payFx.rate,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error paying single date for user', err);
    res.status(500).json({ error: 'Failed to mark date as paid' });
  }
});

// Bulk pay: distribute a given amount across unpaid dates (oldest first)
router.post('/pay/bulk', async (req: Request, res: Response) => {
  const { amount } = req.body || {};
  const totalAmount = Number(amount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const payFx = await resolvePayFx(currentUser.defaultCurrency);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Load all dates for this user with allocated/paid, ordered oldest first
      const [rows] = await conn.query(
        `SELECT
           d.id AS date_id,
           d.event_date,
           COALESCE(SUM(CASE WHEN p.kind = 'member_allocation' THEN p.amount_eur ELSE 0 END), 0) AS allocated_eur,
           COALESCE(SUM(CASE WHEN p.kind = 'member_paid' THEN p.amount_eur ELSE 0 END), 0) AS paid_eur
         FROM dates d
         JOIN band_members bm
           ON bm.band_id = d.band_id
          AND bm.user_id = ?
          AND bm.status = 'active'
         LEFT JOIN payments p
           ON p.date_id = d.id
          AND p.user_id = bm.user_id
         GROUP BY d.id, d.event_date
         ORDER BY d.event_date ASC`,
        [currentUser.id],
      );

      let remainingBudget = totalAmount;
      let applied = 0;
      let fullyPaidCount = 0;
      let partialDateId: number | null = null;

      for (const r of rows as any[]) {
        if (remainingBudget <= 0) break;
        const dateId = r.date_id as number;
        const allocated = Number(r.allocated_eur || 0);
        const paid = Number(r.paid_eur || 0);
        const remainingForDate = allocated - paid;
        if (remainingForDate <= 0) continue;

        const payNow = Math.min(remainingBudget, remainingForDate);
        const amountOriginal = round2(payNow * payFx.rate);
        await conn.query(
          `INSERT INTO payments (
             date_id,
             band_id,
             user_id,
             kind,
             direction,
             method,
             label,
             amount_eur,
             amount_original,
             currency,
             exchange_rate,
             created_by_user_id,
             created_at,
             updated_at
           )
           SELECT
             d.id        AS date_id,
             d.band_id   AS band_id,
             ?           AS user_id,
             'member_paid' AS kind,
             'out'       AS direction,
             'other'     AS method,
             'Bulk pay'  AS label,
             ?           AS amount_eur,
             ?           AS amount_original,
             ?           AS currency,
             ?           AS exchange_rate,
             ?           AS created_by_user_id,
             NOW(),
             NOW()
           FROM dates d
           WHERE d.id = ?`,
          [currentUser.id, payNow, amountOriginal, payFx.currency, payFx.rate, currentUser.id, dateId],
        );

        applied += payNow;
        remainingBudget -= payNow;
        if (payNow >= remainingForDate - 0.0001) {
          fullyPaidCount += 1;
        } else {
          partialDateId = dateId;
          break;
        }
      }

      await conn.commit();

      res.json({
        ok: true,
        requested_amount: totalAmount,
        applied_amount: applied,
        remaining_amount: totalAmount - applied,
        fully_paid_dates: fullyPaidCount,
        partial_date_id: partialDateId,
        paid_currency: payFx.currency,
        paid_exchange_rate: payFx.rate,
      });
    } catch (err) {
      await conn.rollback();
      // eslint-disable-next-line no-console
      console.error('Error in bulk pay transaction', err);
      res.status(500).json({ error: 'Failed to apply bulk pay' });
    } finally {
      conn.release();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error handling bulk pay', err);
    res.status(500).json({ error: 'Failed to apply bulk pay' });
  }
});

export default router;

