const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function loadStore() {
  const source = fs.readFileSync(path.join(__dirname, '../src/store/workstation.store.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, console, require(name) {
    if (name === 'zustand') return { create: (init) => {
      let state;
      state = init((patch) => { state = { ...state, ...patch }; }, () => state);
      return { getState: () => state };
    }};
    if (name === 'expo-haptics') return { notificationAsync() {}, NotificationFeedbackType: { Success: 'success' } };
    if (name === '@/utils/sound') return { soundManager: { playJobAlertSound() {} } };
    return {};
  }});
  return exports.useWorkstationStore;
}

test('deposit and settlement each display once; stale deposits cannot replace settlement', () => {
  const store = loadStore();
  const notice = { bookingId: 19, bookingCode: 'BK-19', depositAmount: 30, earningsAmount: 80 };
  store.getState().showDepositNotice({ ...notice, type: 'CUSTOMER_CONFIRMED_DEPOSIT' });
  assert.equal(store.getState().isDepositModalVisible, true);
  store.getState().dismissDepositNotice();
  store.getState().showDepositNotice({ ...notice, type: 'CUSTOMER_CONFIRMED_DEPOSIT' });
  assert.equal(store.getState().isDepositModalVisible, false);
  store.getState().showDepositNotice({ ...notice, type: 'PAYMENT_COMPLETED', status: 'PAID_OUT' });
  store.getState().showDepositNotice({ ...notice, type: 'CUSTOMER_CONFIRMED_DEPOSIT' });
  assert.equal(store.getState().depositNotice.type, 'PAYMENT_COMPLETED');
  store.getState().dismissDepositNotice();
  store.getState().showDepositNotice({ ...notice, status: 'PAID_OUT' });
  assert.equal(store.getState().isDepositModalVisible, false);
  store.getState().showDepositNotice({ ...notice, bookingId: 20, type: 'CUSTOMER_CONFIRMED_DEPOSIT' });
  assert.equal(store.getState().isDepositModalVisible, true);
});

test('settlement arriving first suppresses a delayed deposit', () => {
  const store = loadStore();
  const notice = { bookingId: 19, bookingCode: 'BK-19', depositAmount: 30, earningsAmount: 80 };
  store.getState().showDepositNotice({ ...notice, status: 'PAID_OUT' });
  store.getState().dismissDepositNotice();
  store.getState().showDepositNotice({ ...notice, type: 'CUSTOMER_CONFIRMED_DEPOSIT' });
  assert.equal(store.getState().isDepositModalVisible, false);
});
