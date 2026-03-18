const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../dist/services/passwordService.js');

test('password hash/verify roundtrip works', () => {
  const raw = 'S3curePass!123';
  const hash = hashPassword(raw);
  assert.ok(hash.startsWith('scrypt$'));
  assert.equal(verifyPassword(raw, hash), true);
});

test('password verify fails for wrong secret', () => {
  const hash = hashPassword('correct-password');
  assert.equal(verifyPassword('wrong-password', hash), false);
});
