"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = require("crypto");
const bands_1 = __importDefault(require("./routes/bands"));
const dates_1 = __importDefault(require("./routes/dates"));
const me_1 = __importDefault(require("./routes/me"));
const pages_1 = __importDefault(require("./routes/pages"));
const adminConfig_1 = __importDefault(require("./routes/adminConfig"));
const interventions_1 = __importDefault(require("./routes/interventions"));
const db_1 = require("./db");
const schemaService_1 = require("./services/schemaService");
const authzService_1 = require("./services/authzService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173',
    credentials: false,
}));
app.use(express_1.default.json());
app.use((req, res, next) => {
    const reqId = (0, crypto_1.randomUUID)();
    const startedAt = Date.now();
    req.reqId = reqId;
    res.setHeader('x-request-id', reqId);
    res.on('finish', () => {
        const elapsedMs = Date.now() - startedAt;
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({
            level: 'info',
            type: 'http_request',
            reqId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            elapsedMs,
            at: new Date().toISOString(),
        }));
    });
    next();
});
// Simple "current user" middleware for development:
// Treats ADMIN_EMAIL from .env as the logged-in user and attaches it to req.user.
// In a real setup this will be replaced by proper Google OAuth/session handling.
app.use(async (req, res, next) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
        return res
            .status(500)
            .json({ error: 'ADMIN_EMAIL not configured in .env – cannot determine current user.' });
    }
    try {
        const [rows] = await db_1.pool.query(`SELECT id, email, display_name, role, default_currency, local_currency
       FROM users
       WHERE email = ?
       LIMIT 1`, [adminEmail]);
        const userRow = rows[0];
        if (!userRow) {
            return res.status(401).json({
                error: 'Current user not found in database. Run the seed script or create a user for ADMIN_EMAIL.',
            });
        }
        // Attach to request for downstream routes
        req.user = {
            id: userRow.id,
            email: userRow.email,
            displayName: userRow.display_name,
            role: userRow.role,
            defaultCurrency: userRow.default_currency || 'EUR',
            localCurrency: userRow.local_currency || 'EUR',
        };
        await (0, authzService_1.ensureSoloBandAdmin)(userRow.id);
        next();
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error loading current user', err);
        return res.status(500).json({ error: 'Failed to load current user' });
    }
});
// Health without user context is fine, but it will still run after user is attached.
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, message: 'Bandwidth backend is running.' });
});
// Basic current-user endpoint for the frontend
app.get('/api/me', (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'No current user' });
    }
    res.json(user);
});
app.post('/api/logs/client', (req, res) => {
    const payload = req.body || {};
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
        level: payload.level || 'error',
        type: 'client_log',
        reqId: req.reqId || null,
        kind: payload.kind || 'unknown',
        message: payload.message || '',
        stack: payload.stack || null,
        componentStack: payload.componentStack || null,
        url: payload.url || null,
        userAgent: payload.userAgent || null,
        occurredAt: payload.occurredAt || null,
        at: new Date().toISOString(),
    }));
    res.json({ ok: true });
});
app.use('/api/bands', bands_1.default);
app.use('/api/dates', dates_1.default);
app.use('/api/me', me_1.default);
app.use('/api/pages', pages_1.default);
app.use('/api/admin/config', adminConfig_1.default);
app.use('/api/interventions', interventions_1.default);
app.use((err, req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({
        level: 'error',
        type: 'unhandled_error',
        reqId: req.reqId || null,
        path: req.originalUrl,
        method: req.method,
        message: err instanceof Error ? err.message : 'Unknown server error',
        stack: err instanceof Error ? err.stack : null,
        at: new Date().toISOString(),
    }));
    res.status(500).json({ error: 'Internal server error', reqId: req.reqId || null });
});
async function start() {
    await (0, schemaService_1.ensureV2Schema)();
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
