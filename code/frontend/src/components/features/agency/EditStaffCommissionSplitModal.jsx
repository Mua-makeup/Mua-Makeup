import React, { useState, useEffect } from 'react';
import { DollarSign, Percent, AlertCircle, Save } from 'lucide-react';
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

  const totalCommissions = items.reduce((acc, curr) => acc + (Number(curr.commissionAmount) || 0), 0);
  const studioNet = totalAmount - totalCommissions;

  const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (totalCommissions > totalAmount) {
      setError(t('commission_err_exceeds_total') || 'Tổng hoa hồng của các thợ không được vượt quá tổng giá trị đơn!');
      return;
    }

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
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('error_general'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span>{t('commission_split_modal_title')}</span>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {t('booking_label')}: #{booking.bookingCode || booking.id} — {booking.servicePackageName || booking.packageName}
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            {t('commission_split_modal_desc')}
          </p>
        </div>

        {/* Staff Rows */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {items.map((staff, idx) => (
            <div
              key={staff.staffId || idx}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={`${t('col_commission_rate')} (%)`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={staff.commissionRate}
                  onChange={(e) => handleRateChange(idx, e.target.value)}
                  placeholder="30"
                  icon={<Percent className="w-4 h-4 text-slate-400" />}
                />
                <Input
                  label={`${t('col_commission_amount')} (₫)`}
                  type="number"
                  min="0"
                  step="1000"
                  value={staff.commissionAmount}
                  onChange={(e) => handleAmountChange(idx, e.target.value)}
                  placeholder="300000"
                  icon={<DollarSign className="w-4 h-4 text-slate-400" />}
                />
              </div>

              <Input
                label={t('col_commission_reason')}
                type="text"
                value={staff.commissionNote}
                onChange={(e) => handleNoteChange(idx, e.target.value)}
                placeholder={t('col_commission_reason_placeholder')}
              />
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-slate-500 block mb-0.5">{t('col_total_amount')}</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">{t('total_staff_commission')}</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(totalCommissions)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">{t('col_studio_net')}</span>
              <span className={`font-bold ${studioNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {formatCurrency(studioNet)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            {t('btn_cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{t('btn_save_changes')}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
