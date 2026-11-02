import React from 'react';
import { useI18nStore } from '../../store/useI18nStore';

export const DisputeFinancialSummary = ({ financials }) => {
  const { t } = useI18nStore();
  if (!financials) return null;

  const labels = {
    BEFORE_COMPLETION: t('stage_before_completion') || 'Chưa hoàn thành dịch vụ',
    COMPLETED_UNPAID: t('stage_completed_unpaid') || 'Đã hoàn thành — chưa thanh toán đủ',
    PAID_UNSETTLED: t('stage_paid_unsettled') || 'Đã thanh toán đủ — chưa quyết toán',
    SETTLED: t('stage_settled') || 'Đã quyết toán',
  };

  const amount = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-slate-800 dark:border-blue-900 dark:bg-slate-900 dark:text-slate-200">
      <p className="font-semibold">{labels[financials.stage] || t('stage_check_payment') || 'Cần kiểm tra thanh toán'}</p>
      <p>{t('deposit_paid') || 'Cọc đã trả'}: {amount(financials.paidDeposit)} · {t('total_actually_paid') || 'Tổng thực trả'}: {amount(financials.paidAmount)}</p>
      <p>{t('cash_confirmed_by_both') || 'Tiền mặt đã được hai bên xác nhận'}: {amount(financials.cashAmount)}</p>
      <p className="mt-1 text-xs">{t('dispute_financial_rule_note') || 'Hoàn tiền theo số thực trả. Chỉ thu hồi khoản đã chi hoặc tiền mặt đã xác nhận; nếu ví nhận tiền không đủ số dư, phán quyết chưa được thực hiện.'}</p>
    </div>
  );
};
