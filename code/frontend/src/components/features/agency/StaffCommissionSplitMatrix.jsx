import React, { useState } from 'react';
import { DollarSign, User, SlidersHorizontal, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '../../base/Badge';
import { Button } from '../../base/Button';
import { useI18nStore } from '../../../store/useI18nStore';
import { formatDateTime } from '../../../utils/formatters';
import { EditStaffCommissionSplitModal } from './EditStaffCommissionSplitModal';

export const StaffCommissionSplitMatrix = ({
  booking,
  onBookingUpdated,
}) => {
  const { t } = useI18nStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!booking) return null;

  const totalAmount = Number(booking.totalAmount || 0);

  // Filter active assigned staff
  const staffList = (booking.assignedStaff || []).filter(
    (s) => s.status !== 'REPLACED'
  );

  const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  // Compute total staff commission
  const totalStaffCommission = staffList
    .filter((s) => s.status === 'ACTIVE' || !s.status)
    .reduce((sum, s) => {
      if (s.commissionAmount !== undefined && s.commissionAmount !== null && Number(s.commissionAmount) > 0) {
        return sum + Number(s.commissionAmount);
      }
      const rate = s.commissionRate ?? (s.role === 'PRIMARY_MUA' ? (booking.staffCommissionRate || 30) : 10);
      return sum + Math.round((totalAmount * rate) / 100);
    }, 0);

  const estimatedStudioNet = totalAmount - totalStaffCommission;

  const currentStatus = booking.bookingStatus || booking.status;
  const canEdit = !['CANCELLED', 'CANCELLED_EXPIRED', 'REFUNDED'].includes(currentStatus);

  return (
    <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
          <DollarSign className="w-4 h-4 text-amber-600" />
          <span>{t('commission_split_matrix_title') || 'Phân Bổ Hoa Hồng Thợ Chính & Thợ Phụ'}</span>
        </div>
        {canEdit && staffList.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs h-7 px-2.5 flex items-center gap-1.5 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-900/40"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t('btn_edit_commissions') || 'Điều chỉnh hoa hồng'}</span>
          </Button>
        )}
      </div>

      {/* Staff Breakdown Table */}
      {staffList.length === 0 ? (
        <div className="text-xs text-slate-500 dark:text-slate-400 italic py-2 text-center">
          {t('unassigned_staff_commission_note') || 'Chưa có thợ nào được phân công cho đơn hàng này.'}
        </div>
      ) : (
        <div className="space-y-2">
          {staffList.map((staff, idx) => {
            const isEmergencyCancelled = staff.status === 'EMERGENCY_CANCELLED';
            const rate =
              staff.commissionRate !== undefined && staff.commissionRate !== null
                ? Number(staff.commissionRate)
                : staff.role === 'PRIMARY_MUA'
                ? Number(booking.staffCommissionRate || 30)
                : 10;

            const amount =
              staff.commissionAmount !== undefined && staff.commissionAmount !== null && Number(staff.commissionAmount) > 0
                ? Number(staff.commissionAmount)
                : Math.round((totalAmount * rate) / 100);

            const isSettled = staff.payoutStatus === 'SETTLED' || currentStatus === 'PAID_OUT';

            const defaultReason =
              staff.role === 'PRIMARY_MUA'
                ? `${t('reason_primary_contract') || 'Hợp đồng thợ chính'}`
                : `${t('reason_assistant_support') || 'Hỗ trợ dịch vụ & làm tóc'}`;

            const reason = staff.commissionNote || defaultReason;

            return (
              <div
                key={staff.id || staff.staffId || idx}
                className={`p-3 rounded-xl border text-xs transition-colors ${
                  isEmergencyCancelled
                    ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40 opacity-75'
                    : 'bg-white/80 dark:bg-slate-900/80 border-slate-200/70 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Left: Staff info & role */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        staff.role === 'PRIMARY_MUA'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {staff.staffName}
                        </span>
                        {staff.staffPhone && (
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({staff.staffPhone})
                          </span>
                        )}
                        <Badge
                          variant={staff.role === 'PRIMARY_MUA' ? 'gold' : 'purple'}
                          size="sm"
                        >
                          {staff.role === 'PRIMARY_MUA'
                            ? t('dispatch_badge_primary')
                            : t('dispatch_badge_assistant')}
                        </Badge>
                        {isEmergencyCancelled && (
                          <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-100/60 dark:bg-red-950/60 px-1.5 py-0.5 rounded">
                            {t('dispatch_emergency_reported_badge') || 'Báo bận'}
                          </span>
                        )}
                      </div>
                      {/* Reason / Basis */}
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-500 dark:text-slate-400 mr-1">
                          {t('col_commission_reason') || 'Căn cứ'}:
                        </span>
                        <span className="italic">{reason}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Commission & Payout Status */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-center shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-slate-500">
                        ({rate}%)
                      </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                        {isEmergencyCancelled ? '0 ₫' : formatCurrency(amount)}
                      </span>
                    </div>

                    <div className="mt-0.5">
                      {isEmergencyCancelled ? (
                        <span className="text-[10px] text-slate-400 italic">
                          {t('payout_cancelled') || 'Đã hủy ca'}
                        </span>
                      ) : isSettled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('payout_status_settled') || 'Đã giải ngân ví'}</span>
                          {staff.payoutAt && (
                            <span className="font-mono text-[9px] text-emerald-500">
                              ({formatDateTime(staff.payoutAt)})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{t('payout_status_pending') || 'Chờ hoàn tất ca'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
        <div>
          <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
            {t('col_total_amount')}
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(totalAmount)}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
            <span>{t('total_staff_commission') || 'Tổng hoa hồng nhân sự'}</span>
          </div>
          <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
            {formatCurrency(totalStaffCommission)}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
            {t('col_studio_net')}
          </div>
          <div
            className={`text-base font-bold mt-0.5 ${
              estimatedStudioNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
            }`}
          >
            {formatCurrency(estimatedStudioNet)}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditStaffCommissionSplitModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          booking={booking}
          onSuccess={(updated) => {
            onBookingUpdated?.(updated);
          }}
        />
      )}
    </div>
  );
};
