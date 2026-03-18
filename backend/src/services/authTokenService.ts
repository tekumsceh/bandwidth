import { createHash, randomBytes } from 'crypto';
import { pool } from '../db';

const RESET_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES || 30);
const VERIFY_HOURS = Number(process.env.EMAIL_VERIFY_TOKEN_HOURS || 48);

function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

function generateToken() {
  return randomBytes(32).toString('hex');
}

export function frontendBaseUrl() {
  return String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

export async function createPasswordResetToken(userId: number, ipAddress: string | null) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_MINUTES * 60 * 1000);
  await pool.query(
    `INSERT INTO password_reset_tokens
      (user_id, token_hash, expires_at, request_ip, created_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [userId, tokenHash, expiresAt, ipAddress],
  );
  return { token, expiresAt };
}

export async function isPasswordResetTokenValid(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const [rows] = await pool.query(
    `SELECT id
     FROM password_reset_tokens
     WHERE token_hash = ?
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  return Boolean((rows as any[])[0]);
}

export async function consumePasswordResetToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       LIMIT 1
       FOR UPDATE`,
      [tokenHash],
    );
    const row = (rows as any[])[0] as { id: number; user_id: number } | undefined;
    if (!row) {
      await conn.rollback();
      return null;
    }
    await conn.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?`, [row.id]);
    await conn.commit();
    return { userId: row.user_id };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function createEmailVerificationToken(userId: number) {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + VERIFY_HOURS * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO email_verification_tokens
      (user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, NOW())`,
    [userId, tokenHash, expiresAt],
  );
  return { token, expiresAt };
}

export async function consumeEmailVerificationToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT id, user_id
       FROM email_verification_tokens
       WHERE token_hash = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       LIMIT 1
       FOR UPDATE`,
      [tokenHash],
    );
    const row = (rows as any[])[0] as { id: number; user_id: number } | undefined;
    if (!row) {
      await conn.rollback();
      return null;
    }
    await conn.query(`UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ?`, [row.id]);
    await conn.commit();
    return { userId: row.user_id };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

