const test = require('node:test');
const assert = require('node:assert/strict');
const { getLifecyclePhase, canEditByLifecyclePhase } = require('../dist/services/lifecycleService.js');

test('lifecycle: future tentative is draft', () => {
  const phase = getLifecyclePhase({ event_date: '2099-01-02', status: 'tentative' });
  assert.equal(phase, 'draft');
});

test('lifecycle: future confirmed is confirmed', () => {
  const phase = getLifecyclePhase({ event_date: '2099-01-02', status: 'confirmed' });
  assert.equal(phase, 'confirmed');
});

test('lifecycle: done is settled regardless of date', () => {
  const phase = getLifecyclePhase({ event_date: '2099-01-02', status: 'done' });
  assert.equal(phase, 'settled');
});

test('lifecycle locks: locked phase allows expense/member_paid only', () => {
  assert.equal(canEditByLifecyclePhase('locked', 'expense'), true);
  assert.equal(canEditByLifecyclePhase('locked', 'member_paid'), true);
  assert.equal(canEditByLifecyclePhase('locked', 'incoming'), false);
  assert.equal(canEditByLifecyclePhase('locked', 'member_allocation'), false);
});
