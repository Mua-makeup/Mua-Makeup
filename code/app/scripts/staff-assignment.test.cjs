const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/staff-assignment.ts'), 'utf8');
const api = {};
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(api);

test('assistant identity and income stay separate from primary staff with a colliding staff ID', () => {
  const primary = { staffId: 7, userId: 90, role: 'PRIMARY_MUA', status: 'ACTIVE', commissionRate: 30 };
  const assistant = { staffId: 8, userId: 7, role: 'ASSISTANT_MUA', status: 'ACTIVE', commissionRate: 20 };
  const mine = api.findMyAssignment([primary, assistant], { id: 7 });
  assert.equal(mine, assistant);
  assert.equal(api.getAssignmentEarnings(mine, 50000), 10000);
  assert.equal(api.getAssignmentEarnings(primary, 50000), 15000);
});

test('assignment payout respects custom amounts, fallback rates and inactive assignments', () => {
  assert.equal(api.getAssignmentEarnings({ status: 'ACTIVE', commissionAmount: 12000, commissionRate: 20 }, 50000), 12000);
  assert.equal(api.getAssignmentEarnings({ status: 'ACTIVE', commissionAmount: 0, commissionRate: 20 }, 50000), 10000);
  assert.equal(api.getAssignmentEarnings({ status: 'ACTIVE', commissionRate: 0 }, 50000), 0);
  assert.equal(api.getAssignmentEarnings({ status: 'REPLACED', commissionAmount: 10000 }, 50000), 0);
  assert.equal(api.getAssignmentEarnings(null, 50000), null);
  assert.equal(api.getAssignmentEarnings({ status: 'ACTIVE' }, 50000), null);
});
test('staff IDs must never match user or MUA IDs from another identity namespace', () => {
  assert.equal(api.findMyAssignment([{ staffId: 7, userId: 90, muaId: 80, status: 'ACTIVE' }], { id: 7, muaId: 7 }), null);
});
test('two successive busy replacements never regain confirmation actions', () => {
  const first = { userId: 1, status: 'REPLACED', isConfirmedByStaff: false };
  const second = { userId: 2, status: 'EMERGENCY_CANCELLED', isConfirmedByStaff: false };
  const third = { userId: 3, status: 'ACTIVE', isConfirmedByStaff: false };
  for (const row of [first, second, third]) {
    assert.equal(api.canConfirmAssignment(api.findMyAssignment([first, second, third], { id: row.userId })), row === third);
  }
});
test('current assignment wins over historical roles and confirmed staff do not reconfirm', () => {
  const active = { userId: 1, status: 'ACTIVE', isConfirmedByStaff: true, confirmedAt: '2026-10-29' };
  assert.equal(api.findMyAssignment([{ userId: 1, status: 'REPLACED' }, active], { id: 1 }), active);
  assert.equal(api.canConfirmAssignment(active), false);
  assert.equal(api.canConfirmAssignment(null), false);
});
