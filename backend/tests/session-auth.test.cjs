const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCookies } = require('../dist/middleware/sessionAuth.js');

test('session auth: parseCookies handles empty header', () => {
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies(''), {});
});

test('session auth: parseCookies parses multiple cookies', () => {
  const parsed = parseCookies('a=1; bandwidth_sid=abc123; theme=dark');
  assert.equal(parsed.a, '1');
  assert.equal(parsed.bandwidth_sid, 'abc123');
  assert.equal(parsed.theme, 'dark');
});

test('session auth: parseCookies decodes encoded values', () => {
  const parsed = parseCookies('bandwidth_sid=abc%3D123%2Fxyz');
  assert.equal(parsed.bandwidth_sid, 'abc=123/xyz');
});
