const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canEditAssetScope,
  resolveDefaultProfileId,
  mergeGearItems,
} = require('../dist/services/assetsService.js');

test('assets policy: personal scope is owner-only', () => {
  assert.equal(canEditAssetScope('personal', true, false), true);
  assert.equal(canEditAssetScope('personal', false, true), false);
});

test('assets policy: band scope requires manager', () => {
  assert.equal(canEditAssetScope('band', true, false), false);
  assert.equal(canEditAssetScope('band', false, true), true);
});

test('assets policy: default profile selection prefers explicit default', () => {
  const id = resolveDefaultProfileId([
    { id: 3, is_default: 0 },
    { id: 7, is_default: 1 },
    { id: 9, is_default: 0 },
  ]);
  assert.equal(id, 7);
});

test('assets policy: default profile falls back to first profile', () => {
  const id = resolveDefaultProfileId([{ id: 11, is_default: 0 }, { id: 12, is_default: 0 }]);
  assert.equal(id, 11);
});

test('assets policy: merged gear keeps source rows', () => {
  const rows = mergeGearItems({
    bandItems: [{ label: 'Kick mic', category: 'mic', qty: 1, notes: null, source: 'band' }],
    personalItems: [{ label: 'In-ear pack', category: 'monitor', qty: 1, notes: null, source: 'member:Alice' }],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].source, 'band');
  assert.equal(rows[1].source, 'member:Alice');
});

