import { Request, Response, NextFunction } from 'express';
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

export async function attachSessionUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies[SESSION_COOKIE_NAME];
    if (!sid) return next();

    const resolved = await resolveSessionUser(sid);
    if (!resolved) return next();
    (req as any).user = resolved.user;
    (req as any).session = { sessionId: resolved.sessionId, expiresAt: resolved.expiresAt };
    return next();
  } catch (err) {
    return next(err);
  }
}
