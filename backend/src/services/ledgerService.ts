import { pool } from '../db';

type UserLedgerOptions = {
  unpaidOnly?: boolean;
  bandId?: number;
  includeArchive?: boolean;
  limit?: number;
  offset?: number;
};

export async function getUserLedger(userId: number, options: UserLedgerOptions = {}) {
  const unpaidOnly = Boolean(options.unpaidOnly);
  const includeArchive = options.includeArchive ?? false;
  const limit = Number.isFinite(options.limit) ? Number(options.limit) : 300;
  const offset = Number.isFinite(options.offset) ? Number(options.offset) : 0;
  const values: Array<number | string> = [userId];
  let where = `
      bm.band_id = d.band_id
      AND bm.user_id = ?
      AND bm.status = 'active'
  `;
  if (Number.isFinite(options.bandId)) {
    where += ' AND d.band_id = ?';
    values.push(Number(options.bandId));
  }
  if (!includeArchive) {
    where += ` AND d.event_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`;
  }
  let having = '';
  if (unpaidOnly) {
    having = `
      HAVING
        COALESCE(SUM(CASE WHEN p.kind = 'member_allocation' THEN p.amount_eur ELSE 0 END), 0)
        >
        COALESCE(SUM(CASE WHEN p.kind = 'member_paid' THEN p.amount_eur ELSE 0 END), 0)
    `;
  }
  values.push(limit, offset);

  const [rows] = await pool.query(
    `SELECT
       d.id AS date_id,
       d.band_id,
       b.name AS band_name,
       b.color AS band_color,
       d.event_date,
       d.title,
       d.venue_name,
       d.city,
       d.country,
       d.status,
       d.event_price,
       d.currency,
       COALESCE(SUM(CASE WHEN p.kind = 'member_allocation' THEN p.amount_eur ELSE 0 END), 0) AS allocated_eur,
       COALESCE(SUM(CASE WHEN p.kind = 'member_paid' THEN p.amount_eur ELSE 0 END), 0) AS paid_eur
     FROM dates d
     JOIN bands b ON b.id = d.band_id
     JOIN band_members bm
       ON ${where}
     LEFT JOIN payments p
       ON p.date_id = d.id
      AND p.user_id = bm.user_id
     GROUP BY
       d.id,
       d.band_id,
       b.name,
       b.color,
       d.event_date,
       d.title,
       d.venue_name,
       d.city,
       d.country,
       d.status,
       d.event_price,
       d.currency
     ${having}
     ORDER BY d.event_date DESC
     LIMIT ?
     OFFSET ?`,
    values,
  );

  return rows;
}

export async function getBandLedger(bandId: number) {
  const [rows] = await pool.query(
    `SELECT
       d.id AS date_id,
       d.event_date,
       d.title,
       d.band_paid_at,
       u.id AS user_id,
       u.display_name,
       COALESCE(SUM(CASE WHEN p.kind = 'member_allocation' THEN p.amount_eur ELSE 0 END), 0) AS allocated_eur,
       COALESCE(SUM(CASE WHEN p.kind = 'member_paid' THEN p.amount_eur ELSE 0 END), 0) AS paid_eur
     FROM dates d
     JOIN band_members bm ON bm.band_id = d.band_id
     JOIN users u ON u.id = bm.user_id
     LEFT JOIN payments p
       ON p.date_id = d.id
      AND p.user_id = u.id
     WHERE d.band_id = ?
       AND bm.status = 'active'
     GROUP BY
       d.id,
       d.event_date,
       d.title,
       u.id,
       u.display_name
     ORDER BY d.event_date ASC, u.display_name ASC`,
    [bandId],
  );

  const [expenseRows] = await pool.query(
    `SELECT
       d.id AS date_id,
       COALESCE(SUM(CASE WHEN p.kind = 'expense' THEN p.amount_eur ELSE 0 END), 0) AS expenses_eur
     FROM dates d
     LEFT JOIN payments p
       ON p.date_id = d.id
     WHERE d.band_id = ?
     GROUP BY d.id`,
    [bandId],
  );

  return { rows, expenseRows };
}

