const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/booking-payment.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const moduleExports = {};
new Function('exports', compiled.outputText)(moduleExports);
const present = (overrides) => moduleExports.getBookingPaymentPresentation({
  isPaidOut: false, isCompleted: false, isCancelled: false, isDisputed: false,
  isDisputeRefunded: false, isDisputeCompensated: false, isDepositRefunded: false,
  isDepositPaid: true, isSplit5050: false, remainingAmount: 140000, ...overrides,
});

test('resolved 50/50 complaint never returns pending payment or original 70% amount', () => {
  const result = present({ isDisputeRefunded: true, isSplit5050: true });
  assert.equal(result.badge, 'Đã Giải Quyết Khiếu Nại');
  assert.equal(result.remainingLabel, 'Miễn Thu');
  assert.equal(result.remainingAmount, 0);
  assert.equal(result.depositLabel, 'Hòa Giải 50/50');
});
test('refund and compensation outcomes take priority over legacy paid-out state', () => {
  for (const outcome of ['isDisputeRefunded', 'isDisputeCompensated']) {
    const result = present({ [outcome]: true, isPaidOut: true });
    assert.equal(result.remainingAmount, 0);
    assert.equal(result.paid, false);
    assert.equal(result.badge, 'Đã Giải Quyết Khiếu Nại');
  }
});
test('cancellation closes collection and distinguishes refunded and unpaid deposits', () => {
  assert.equal(present({ isCancelled: true }).remainingAmount, 0);
  assert.equal(present({ isCancelled: true, isDepositPaid: false }).depositLabel, 'Miễn Cọc');
  assert.equal(present({ isCancelled: true, isDepositRefunded: true }).depositLabel, 'Đã Hoàn Cọc 100%');
});
test('open complaint does not assert either payment or a final waiver', () => {
  const result = present({ isDisputed: true });
  assert.equal(result.remainingLabel, 'Tạm Dừng Quyết Toán');
  assert.equal(result.paid, false);
  assert.equal(result.waived, false);
});
test('ordinary bookings preserve deposit, collection, and settlement states', () => {
  assert.equal(present({ isDepositPaid: false }).badge, 'Chờ Đặt Cọc');
  assert.equal(present({ isCompleted: true }).remainingAmount, 140000);
  assert.equal(present({ isCompleted: true }).badge, 'Chờ Thu 70%');
  assert.equal(present({ isPaidOut: true }).remainingLabel, 'Đã Quyết Toán');
  assert.equal(present({ isPaidOut: true }).depositLabel, 'Đã Giải Ngân');
});
test('confirmed cash remains paid when the booking enters a dispute', () => {
  const result = present({ isDisputed: true, isCashReceived: true });
  assert.equal(result.paid, true);
  assert.equal(result.remainingLabel, 'Đã Thanh Toán Tiền Mặt');
  assert.equal(result.badge, 'Đang Giải Quyết Khiếu Nại');
  assert.match(result.remainingDescription, /không thu lại/);
});
test('refund takes precedence over a previously confirmed cash receipt', () => {
  const result = present({ isDisputeRefunded: true, isCashReceived: true });
  assert.equal(result.paid, false);
  assert.equal(result.remainingAmount, 0);
});
test('settled online payment survives transition to a dispute', () => {
  const result = present({ isDisputed: true, isPaymentSettled: true });
  assert.equal(result.remainingLabel, 'Đã Quyết Toán');
  assert.equal(result.paid, true);
  assert.equal(result.depositLabel, 'Đã Giải Ngân · Đang Khiếu Nại');
});
