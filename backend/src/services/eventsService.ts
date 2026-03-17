import { pool } from '../db';

type UserScheduleOptions = {
  timeline?: 'past' | 'upcoming' | 'all';
  bandId?: number;
  includeArchive?: boolean;
  limit?: number;
  offset?: number;
};

export async function getUserSchedule(
  userId: number,
  options: UserScheduleOptions = {},
) {
  const timeline = options.timeline || 'all';
  const includeArchive = options.includeArchive ?? false;
  const limit = Number.isFinite(options.limit) ? Number(options.limit) : 300;
  const offset = Number.isFinite(options.offset) ? Number(options.offset) : 0;
  const values: Array<number | string> = [userId];
  let where = `
      bm.user_id = ?
      AND bm.status = 'active'
      AND (d.category IS NULL OR d.category <> 'running_cost')
  `;

  if (Number.isFinite(options.bandId)) {
    where += ' AND d.band_id = ?';
    values.push(Number(options.bandId));
  }
  if (timeline === 'upcoming') {
    where += ' AND d.event_date >= CURDATE()';
  } else if (timeline === 'past') {
    where += ' AND d.event_date < CURDATE()';
  }
  if (!includeArchive) {
    where += ` AND d.event_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`;
  }
  values.push(limit, offset);

  const [rows] = await pool.query(
    `SELECT
       d.id,
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
       d.soundcheck_time,
       d.set_time,
       d.description,
       d.updated_at,
       d.band_paid_at
     FROM dates d
     JOIN bands b ON d.band_id = b.id
     JOIN band_members bm ON bm.band_id = d.band_id
     WHERE ${where}
     ORDER BY d.event_date ASC
     LIMIT ?
     OFFSET ?`,
    values,
  );

  return rows;
}

export async function getEventDetail(dateId: number) {
  const [rows] = await pool.query(
    `SELECT
       d.id,
       d.band_id,
       b.name AS band_name,
       b.color AS band_color,
       d.event_date,
       d.title,
       d.venue_name,
       d.city,
       d.country,
       d.address,
       d.load_in_time,
       d.soundcheck_time,
       d.doors_time,
       d.set_time,
       d.curfew_time,
       d.status,
       d.event_price,
       d.currency,
       d.organizer_contact,
       d.tech_contact,
       d.description,
       d.tech_notes,
       d.hospitality_notes,
       d.band_paid_at
     FROM dates d
     JOIN bands b ON b.id = d.band_id
     WHERE d.id = ?`,
    [dateId],
  );

  return (rows as any[])[0] || null;
}

