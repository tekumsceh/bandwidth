import { pool } from '../db';

export async function getUserBands(userId: number) {
  const [rows] = await pool.query(
    `SELECT
       b.id,
       b.name,
       b.color,
       b.is_solo,
       b.created_at,
       b.updated_at
     FROM bands b
     JOIN band_members bm ON bm.band_id = b.id
     WHERE bm.user_id = ?
       AND bm.status = 'active'
     ORDER BY b.name ASC`,
    [userId],
  );

  return rows;
}

export async function getBandSummary(bandId: number, userId: number) {
  const [permRows] = await pool.query(
    `SELECT role
     FROM band_members
     WHERE band_id = ?
       AND user_id = ?
       AND status = 'active'
     LIMIT 1`,
    [bandId, userId],
  );
  const perm = (permRows as any[])[0];
  if (!perm) {
    return { band: null, role: null };
  }

  const [bandRows] = await pool.query(
    `SELECT id, name, color, is_solo, created_at, updated_at
     FROM bands
     WHERE id = ?`,
    [bandId],
  );
  const band = (bandRows as any[])[0] || null;

  return { band, role: perm.role as string };
}

