import { randomBytes, randomUUID } from 'crypto';
import { pool } from '../db';

export const SESSION_COOKIE_NAME = 'bandwidth_sid';
const IDLE_DAYS = Number(process.env.SESSION_IDLE_DAYS || 7);

function makeSessionId() {
  return `${randomUUID().replace(/-/g, '')}${randomBytes(16).toString('hex')}`;
}

function calcExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + IDLE_DAYS);
  return d;
}

export async function createSession(params: { userId: number; ip: string | null; userAgent: string | null }) {
  const sessionId = makeSessionId();
  const expiresAt = calcExpiresAt();
  await pool.query(
    `INSERT INTO user_sessions
      (session_id, user_id, ip_address, user_agent, created_at, last_seen_at, expires_at)
     VALUES (?, ?, ?, ?, NOW(), NOW(), ?)`,
    [sessionId, params.userId, params.ip, params.userAgent, expiresAt],
  );
  return { sessionId, expiresAt };
}

export async function destroySession(sessionId: string) {
  await pool.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE session_id = ?`, [sessionId]);
}

export async function destroySessionsForUser(userId: number) {
  await pool.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`, [userId]);
}

export async function resolveSessionUser(sessionId: string) {
  const [rows] = await pool.query(
    `SELECT
       s.id AS session_pk,
       s.session_id,
       s.user_id,
       s.expires_at,
       s.revoked_at,
       u.id,
       u.email,
       u.display_name,
       u.role,
       u.default_currency,
       u.local_currency
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.session_id = ?
     LIMIT 1`,
    [sessionId],
  );
  const row = (rows as any[])[0] as
    | {
        session_pk: number;
        session_id: string;
        user_id: number;
        expires_at: Date;
        revoked_at: Date | null;
        id: number;
        email: string;
        display_name: string;
        role: string;
        default_currency: string | null;
        local_currency: string | null;
      }
    | undefined;
  if (!row) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;

  const nextExpires = calcExpiresAt();
  await pool.query(`UPDATE user_sessions SET last_seen_at = NOW(), expires_at = ? WHERE id = ?`, [
    nextExpires,
    row.session_pk,
  ]);

  return {
    sessionId: row.session_id,
    expiresAt: nextExpires,
    user: {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      defaultCurrency: row.default_currency || 'EUR',
      localCurrency: row.local_currency || 'EUR',
    },
  };
}
