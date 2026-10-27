import React from 'react';

const labels = {
  BEFORE_COMPLETION: 'Chưa hoàn thành dịch vụ',
  COMPLETED_UNPAID: 'Đã hoàn thành — chưa thanh toán đủ',
  PAID_UNSETTLED: 'Đã thanh toán đủ — chưa quyết toán',
  SETTLED: 'Đã quyết toán',
};

export const DisputeFinancialSummary = ({ financials }) => {
  if (!financials) return null;
  const amount = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-slate-800 dark:border-blue-900 dark:bg-slate-900 dark:text-slate-200">
      <p className="font-semibold">{labels[financials.stage] || 'Cần kiểm tra thanh toán'}</p>
      <p>Cọc đã trả: {amount(financials.paidDeposit)} · Tổng thực trả: {amount(financials.paidAmount)}</p>
      <p>Tiền mặt đã được hai bên xác nhận: {amount(financials.cashAmount)}</p>
      <p className="mt-1 text-xs">Hoàn tiền theo số thực trả. Chỉ thu hồi khoản đã chi hoặc tiền mặt đã xác nhận; nếu ví nhận tiền không đủ số dư, phán quyết chưa được thực hiện.</p>
    </div>
  );
};
