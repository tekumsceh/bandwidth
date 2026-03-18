const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveGodBandOverride, isBandManagerRole } = require('../dist/services/authzService.js');

test('rbac policy: manager roles include owner/admin only', () => {
  assert.equal(isBandManagerRole('owner'), true);
  assert.equal(isBandManagerRole('admin'), true);
  assert.equal(isBandManagerRole('member'), false);
  assert.equal(isBandManagerRole('guest'), false);
});

test('rbac policy: explicit env override parsing', () => {
  assert.equal(resolveGodBandOverride({ GOD_BAND_OVERRIDE: 'true', NODE_ENV: 'production' }), true);
  assert.equal(resolveGodBandOverride({ GOD_BAND_OVERRIDE: 'false', NODE_ENV: 'development' }), false);
});

test('rbac policy: default depends on NODE_ENV when unset', () => {
  assert.equal(resolveGodBandOverride({ NODE_ENV: 'development' }), true);
  assert.equal(resolveGodBandOverride({ NODE_ENV: 'production' }), false);
});
