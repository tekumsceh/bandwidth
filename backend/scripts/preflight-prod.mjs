import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const args = new Set(process.argv.slice(2));
const allowLocalhost = args.has('--allow-localhost');
const envFileArg = [...args].find((arg) => arg.startsWith('--env-file='));
const envFile = envFileArg ? envFileArg.split('=').slice(1).join('=') : '.env';
const envPath = path.resolve(process.cwd(), envFile);

function fail(msg) {
  console.error(`[preflight:prod] ERROR: ${msg}`);
}

function warn(msg) {
  console.warn(`[preflight:prod] WARN: ${msg}`);
}

if (!fs.existsSync(envPath)) {
  fail(`Env file not found: ${envPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(envPath, 'utf8');
const parsed = dotenv.parse(raw);
const duplicateKeys = new Map();
for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq <= 0) continue;
  const key = trimmed.slice(0, eq).trim();
  duplicateKeys.set(key, (duplicateKeys.get(key) || 0) + 1);
}

const errors = [];
const warnings = [];
const requiredKeys = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'DB_PASSWORD',
  'CLIENT_URL',
  'FRONTEND_URL',
  'BACKEND_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'ADMIN_EMAIL',
];

for (const key of requiredKeys) {
  if (!String(parsed[key] || '').trim()) {
    errors.push(`Missing required key: ${key}`);
  }
}

for (const [key, count] of duplicateKeys.entries()) {
  if (count > 1) {
    errors.push(`Duplicate env key found (${count}x): ${key}`);
  }
}

if (parsed.NODE_ENV && parsed.NODE_ENV !== 'production') {
  errors.push(`NODE_ENV must be "production" for preflight (current: "${parsed.NODE_ENV}")`);
}

const adminEmail = String(parsed.ADMIN_EMAIL || '').trim();
if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
  errors.push('ADMIN_EMAIL must be a valid email address');
}

const backendUrl = String(parsed.BACKEND_URL || '').replace(/\/$/, '');
const frontendUrl = String(parsed.FRONTEND_URL || '').replace(/\/$/, '');
const clientUrl = String(parsed.CLIENT_URL || '').replace(/\/$/, '');
const redirect = String(parsed.GOOGLE_REDIRECT_URI || '').replace(/\/$/, '');
const expectedRedirect = `${backendUrl}/api/auth/google/callback`;

if (backendUrl && redirect && redirect !== expectedRedirect) {
  errors.push(`GOOGLE_REDIRECT_URI must equal ${expectedRedirect}`);
}

if (clientUrl && frontendUrl && clientUrl !== frontendUrl) {
  warnings.push('CLIENT_URL and FRONTEND_URL differ; verify this is intentional.');
}

const shouldBlockLocalhost = !allowLocalhost;
if (shouldBlockLocalhost) {
  for (const [name, value] of [
    ['CLIENT_URL', clientUrl],
    ['FRONTEND_URL', frontendUrl],
    ['BACKEND_URL', backendUrl],
    ['GOOGLE_REDIRECT_URI', redirect],
  ]) {
    if (value.includes('localhost') || value.includes('127.0.0.1')) {
      errors.push(`${name} points to localhost/127.0.0.1. Use --allow-localhost only for local dry runs.`);
    }
  }
}

if (!parsed.SESSION_IDLE_DAYS) {
  warnings.push('SESSION_IDLE_DAYS not set; default (7) will be used.');
}

const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
const smtpMissing = smtpKeys.filter((k) => !String(parsed[k] || '').trim());
if (smtpMissing.length > 0) {
  warnings.push(
    `SMTP not fully configured (${smtpMissing.join(', ')} missing). Emails may only log instead of sending.`,
  );
}

for (const msg of warnings) warn(msg);
for (const msg of errors) fail(msg);

if (errors.length > 0) {
  process.exit(1);
}

console.log('[preflight:prod] PASS: environment and auth configuration checks passed.');

