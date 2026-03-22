/**
 * Smoke tests against the compiled app (no DB — routes that need auth stop at 401).
 * Run: npm test (builds first).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../dist/app.js');

test('GET /api/health returns ok', async () => {
  const res = await request(createApp()).get('/api/health').expect(200);
  assert.equal(res.body.ok, true);
  assert.match(res.headers['x-request-id'], /^[0-9a-f-]{36}$/i);
});

test('GET /api/me without session returns 401', async () => {
  const res = await request(createApp()).get('/api/me').expect(401);
  assert.equal(res.body.error, 'No current user');
});

test('GET /api/dates without session returns 401', async () => {
  const res = await request(createApp()).get('/api/dates').expect(401);
  assert.equal(res.body.error, 'Not authenticated');
});

test('POST /api/logs/client accepts payload', async () => {
  const res = await request(createApp())
    .post('/api/logs/client')
    .send({ kind: 'test', message: 'smoke' })
    .expect(200);
  assert.equal(res.body.ok, true);
});
