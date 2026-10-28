const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/booking-time.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const api = {};
new Function('exports', compiled.outputText)(api);
const format = api.formatBookingExecutionTime;

test('UTC and offset timestamps display the same actual Vietnam time in every device zone', () => {
  const old = process.env.TZ;
  try {
    for (const tz of ['UTC', 'Asia/Ho_Chi_Minh', 'America/New_York']) {
      process.env.TZ = tz;
      assert.equal(format({ status: 'PAID_OUT', startTime: '20:20',
        startedAt: '2026-10-26T13:21:00Z', completedAt: '2026-10-26T13:22:00Z' }).timeRange, '20:21 - 20:22');
      assert.equal(format({ startedAt: '2026-10-26T20:21:00+07:00',
        completedAt: '2026-10-26T20:22:00+07:00' }).timeRange, '20:21 - 20:22');
    }
  } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; }
});
test('actual execution overrides schedule for instant, freelance and studio appointments', () => {
  for (const bookingType of ['INSTANT', 'SCHEDULED']) {
    for (const bookingPartner of ['FREELANCER', 'AGENCY_DISPATCH']) {
      assert.equal(format({ bookingType, bookingPartner, bookingDate: '2026-10-26', startTime: '09:00',
        startedAt: '2026-10-26T09:15:00+07:00', completedAt: '2026-10-26T10:20:00+07:00',
      }).timeRange, '09:15 - 10:20');
    }
  }
});
test('cross-midnight execution includes dates and remains visible during disputes', () => {
  const result = format({ status: 'DISPUTE_REFUNDED', startedAt: '2026-10-26T16:50:00Z', completedAt: '2026-10-26T17:10:00Z' });
  assert.equal(result.timeRange, '23:50 26/10/2026 - 00:10 27/10/2026');
});
test('completed records never fabricate actual times from the appointment', () => {
  assert.equal(format({ status: 'COMPLETED', startTime: '20:20', bookingDate: '2026-10-26' }).timeRange, '--:-- - --:--');
  assert.equal(format({ status: 'PAID_OUT', completedAt: '2026-10-26T13:22:00Z' }).timeRange, '--:-- - 20:22');
});
test('future appointment is explicitly estimated and supports midnight rollover', () => {
  const result = format({ status: 'ACCEPTED', bookingDate: '2026-10-26', startTime: '23:30:00', estimatedDurationMinutes: 60 });
  assert.equal(result.timeRange, '23:30 - 00:30 27/10/2026');
  assert.equal(result.title, 'Thời Gian Dự Kiến');
});
test('ongoing and invalid completion timestamps are not reported as finished', () => {
  const result = format({ startedAt: '2026-10-26T20:20:00+07:00', completedAt: 'invalid' });
  assert.equal(result.timeRange, '20:20 - --:--');
  assert.equal(result.isCompleted, false);
});
