import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { pool } from '../db';
import { hashPassword, verifyPassword } from '../services/passwordService';
import {
  createSession,
  destroySession,
  destroySessionsForUser,
  SESSION_COOKIE_NAME,
} from '../services/sessionService';
import { ensureSoloBandAdmin } from '../services/authzService';
import {
  createEmailVerificationToken,
  createPasswordResetToken,
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  frontendBaseUrl,
  isPasswordResetTokenValid,
} from '../services/authTokenService';
import { sendTransactionalEmail } from '../services/emailService';
import { parseCookies } from '../middleware/sessionAuth';

const router = Router();

function normalizeEmail(raw: unknown) {
  return String(raw || '')
    .trim()
    .toLowerCase();
}

function setSessionCookie(res: Response, sessionId: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

function makeResetUrl(token: string) {
  return `${frontendBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

function makeVerifyUrl(token: string) {
  return `${frontendBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
}

function clientBaseUrl() {
  return String(process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function backendBaseUrl() {
  return String(process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
}

function googleConfig() {
  return {
    clientId: String(process.env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirectUri: String(process.env.GOOGLE_REDIRECT_URI || `${backendBaseUrl()}/api/auth/google/callback`).trim(),
  };
}

function oauthStateCookieName() {
  return 'bandwidth_goauth_state';
}

function makeOAuthState() {
  return randomBytes(24).toString('hex');
}

function maskClientId(clientId: string) {
  if (!clientId) return '';
  const at = clientId.indexOf('-');
  if (at <= 4) return `${clientId.slice(0, 3)}***`;
  return `${clientId.slice(0, 6)}...${clientId.slice(at - 3, at + 4)}...`;
}

async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = makeResetUrl(token);
  await sendTransactionalEmail({
    to: email,
    subject: 'Reset your Bandwidth password',
    text: `We received a request to reset your password.\n\nReset link: ${resetUrl}\n\nIf this was not you, you can ignore this email.`,
  });
}

async function sendPasswordChangedEmail(email: string) {
  await sendTransactionalEmail({
    to: email,
    subject: 'Your Bandwidth password was changed',
    text: `Your Bandwidth password has been changed.\n\nIf you did not perform this action, contact support immediately.`,
  });
}

async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = makeVerifyUrl(token);
  await sendTransactionalEmail({
    to: email,
    subject: 'Verify your Bandwidth email',
    text: `Please verify your email for Bandwidth.\n\nVerification link: ${verifyUrl}`,
  });
}

function makeGoogleAuthUrl(state: string) {
  const { clientId, redirectUri } = googleConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeGoogleCode(code: string) {
  const { clientId, clientSecret, redirectUri } = googleConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await response.json().catch(() => null)) as { access_token?: string; error?: string } | null;
  if (!response.ok || !json?.access_token) {
    throw new Error(json?.error || 'Google token exchange failed');
  }
  return json.access_token;
}

async function fetchGoogleUser(accessToken: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await response.json().catch(() => null)) as
    | {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
      }
    | null;
  if (!response.ok || !json?.sub || !json?.email) {
    throw new Error('Failed to fetch Google user profile');
  }
  return {
    googleId: String(json.sub),
    email: normalizeEmail(json.email),
    emailVerified: Boolean(json.email_verified),
    name: String(json.name || '').trim(),
  };
}

router.get('/session', (req: Request, res: Response) => {
  const user = (req as any).user || null;
  if (!user) return res.json({ authenticated: false, user: null });
  return res.json({ authenticated: true, user });
});

router.get('/google/config-check', (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Unavailable' });
  }
  const { clientId, clientSecret, redirectUri } = googleConfig();
  return res.json({
    ok: true,
    configured: Boolean(clientId && clientSecret),
    clientIdMasked: maskClientId(clientId),
    redirectUri,
    backendUrl: backendBaseUrl(),
    clientUrl: clientBaseUrl(),
  });
});

router.post('/register', async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const displayNameRaw = String(req.body?.display_name || '').trim();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const displayName = displayNameRaw || email.split('@')[0];

  try {
    const [existingRows] = await pool.query(
      `SELECT id, google_id, password_hash, email_verified_at FROM users WHERE email = ? LIMIT 1`,
      [email],
    );
    const existing = (existingRows as any[])[0] as
      | { id: number; google_id: string | null; password_hash: string | null; email_verified_at: Date | null }
      | undefined;
    const newHash = hashPassword(password);

    let userId: number;
    let shouldSendVerifyEmail = false;
    if (existing) {
      if (existing.password_hash) {
        return res.status(409).json({ error: 'Account already exists with password' });
      }
      await pool.query(
        `UPDATE users
         SET password_hash = ?,
             email_verified_at = COALESCE(email_verified_at, NOW()),
             auth_provider = CASE WHEN google_id IS NOT NULL THEN 'hybrid' ELSE 'password' END,
             display_name = COALESCE(NULLIF(display_name, ''), ?),
             updated_at = NOW()
         WHERE id = ?`,
        [newHash, displayName, existing.id],
      );
      userId = existing.id;
      shouldSendVerifyEmail = !existing.email_verified_at;
    } else {
      const [insertResult] = await pool.query(
        `INSERT INTO users
          (email, display_name, role, password_hash, email_verified_at, auth_provider, created_at, updated_at)
         VALUES (?, ?, 'musician', ?, NULL, 'password', NOW(), NOW())`,
        [email, displayName, newHash],
      );
      userId = (insertResult as any).insertId as number;
      shouldSendVerifyEmail = true;
    }

    await ensureSoloBandAdmin(userId);

    if (shouldSendVerifyEmail) {
      const verify = await createEmailVerificationToken(userId);
      await sendVerificationEmail(email, verify.token);
    }

    const session = await createSession({
      userId,
      ip: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });
    setSessionCookie(res, session.sessionId, session.expiresAt);
    return res.status(201).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Register error', err);
    return res.status(500).json({ error: 'Failed to register' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, password_hash
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );
    const row = (rows as any[])[0] as { id: number; password_hash: string | null } | undefined;
    if (!row || !row.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await ensureSoloBandAdmin(row.id);

    const session = await createSession({
      userId: row.id,
      ip: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });
    setSessionCookie(res, session.sessionId, session.expiresAt);
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Login error', err);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, email
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );
    const row = (rows as any[])[0] as { id: number; email: string } | undefined;
    if (row) {
      const reset = await createPasswordResetToken(row.id, req.ip || null);
      await sendPasswordResetEmail(row.email, reset.token);
    }
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Forgot password error', err);
    return res.status(500).json({ error: 'Failed to process forgot password request' });
  }
});

router.get('/reset-password/validate', async (req: Request, res: Response) => {
  const token = String(req.query.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  try {
    const valid = await isPasswordResetTokenValid(token);
    if (!valid) return res.status(400).json({ error: 'Reset token is invalid or expired' });
    return res.json({ ok: true, valid: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Validate reset token error', err);
    return res.status(500).json({ error: 'Failed to validate reset token' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  const token = String(req.body?.token || '').trim();
  const password = String(req.body?.password || '');
  if (!token) return res.status(400).json({ error: 'Token is required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const consumed = await consumePasswordResetToken(token);
    if (!consumed) return res.status(400).json({ error: 'Reset token is invalid or expired' });

    const [rows] = await pool.query(
      `SELECT id, email, google_id
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [consumed.userId],
    );
    const user = (rows as any[])[0] as { id: number; email: string; google_id: string | null } | undefined;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const passwordHash = hashPassword(password);
    await pool.query(
      `UPDATE users
       SET password_hash = ?,
           email_verified_at = COALESCE(email_verified_at, NOW()),
           auth_provider = CASE WHEN google_id IS NOT NULL THEN 'hybrid' ELSE 'password' END,
           updated_at = NOW()
       WHERE id = ?`,
      [passwordHash, user.id],
    );

    await destroySessionsForUser(user.id);
    await sendPasswordChangedEmail(user.email);
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Reset password error', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.get('/verify-email', async (req: Request, res: Response) => {
  const token = String(req.query.token || '').trim();
  if (!token) return res.status(400).json({ error: 'Token is required' });
  try {
    const consumed = await consumeEmailVerificationToken(token);
    if (!consumed) return res.status(400).json({ error: 'Verification token is invalid or expired' });
    await pool.query(`UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = ?`, [consumed.userId]);
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Verify email error', err);
    return res.status(500).json({ error: 'Failed to verify email' });
  }
});

router.post('/dev-admin-login', async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Unavailable in production' });
  }
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  if (!adminEmail) {
    return res.status(500).json({ error: 'ADMIN_EMAIL not configured' });
  }
  try {
    const [rows] = await pool.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [adminEmail]);
    const row = (rows as any[])[0] as { id: number } | undefined;
    if (!row) {
      return res.status(404).json({ error: 'ADMIN_EMAIL user not found' });
    }
    await ensureSoloBandAdmin(row.id);
    const session = await createSession({
      userId: row.id,
      ip: _req.ip || null,
      userAgent: _req.get('user-agent') || null,
    });
    setSessionCookie(res, session.sessionId, session.expiresAt);
    return res.json({ ok: true, mode: 'dev-admin-login' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Dev admin login error', err);
    return res.status(500).json({ error: 'Failed to create dev admin session' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const raw = req.headers.cookie || '';
    const sidChunk = raw
      .split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${SESSION_COOKIE_NAME}=`));
    const sid = sidChunk ? decodeURIComponent(sidChunk.split('=').slice(1).join('=')) : '';
    if (sid) await destroySession(sid);
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Logout error', err);
    return res.status(500).json({ error: 'Failed to logout' });
  }
});

router.get('/google/start', (_req: Request, res: Response) => {
  const { clientId, clientSecret } = googleConfig();
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Google OAuth is not configured' });
  }
  const state = makeOAuthState();
  res.cookie(oauthStateCookieName(), state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: 10 * 60 * 1000,
  });
  return res.redirect(makeGoogleAuthUrl(state));
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const loginUrl = `${clientBaseUrl()}/login`;
  const fail = (reason: string) => res.redirect(`${loginUrl}?oauth_error=${encodeURIComponent(reason)}`);
  const finish = async (userId: number) => {
    await ensureSoloBandAdmin(userId);
    const session = await createSession({
      userId,
      ip: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });
    setSessionCookie(res, session.sessionId, session.expiresAt);
    return res.redirect(`${clientBaseUrl()}/events`);
  };

  try {
    const oauthError = String(req.query.error || '').trim();
    if (oauthError) return fail(oauthError);

    const code = String(req.query.code || '').trim();
    const state = String(req.query.state || '').trim();
    if (!code || !state) return fail('missing_code_or_state');

    const cookieState = parseCookies(req.headers.cookie)[oauthStateCookieName()] || '';
    res.clearCookie(oauthStateCookieName(), { path: '/api/auth/google' });
    if (!cookieState || cookieState !== state) return fail('invalid_state');

    const accessToken = await exchangeGoogleCode(code);
    const profile = await fetchGoogleUser(accessToken);
    if (!profile.email) return fail('missing_email');

    const [existingRows] = await pool.query(
      `SELECT id, google_id, password_hash, display_name
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [profile.email],
    );
    const existing = (existingRows as any[])[0] as
      | { id: number; google_id: string | null; password_hash: string | null; display_name: string | null }
      | undefined;

    if (existing) {
      if (existing.google_id && existing.google_id !== profile.googleId) {
        return fail('google_account_mismatch');
      }
      await pool.query(
        `UPDATE users
         SET google_id = ?,
             auth_provider = CASE WHEN password_hash IS NOT NULL THEN 'hybrid' ELSE 'google' END,
             email_verified_at = CASE WHEN ? THEN COALESCE(email_verified_at, NOW()) ELSE email_verified_at END,
             display_name = CASE WHEN display_name IS NULL OR display_name = '' THEN ? ELSE display_name END,
             updated_at = NOW()
         WHERE id = ?`,
        [profile.googleId, profile.emailVerified ? 1 : 0, profile.name || profile.email.split('@')[0], existing.id],
      );
      return await finish(existing.id);
    }

    const [insertResult] = await pool.query(
      `INSERT INTO users
        (email, google_id, display_name, role, auth_provider, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, 'musician', 'google', ?, NOW(), NOW())`,
      [
        profile.email,
        profile.googleId,
        profile.name || profile.email.split('@')[0],
        profile.emailVerified ? new Date() : null,
      ],
    );
    const userId = (insertResult as any).insertId as number;
    return await finish(userId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Google callback error', err);
    return fail('callback_failed');
  }
});

export default router;
