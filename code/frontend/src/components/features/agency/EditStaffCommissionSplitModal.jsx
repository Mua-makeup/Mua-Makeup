import React, { useState, useEffect } from 'react';
import { DollarSign, Percent, AlertCircle, Save, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { Badge } from '../../base/Badge';
import { agencyService } from '../../../services/agency.service';
import { useI18nStore } from '../../../store/useI18nStore';

export const EditStaffCommissionSplitModal = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
}) => {
  const { t } = useI18nStore();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const totalAmount = Number(booking?.totalAmount || 0);

  useEffect(() => {
    if (booking?.assignedStaff) {
      const activeStaff = (booking.assignedStaff || []).filter(
        (s) => s.status !== 'REPLACED' && s.status !== 'EMERGENCY_CANCELLED'
      );

      const mapped = activeStaff.map((staff) => {
        const rate =
          staff.commissionRate !== undefined && staff.commissionRate !== null
            ? Number(staff.commissionRate)
            : staff.role === 'PRIMARY_MUA'
            ? Number(booking.staffCommissionRate || 30)
            : 10;

        const defaultAmount = Math.round((totalAmount * rate) / 100);
        const amount =
          staff.commissionAmount !== undefined && staff.commissionAmount !== null && Number(staff.commissionAmount) > 0
            ? Number(staff.commissionAmount)
            : defaultAmount;

        const defaultNote =
          staff.commissionNote ||
          (staff.role === 'PRIMARY_MUA'
            ? `${t('dispatch_badge_primary')}: ${rate}%`
            : `${t('dispatch_badge_assistant')}: ${rate}%`);

        return {
          staffId: staff.staffId,
          staffName: staff.staffName,
          staffPhone: staff.staffPhone,
          role: staff.role,
          commissionRate: rate,
          commissionAmount: amount,
          commissionNote: defaultNote,
        };
      });

      setItems(mapped);
      setError('');
      setIsConfirmOpen(false);
    }
  }, [booking, totalAmount, t]);

  if (!booking) return null;

  const handleRateChange = (index, newRate) => {
    const numericRate = Math.max(0, Math.min(100, Number(newRate) || 0));
    setItems((prev) => {
      const updated = [...prev];
      const newAmount = Math.round((totalAmount * numericRate) / 100);
      updated[index] = {
        ...updated[index],
        commissionRate: numericRate,
        commissionAmount: newAmount,
      };
      return updated;
    });
  };

  const handleAmountChange = (index, newAmount) => {
    const numericAmount = Math.max(0, Number(newAmount) || 0);
    setItems((prev) => {
      const updated = [...prev];
      const calculatedRate =
        totalAmount > 0 ? Number(((numericAmount / totalAmount) * 100).toFixed(1)) : 0;
      updated[index] = {
        ...updated[index],
        commissionAmount: numericAmount,
        commissionRate: calculatedRate,
      };
      return updated;
    });
  };

  const handleNoteChange = (index, newNote) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        commissionNote: newNote,
      };
      return updated;
    });
  };

  const platformFeeRate = Number(booking.platformFeeRate ?? 0.15);
  const platformFee = Math.round(totalAmount * platformFeeRate);
  const totalCommissions = items.reduce((acc, curr) => acc + (Number(curr.commissionAmount) || 0), 0);
  const studioNet = totalAmount - platformFee - totalCommissions;

  const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  const handleOpenConfirm = (e) => {
    e?.preventDefault();
    setError('');

    if (totalCommissions > totalAmount) {
      setError(t('commission_err_exceeds_total') || 'Tổng hoa hồng của các thợ không được vượt quá tổng giá trị đơn!');
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      const payload = {
        splits: items.map((it) => ({
          staffId: it.staffId,
          commissionRate: Number(it.commissionRate),
          commissionAmount: Number(it.commissionAmount),
          commissionNote: it.commissionNote?.trim(),
        })),
      };

      const res = await agencyService.updateStaffCommissions(booking.id || booking.bookingId, payload);
      onSuccess?.(res?.data || res);
      setIsConfirmOpen(false);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('error_general'));
      setIsConfirmOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Modal Chỉnh Sửa Hoa Hồng Chính */}
      <Modal
        isOpen={isOpen && !isConfirmOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>{t('commission_split_modal_title')}</span>
          </div>
        }
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleOpenConfirm} className="space-y-3">
          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Booking Summary Pill */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs flex flex-wrap items-center justify-between gap-1">
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              #{booking.bookingCode || booking.id} — {booking.servicePackageName || booking.packageName}
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              {t('col_total_amount')}: <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Staff Rows - Compact Layout 1 hàng 3 ô, không cuộn lồng */}
          <div className="space-y-2.5">
            {items.map((staff, idx) => (
              <div
                key={staff.staffId || idx}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {staff.staffName}
                    </span>
                    {staff.staffPhone && (
                      <span className="text-xs text-slate-500 font-mono">
                        ({staff.staffPhone})
                      </span>
                    )}
                  </div>
                  <Badge
                    variant={staff.role === 'PRIMARY_MUA' ? 'gold' : 'purple'}
                    size="sm"
                  >
                    {staff.role === 'PRIMARY_MUA'
                      ? t('dispatch_badge_primary')
                      : t('dispatch_badge_assistant')}
                  </Badge>
                </div>

                <div className="grid grid-cols-12 gap-2.5 items-end">
                  <div className="col-span-12 sm:col-span-3">
                    <Input
                      label={`${t('col_commission_rate')} (%)`}
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={staff.commissionRate}
                      onChange={(e) => handleRateChange(idx, e.target.value)}
                      placeholder="30"
                      icon={Percent}
                      className="text-xs"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <Input
                      label={`${t('col_commission_amount')} (₫)`}
                      type="number"
                      min="0"
                      step="any"
                      value={staff.commissionAmount}
                      onChange={(e) => handleAmountChange(idx, e.target.value)}
                      placeholder="300000"
                      icon={DollarSign}
                      className="text-xs"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-5">
                    <Input
                      label={t('col_commission_reason')}
                      type="text"
                      value={staff.commissionNote}
                      onChange={(e) => handleNoteChange(idx, e.target.value)}
                      placeholder={t('col_commission_reason_placeholder')}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Financial Summary */}
          <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">{t('col_total_amount')}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">Phí Sàn (20%)</span>
                <span className="font-bold text-slate-500">
                  -{formatCurrency(platformFee)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">{t('total_staff_commission')}</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  -{formatCurrency(totalCommissions)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">{t('col_studio_net')}</span>
                <span className={`font-bold ${studioNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                  {formatCurrency(studioNet)}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions - Nút Hủy 1/3, Nút Lưu 2/3 */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="col-span-1 w-full justify-center"
            >
              {t('btn_cancel') || t('cancel') || 'Hủy Bỏ'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="col-span-2 w-full justify-center flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{t('btn_save_changes') || t('save') || 'Lưu Thay Đổi'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Xác Nhận Lưu Thay Đổi */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t('confirm_commission_title') || 'Xác Nhận Điều Chỉnh Hoa Hồng'}</span>
          </div>
        }
        maxWidth="max-w-md"
      >
        <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
          <p className="text-slate-600 dark:text-slate-400">
            {t('confirm_commission_msg') || 'Bạn có chắc chắn muốn lưu mức phân chia hoa hồng này cho ca làm? Mức hoa hồng sẽ được áp dụng khi hoàn thành đơn.'}
          </p>

          {/* Breakdown box */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-1.5">
              Tóm tắt phân chia ({items.length} thợ):
            </div>
            {items.map((st, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  {st.staffName} ({st.role === 'PRIMARY_MUA' ? 'Thợ chính' : 'Thợ phụ'}):
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {st.commissionRate}% — {formatCurrency(st.commissionAmount)}
                </span>
              </div>
            ))}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex justify-between items-center font-bold">
              <span>Tổng hoa hồng thợ:</span>
              <span className="text-amber-600 dark:text-amber-400">{formatCurrency(totalCommissions)}</span>
            </div>
            <div className="flex justify-between items-center font-bold">
              <span>Studio giữ lại:</span>
              <span className={studioNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
                {formatCurrency(studioNet)}
              </span>
            </div>
          </div>

          {/* Actions: Hủy 1/3, Lưu 2/3 */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isLoading}
              className="col-span-1 w-full justify-center"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>{t('btn_cancel') || t('cancel') || 'Quay Lại'}</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmSubmit}
              isLoading={isLoading}
              className="col-span-2 w-full justify-center flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('btn_confirm') || t('confirm') || 'Xác Nhận Lưu'}</span>
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
