import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { resolveSessionUser, SESSION_COOKIE_NAME } from '../services/sessionService';

export function parseCookies(raw: string | undefined) {
  const out: Record<string, string> = {};
  if (!raw) return out;
  const parts = raw.split(';');
  for (const chunk of parts) {
    const idx = chunk.indexOf('=');
    if (idx <= 0) continue;
    const key = chunk.slice(0, idx).trim();
    const value = chunk.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function envTrue(raw: string | undefined, defaultValue = false) {
  if (raw == null || raw.trim() === '') return defaultValue;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

type DevBypassUser = {
  id: number;
  email: string;
  display_name: string;
  role: string;
  default_currency: string | null;
  local_currency: string | null;
};

let cachedDevBypassUser: { email: string; user: DevBypassUser | null; cachedAtMs: number } | null = null;

async function resolveDevBypassUser() {
  const enabled = envTrue(process.env.DEV_AUTH_BYPASS, process.env.NODE_ENV !== 'production');
  if (!enabled || process.env.NODE_ENV === 'production') return null;
  const email = String(process.env.DEV_AUTH_BYPASS_EMAIL || process.env.ADMIN_EMAIL || '')
    .trim()
    .toLowerCase();
  if (!email) return null;

  const now = Date.now();
  if (
    cachedDevBypassUser &&
    cachedDevBypassUser.email === email &&
    now - cachedDevBypassUser.cachedAtMs < 30_000
  ) {
    return cachedDevBypassUser.user;
  }

  const [rows] = await pool.query(
    `SELECT id, email, display_name, role, default_currency, local_currency
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );
  const row = (rows as any[])[0] as DevBypassUser | undefined;
  const user = row || null;
  cachedDevBypassUser = { email, user, cachedAtMs: now };
  return user;
}

export async function attachSessionUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies[SESSION_COOKIE_NAME];
    if (!sid) {
      const bypass = await resolveDevBypassUser();
      if (bypass) {
        (req as any).user = {
          id: bypass.id,
          email: bypass.email,
          displayName: bypass.display_name,
          role: bypass.role,
          defaultCurrency: bypass.default_currency || 'EUR',
          localCurrency: bypass.local_currency || 'EUR',
        };
      }
      return next();
    }

    const resolved = await resolveSessionUser(sid);
    if (!resolved) return next();
    (req as any).user = resolved.user;
    (req as any).session = { sessionId: resolved.sessionId, expiresAt: resolved.expiresAt };
    return next();
  } catch (err) {
    return next(err);
  }
}
