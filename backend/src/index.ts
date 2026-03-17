import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import bandsRouter from './routes/bands';
import datesRouter from './routes/dates';
import meRouter from './routes/me';
import pagesRouter from './routes/pages';
import adminConfigRouter from './routes/adminConfig';
import interventionsRouter from './routes/interventions';
import { pool } from './db';
import { ensureV2Schema } from './services/schemaService';
import { ensureSoloBandAdmin } from './services/authzService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: false,
  })
);
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  const reqId = randomUUID();
  const startedAt = Date.now();
  (req as any).reqId = reqId;
  res.setHeader('x-request-id', reqId);

  res.on('finish', () => {
    const elapsedMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        level: 'info',
        type: 'http_request',
        reqId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        elapsedMs,
        at: new Date().toISOString(),
      }),
    );
  });

  next();
});

// Simple "current user" middleware for development:
// Treats ADMIN_EMAIL from .env as the logged-in user and attaches it to req.user.
// In a real setup this will be replaced by proper Google OAuth/session handling.
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return res
      .status(500)
      .json({ error: 'ADMIN_EMAIL not configured in .env – cannot determine current user.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, email, display_name, role, default_currency, local_currency
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [adminEmail],
    );
    const userRow = (rows as any[])[0];
    if (!userRow) {
      return res.status(401).json({
        error:
          'Current user not found in database. Run the seed script or create a user for ADMIN_EMAIL.',
      });
    }
    // Attach to request for downstream routes
    (req as any).user = {
      id: userRow.id as number,
      email: userRow.email as string,
      displayName: userRow.display_name as string,
      role: userRow.role as string,
      defaultCurrency: (userRow.default_currency as string) || 'EUR',
      localCurrency: (userRow.local_currency as string) || 'EUR',
    };
    await ensureSoloBandAdmin(userRow.id as number);
    next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error loading current user', err);
    return res.status(500).json({ error: 'Failed to load current user' });
  }
});

// Health without user context is fine, but it will still run after user is attached.
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, message: 'Bandwidth backend is running.' });
});

// Basic current-user endpoint for the frontend
app.get('/api/me', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'No current user' });
  }
  res.json(user);
});

app.post('/api/logs/client', (req: Request, res: Response) => {
  const payload = req.body || {};
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      level: payload.level || 'error',
      type: 'client_log',
      reqId: (req as any).reqId || null,
      kind: payload.kind || 'unknown',
      message: payload.message || '',
      stack: payload.stack || null,
      componentStack: payload.componentStack || null,
      url: payload.url || null,
      userAgent: payload.userAgent || null,
      occurredAt: payload.occurredAt || null,
      at: new Date().toISOString(),
    }),
  );
  res.json({ ok: true });
});

app.use('/api/bands', bandsRouter);
app.use('/api/dates', datesRouter);
app.use('/api/me', meRouter);
app.use('/api/pages', pagesRouter);
app.use('/api/admin/config', adminConfigRouter);
app.use('/api/interventions', interventionsRouter);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      level: 'error',
      type: 'unhandled_error',
      reqId: (req as any).reqId || null,
      path: req.originalUrl,
      method: req.method,
      message: err instanceof Error ? err.message : 'Unknown server error',
      stack: err instanceof Error ? err.stack : null,
      at: new Date().toISOString(),
    }),
  );
  res.status(500).json({ error: 'Internal server error', reqId: (req as any).reqId || null });
});

async function start() {
  await ensureV2Schema();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Bandwidth backend listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend', err);
  process.exit(1);
});
