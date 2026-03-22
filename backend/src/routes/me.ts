import { Router, Request, Response } from 'express';
import { pool } from '../db';
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

/** Ledger-style rows for the current user — stub until finance returns */
router.get('/events', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
  res.json([]);
});

router.get('/summary', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ total_allocated_eur: 0, total_paid_eur: 0 });
});

router.get('/expenses/pending-count', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ pending_count: 0 });
});

router.post('/pay/date/:id', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Finance actions are disabled.' });
});

router.post('/pay/bulk', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Finance actions are disabled.' });
});

export default router;

