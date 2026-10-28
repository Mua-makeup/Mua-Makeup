import React, { useState } from 'react';
import { superAdminService } from '../../../services/super-admin.service';

export const StudioFeeCorrectionPanel = ({ bookingId }) => {
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const money = value => Number(value).toLocaleString('vi-VN') + ' đ';
  const run = async (apply = false) => {
    setBusy(true); setError('');
    try {
      const result = apply
        ? await superAdminService.correctStudioFee(bookingId, plan.oldFee)
        : await superAdminService.previewStudioFee(bookingId);
      setPlan(result?.data || result);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Không thể đối soát phí Studio.');
    } finally { setBusy(false); }
  };
  return <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3 text-sm">
    <p className="font-semibold">Đối soát phí Studio 20%</p>
    <button type="button" disabled={busy} onClick={() => run()} className="underline disabled:opacity-50">Kiểm tra phí đã ghi sổ</button>
    {plan && <>
      <p>Phí đã ghi: {money(plan.oldFee)} · Phí đúng: {money(plan.correctFee)}</p>
      {plan.applicable ? <>
        <p>Thu hồi {money(plan.recoveryAmount)} từ ví chủ Studio bằng bút toán điều chỉnh. Không trừ hoa hồng thợ.</p>
        <button type="button" disabled={busy} onClick={() => run(true)} className="rounded-lg bg-amber-700 px-3 py-2 text-white disabled:opacity-50">Xác nhận điều chỉnh {money(plan.recoveryAmount)}</button>
      </> : <p>Không có khoản điều chỉnh tự động cần áp dụng cho trạng thái hiện tại.</p>}
    </>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
};
