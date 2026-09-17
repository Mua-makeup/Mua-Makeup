import React, { useState, useEffect } from 'react';
import { Percent } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { Input } from '../../base/Input';
import { agencyService } from '../../../services/agency.service';
import { updateStaffCommissionSchema } from '../../../schemas/agency.schema';
import { useI18nStore } from '../../../store/useI18nStore';

export const StaffCommissionModal = ({ isOpen, onClose, staff, onSuccess }) => {
  const { t } = useI18nStore();
  const [rate, setRate] = useState(30);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (staff) {
      setRate(staff.agreedCommissionRate ?? staff.commissionRateCustom ?? 30);
      setError('');
    }
  }, [staff]);

  if (!staff) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numericRate = Number(rate);
    const validation = updateStaffCommissionSchema.safeParse({
      agreedCommissionRate: numericRate,
      commissionRateCustom: numericRate,
      commissionRate: numericRate,
    });

    if (!validation.success) {
      setError(validation.error.errors[0]?.message || t('validation_failed'));
      return;
    }

    setIsLoading(true);
    try {
      await agencyService.updateStaffCommission(staff.staffId || staff.id, {
        agreedCommissionRate: numericRate,
        commissionRateCustom: numericRate,
        commissionRate: numericRate,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t('error_general')
      );
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
          <Percent className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <span>{t('staff_commission_title')}</span>
        </div>
      }
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-lg">
            {error}
          </div>
        )}

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            {t('staff_label')} {staff.fullName || staff.muaName || `#${staff.staffId || staff.id}`}
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            {t('staff_commission_desc')}
          </p>
        </div>

        <Input
          label={t('staff_commission_rate_field')}
          type="number"
          min="0"
          max="60"
          step="0.5"
          required
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          helperText="0% - 60%"
        />

        <div className="pt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
